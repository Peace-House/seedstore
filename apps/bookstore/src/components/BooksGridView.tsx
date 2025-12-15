import { Book } from '@/services';
import BookCard from './BookCard';
import React from 'react';

interface BooksGridViewProps {
  books: Book[];
}

const BooksGridView: React.FC<BooksGridViewProps> = ({ books }) => (
  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5 md:gap-4 p-1 md:p-4 min-h-[90%] w-full">
    {books.map((book) => (
      <BookCard key={book.id} book={book} />
    ))}
  </div>
);

export default BooksGridView;
