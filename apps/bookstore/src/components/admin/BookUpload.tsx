import { useState } from 'react';
import BookPreviewCard from './BookPreviewCard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBook } from '@/services/book';
import { getCategories } from '@/services/category';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().min(1, 'Author is required').max(100),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  isbn: z.string().max(20).optional(),
  publishedDate: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

type BookFormData = z.infer<typeof bookSchema>;


interface BookUploadProps {
  initialValues?: Partial<BookFormData> & { coverImage?: string };
  onSubmitOverride?: (data: BookFormData, coverFile: File | null, bookFile: File | null) => Promise<void>;
  submitLabel?: string;
  isUpdate?: boolean;

}

const BookUpload = ({ initialValues, onSubmitOverride, submitLabel, isUpdate = false }: BookUploadProps) => {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: initialValues || { isFeatured: false },
  });

  // Fetch categories from backend
  const { data: categories, isLoading: loadingCategories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const onSubmit = async (data: BookFormData) => {
    if (onSubmitOverride) {
      setUploading(true);
      try {
        await onSubmitOverride(data, coverFile, bookFile);
        form.reset();
        setCoverFile(null);
        setBookFile(null);
      } finally {
        setUploading(false);
      }
      return;
    }
    if (!coverFile || !bookFile) {
      toast({
        variant: 'destructive',
        title: 'Missing files',
        description: 'Please select both cover image and book file',
      });
      return;
    }
    setUploading(true);
    try {
      // Frontend validation
      // Prepare FormData for backend upload
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('author', data.author);
      formData.append('description', data.description || '');
      // Use categoryId as required by backend
      if (data.category) formData.append('categoryId', data.category);
      if (data.isbn) formData.append('ISBN', data.isbn);
      if (data.publishedDate) formData.append('publishedDate', data.publishedDate);
      // Optional: genre (if you want to add a field for it)
      formData.append('genre', 'N/A');
      formData.append('featured', data.isFeatured ? 'true' : 'false');
      // File uploads: backend expects 'coverImage' and 'file'
      formData.append('coverImage', coverFile as Blob);
      formData.append('file', bookFile as Blob);
      await createBook(formData);
      toast({
        title: 'Book uploaded',
        description: 'The book has been successfully added to the store',
      });
      form.reset();
      setCoverFile(null);
      setBookFile(null);
      queryClient.invalidateQueries({ queryKey: ['all-books'] });
      queryClient.invalidateQueries({ queryKey: ['featured-books'] });
    } catch (error: unknown) {
      let message = 'An error occurred';
      if (error && typeof error === 'object' && 'message' in error) {
        message = String((error as { message?: string }).message);
      }
      console.error('Book upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: message,
      });
    } finally {
      setUploading(false);
    }
  };

  // Gather preview data from form state
  const previewData = {
    title: form.watch('title'),
    author: form.watch('author'),
    coverFile,
    coverImage: initialValues?.coverImage,
    category: categories?.find((cat) => cat.id === form.watch('category'))?.name,
    description: form.watch('description'),
  };

  return (


    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <Card className={`flex-1 w-full lg:w-2/3 rounded ${isUpdate ? 'border-none bg-transparent' : ''}`}>
        {!isUpdate && <CardHeader>
          <CardTitle>Upload New Book</CardTitle>
          <CardDescription>Add a new book to the store</CardDescription>
        </CardHeader>}
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price field removed */}

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={field.onChange}
                          className="block w-full border rounded px-3 py-2 bg-background"
                          disabled={loadingCategories}
                        >
                          <option value="">Select category</option>
                          {categories?.map((cat: { id: string; name: string }) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISBN</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pages field removed */}

                <FormField
                  control={form.control}
                  name="publishedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Published Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div>
                  <FormLabel>Cover Image *</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <FormLabel>Book File (PDF/EPUB/HTML/DOCX) *</FormLabel>
                  <Input
                    type="file"
                    accept=".pdf,.epub, .html, .docx, .doc, .htm"
                    onChange={(e) =>{
                      const selectedFile = e.target.files[0];
                      if (selectedFile) {
                        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html', 'application/epub+zip'];
                        if (!validTypes.includes(selectedFile.type)) {
                          toast({
                            variant: 'destructive',
                            title: 'Upload failed',
                            description: 'Invalid file type. Please upload PDF, DOCX, HTML, or EPUB',
                          });
                          return;
                        }
                        setBookFile(selectedFile || null)
                      }
                    }}
                    className="mt-2"
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Featured Book</FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    uploading ||
                    !form.watch('title') ||
                    !form.watch('author') ||
                    (!isUpdate && !coverFile) ||
                    (!isUpdate && !bookFile)
                  }
                  className="w-max "
                >
                  {uploading ? (submitLabel ? `Saving...` : 'Uploading...') : (submitLabel || 'Upload Book')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {/* On desktop, show preview to the right if not using renderPreview */}
      {!isUpdate && <div className="hidden lg:block min-w-[220px] max-w-[260px]">
        <BookPreviewCard
          {...previewData}
        />
      </div>}
    </div>
  );
};

export default BookUpload;
