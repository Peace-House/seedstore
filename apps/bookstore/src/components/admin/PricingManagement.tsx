import { useEffect, useState } from 'react';
import { updateBooksPrices } from '@/services/book';
import { getAllBookTitles } from '@/services/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminTable from './AdminTable';

const PricingManagement = () => {
  interface BookPrice {
    id?: number;
    currency: string;
    soft_copy_price: number;
    hard_copy_price: number;
    country: string | null;
  }
  interface Book {
    id: string;
    title: string;
    prices?: BookPrice[];
  }
  interface CountryCurrency {
    country: string;
    currency: string;
  }
  const [books, setBooks] = useState<Book[]>([]);
  const [countryCurrencies, setCountryCurrencies] = useState<CountryCurrency[]>([]);
  const [prices, setPrices] = useState<Record<string, Record<string, string>>>({}); // { bookId: { countryId: price } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    getAllBookTitles(page, pageSize).then(({ books, countryCurrencies, total }) => {
      setBooks(books);
      setCountryCurrencies(countryCurrencies);
      setTotal(total || books.length);
      
      // Prefill prices from existing book prices
      const initialPrices: Record<string, Record<string, string>> = {};
      books.forEach((book: Book) => {
        if (book.prices && book.prices.length > 0) {
          initialPrices[book.id] = {};
          book.prices.forEach((price: BookPrice) => {
            if (price.country && price.soft_copy_price != null && price.soft_copy_price !== 0) {
              initialPrices[book.id][price.country] = String(price.soft_copy_price);
            }
          });
        }
      });
      setPrices(initialPrices);
    }).finally(() => setLoading(false));
  }, [page, pageSize]);

  const handlePriceChange = (bookId: string, country: string, value: string) => {
    setPrices(prev => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        [country]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const booksPayload = books.map(book => ({
        bookId: book.id,
        prices: Object.entries(prices[book.id] || {}).map(([country, price]) => {
          // Find currency for this country from countryCurrencies
          const cc = countryCurrencies.find(c => c.country === country);
          return {
            currency: cc?.currency || 'NGN',
            country,
            soft_copy_price: Number(price),
            hard_copy_price: 0,
          };
        })
      }));
      await updateBooksPrices(booksPayload);
      alert('Prices updated successfully!');
    } catch (err) {
      alert('Failed to update prices.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  // Build columns for AdminTable
  const columns = [
    { label: 'Book', render: (book: Book) => book.title },
    ...countryCurrencies.map((c) => ({
      label: <span>{c.country} {c.currency ? <span className="text-xs text-gray-500">({c.currency})</span> : null}</span>,
      render: (book: Book) => (
        <Input
          type="number"
          value={prices[book.id]?.[c.country] || ''}
          onChange={e => handlePriceChange(book.id, c.country, e.target.value)}
          className="w-24"
        />
      )
    }))
  ];

  return (
    <div>
      <div className="rounded border bg-white">
        <AdminTable
          admins={books}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columns={columns}
          renderActions={undefined}
        />
      </div>
      <Button onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? 'Saving...' : 'Save Prices'}
      </Button>
    </div>
  );
};

export default PricingManagement;
