import { Book } from '@/services';
import BookCard from './BookCard';
import React from 'react';

interface BooksListViewProps {
  books: Book[];
}

const BooksListView: React.FC<BooksListViewProps> = ({ books }) => (
  <div className="w-full rounded-md min-h-[90%]">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:grid-cols-3 md:gap-4 h-max p-1 md:p-4 ">
      {books.map((book) => (
        <BookCard key={book.id} book={book} listView />
      ))}
    </div>
  </div>
);

export default BooksListView;
