import { useState } from 'react';

export interface BookSearchParams {
  title?: string;
  author?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
}

export function useBookSearchParams() {
  const [params, setParams] = useState<BookSearchParams>({});

  const setSearchParam = (key: keyof BookSearchParams, value: string | number | undefined) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const resetSearchParams = () => setParams({});

  return { params, setSearchParam, resetSearchParams };
}
