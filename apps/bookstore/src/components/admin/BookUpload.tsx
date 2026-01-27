import { useState } from 'react';
import BookPreviewCard from './BookPreviewCard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBook, getBookGroups, BookGroup } from '@/services/book';
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
import { X } from 'lucide-react';

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().min(1, 'Author is required').max(100),
  description: z.string().max(2000).optional(),
  categoryIds: z.array(z.string()).default([]), // Multiple categories
  groupId: z.string().optional(),
  isbn: z.string().max(20).optional(),
  publishedDate: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isNewRelease: z.boolean().default(false),
});

type BookFormData = z.infer<typeof bookSchema>;


interface BookUploadProps {
  initialValues?: Partial<BookFormData> & { coverImage?: string; category?: string };
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

  // Convert legacy single category to array for backward compatibility
  const defaultCategoryIds = initialValues?.categoryIds || 
    (initialValues?.category ? [initialValues.category] : []);

  const form = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: { 
      ...initialValues, 
      categoryIds: defaultCategoryIds,
      isFeatured: initialValues?.isFeatured ?? false, 
      isNewRelease: initialValues?.isNewRelease ?? false 
    },
  });

  // Fetch categories from backend
  const { data: categories, isLoading: loadingCategories } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  // Fetch book groups from backend
  const { data: bookGroups, isLoading: loadingGroups } = useQuery<BookGroup[]>({
    queryKey: ['book-groups'],
    queryFn: getBookGroups,
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
      // Send multiple category IDs as comma-separated string
      if (data.categoryIds && data.categoryIds.length > 0) {
        formData.append('categoryIds', data.categoryIds.join(','));
      }
      if (data.groupId) formData.append('groupId', data.groupId);
      if (data.isbn) formData.append('ISBN', data.isbn);
      if (data.publishedDate) formData.append('publishedDate', data.publishedDate);
      // Optional: genre (if you want to add a field for it)
      formData.append('genre', 'N/A');
      formData.append('featured', data.isFeatured ? 'true' : 'false');
      formData.append('isNewRelease', data.isNewRelease ? 'true' : 'false');
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
  const selectedCategoryIds = form.watch('categoryIds') || [];
  const previewData = {
    title: form.watch('title'),
    author: form.watch('author'),
    coverFile,
    coverImage: initialValues?.coverImage,
    category: categories
      ?.filter((cat) => selectedCategoryIds.includes(String(cat.id)))
      .map((cat) => cat.name)
      .join(', '),
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
                  name="categoryIds"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Categories</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {/* Selected categories display */}
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {field.value.map((catId: string) => {
                                const cat = categories?.find((c) => String(c.id) === catId);
                                return cat ? (
                                  <span
                                    key={catId}
                                    className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
                                  >
                                    {cat.name}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        field.onChange(field.value.filter((id: string) => id !== catId));
                                      }}
                                      className="hover:bg-primary/20 rounded-full p-0.5"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                          {/* Category select dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              if (selectedId && !field.value?.includes(selectedId)) {
                                field.onChange([...(field.value || []), selectedId]);
                              }
                            }}
                            className="block w-full border rounded px-3 py-2 bg-background"
                            disabled={loadingCategories}
                          >
                            <option value="">Add a category...</option>
                            {categories
                              ?.filter((cat) => !field.value?.includes(String(cat.id)))
                              .map((cat) => (
                                <option key={cat.id} value={String(cat.id)}>
                                  {cat.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Book Group *</FormLabel>
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={field.onChange}
                          className="block w-full border rounded px-3 py-2 bg-background"
                          disabled={loadingGroups}
                        >
                          <option value="">Select book group</option>
                          {bookGroups?.map((group) => (
                            <option key={group.id} value={String(group.id)}>
                              {group.name} ({group.shortcode})
                            </option>
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
                  <FormLabel>Book File (EPUB/HTML/DOCX) *</FormLabel>
                  <Input
                    type="file"
                    accept=".epub, .html, .docx, .doc, .htm"
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

              <FormField
                control={form.control}
                name="isNewRelease"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">New Release (notify users who opted in for new releases)</FormLabel>
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
