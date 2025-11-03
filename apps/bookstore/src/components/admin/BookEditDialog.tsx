import { useState } from 'react';
import { Book } from '@/services/book';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface BookEditDialogProps {
  book: Book;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Book>) => void;
}

const BookEditDialog = ({ book, open, onClose, onSave }: BookEditDialogProps) => {
  const [form, setForm] = useState<Partial<Book>>({ ...book });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Book</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <input name="title" value={form.title || ''} onChange={handleChange} className="input w-full" placeholder="Title" />
          <input name="author" value={form.author || ''} onChange={handleChange} className="input w-full" placeholder="Author" />
          <input name="price" type="number" value={form.price || ''} onChange={handleChange} className="input w-full" placeholder="Price" />
          <textarea name="description" value={form.description || ''} onChange={handleChange} className="input w-full" placeholder="Description" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </DialogClose>
          <Button onClick={() => onSave(form)} type="button">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookEditDialog;
