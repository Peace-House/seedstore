import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooks, deleteBook, updateBook, Book } from '@/services/book';
import { useState } from 'react';


import { Button } from '@/components/ui/button';
import { Trash2, Edit, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import BookUpload from './BookUpload';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { truncate } from '@/lib/utils';
import { PageLoader } from '../Loader';

const BookManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Book | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'delete' | null>(null);
  const [selectedBook, setSelectedBook] = useState<{ id: number; title: string } | null>(null);


  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Book> | FormData }) => {
      return await updateBook(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      toast({ title: 'Book updated', description: 'Book details updated.' });
      setEditing(null);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    },
  });
  const pageSize = 10;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-books', page],
    queryFn: async () => {
      const res = await getBooks(page, pageSize);
      return res;
    },
  });
  const books = data?.books || [];
  const total = data?.total || 0;

  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      await deleteBook(bookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['all-books'] });
      queryClient.invalidateQueries({ queryKey: ['featured-books'] });
      toast({
        title: 'Book deleted',
        description: 'The book has been removed from the store',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Cover</th>
            <th className="px-4 py-2 text-left font-semibold">Title</th>
            <th className="px-4 py-2 text-left font-semibold">Author</th>
            <th className="px-4 py-2 text-left font-semibold">Category</th>
            <th className="px-4 py-2 text-left font-semibold">Price</th>
            <th className="px-4 py-2 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book: Book) => (
            <tr key={book.id} className="border-b">
              <td className="px-4 py-2">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-12 h-16 object-cover rounded"
                />
              </td>
              <td className="px-4 py-2 font-semibold">{truncate(book.title, 18)}</td>
              <td className="px-4 py-2">{book.author}</td>
              <td className="px-4 py-2">{book.category?.name || '-'}</td>
              <td className="px-4 py-2 font-bold text-primary">₦{Number(book.price).toLocaleString()}</td>
              <td className="px-4 py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0"><MoreVertical className="h-5 w-5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(book)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setDialogOpen(true);
                        setDialogAction('delete');
                        setSelectedBook({ id: book.id as number, title: book.title });
                      }}
                      className="text-red-600 focus:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'delete' ? 'Delete Book' : 'Action'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'delete'
                ? `Are you sure you want to delete ${selectedBook?.title?.toUpperCase()}? This book will no longer be available to buyers.`
                : `What do you want to do`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-4'>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={dialogAction === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (dialogAction === 'delete' && selectedBook.id) {
                  deleteMutation.mutate(selectedBook.id as number)
                } else {
                  alert('No action to perform')
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {dialogAction === 'delete' ? (deleteMutation.isPending ? 'Deleting...' : 'Delete') : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 overflow-y-auto pt-16 md:pt-0">
          <div className="bg-white rounded shadow-lg py-4 w-full max-w-lg relative h-max">
            <button className="absolute top-2 right-2 text-xl" onClick={() => setEditing(null)}>&times;</button>
            <BookUpload
              isUpdate
              initialValues={{
                title: editing.title,
                author: editing.author,
                price: String(editing.price),
                description: editing.description,
                category: editing.category?.id ? String(editing.category.id) : '',
                isbn: editing.ISBN || editing.ISBN || '',
                pages: editing.pages ? String(editing.pages) : '',
                publishedDate: editing.publishedDate || '',
                isFeatured: !!editing.featured,
              }}
              submitLabel="Save Changes"
              onSubmitOverride={async (data, coverFile, bookFile) => {
                // Use FormData if files are present, else send JSON
                if (coverFile || bookFile) {
                  const formData = new FormData();
                  formData.append('title', data.title);
                  formData.append('author', data.author);
                  formData.append('description', data.description || '');
                  formData.append('price', data.price);
                  formData.append('categoryId', data.category || '4');
                  formData.append('genre', 'N/A');
                  formData.append('ISBN', data.isbn || '');
                  formData.append('pages', data.pages || '');
                  formData.append('publishedDate', data.publishedDate || '');
                  formData.append('featured', data.isFeatured ? 'true' : 'false');
                  if (coverFile) formData.append('coverImage', coverFile);
                  if (bookFile) formData.append('file', bookFile);
                  updateMutation.mutate({ id: editing.id as number, data: formData });
                } else {
                  // No files, send JSON
                  const updateData: any = { ...data };
                  updateMutation.mutate({ id: editing.id as number, data: updateData });
                }
              }}
            />
          </div>
        </div>
      )}
      {total > pageSize ? (
        <div className="flex justify-center mt-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="px-2 py-1 text-sm">Page {page} of {Math.ceil(total / pageSize)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default BookManagement;
