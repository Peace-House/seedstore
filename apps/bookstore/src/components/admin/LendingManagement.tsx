import { useEffect, useState } from 'react';
import { getLendingBooks, updateLendingSettings, getAllBorrows, revokeBorrow } from '@/services/lending';
import { Book } from '@/services/book';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import AdminTable from './AdminTable';
import { Card, CardContent } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '../Loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const LendingManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'settings' | 'borrows'>('settings');

  // Settings state
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Borrows state
  const [borrows, setBorrows] = useState<any[]>([]);
  const [borrowsLoading, setBorrowsLoading] = useState(false);
  const [borrowsPage, setBorrowsPage] = useState(1);
  const [borrowsPageSize, setBorrowsPageSize] = useState(10);
  const [borrowsTotal, setBorrowsTotal] = useState(0);
  const [borrowsStatus, setBorrowsStatus] = useState<string>('ACTIVE');

  const [modifiedSettings, setModifiedSettings] = useState<Record<string, Partial<Book>>>({});

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await getLendingBooks(page, pageSize);
      setBooks(data.books);
      setTotal(data.total);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch books for lending management',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBorrows = async () => {
    setBorrowsLoading(true);
    try {
      const data = await getAllBorrows(borrowsPage, borrowsPageSize, borrowsStatus);
      setBorrows(data.borrows);
      setBorrowsTotal(data.total);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch borrow records',
      });
    } finally {
      setBorrowsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchBooks();
    } else {
      fetchBorrows();
    }
  }, [activeTab, page, pageSize, borrowsPage, borrowsPageSize, borrowsStatus]);

  const handleSettingChange = (bookId: string | number, field: keyof Book, value: any) => {
    setModifiedSettings(prev => ({
      ...prev,
      [bookId]: {
        ...(prev[bookId] || {}),
        [field]: value,
      }
    }));

    // Update local books state for immediate UI feedback
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, [field]: value } : b));
  };

  const handleSave = async () => {
    const updates = Object.entries(modifiedSettings).map(([id, settings]) => ({
      id,
      ...settings,
    }));

    if (updates.length === 0) {
      toast({ title: 'No changes', description: 'You haven\'t modified any settings.' });
      return;
    }

    setSaving(true);
    try {
      await updateLendingSettings(updates as Partial<Book>[]);
      toast({ title: 'Success', description: 'Lending settings updated successfully' });
      setModifiedSettings({});
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Failed to update lending settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (borrowId: string) => {
    if (!confirm('Are you sure you want to revoke this borrow? The user will lose access to the book immediately.')) {
      return;
    }

    try {
      await revokeBorrow(borrowId);
      toast({ title: 'Success', description: 'Borrow revoked successfully' });
      fetchBorrows();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to revoke borrow',
      });
    }
  };

  const columns = [
    {
      label: 'Title',
      render: (book: Book) => (
        <div className="min-w-[200px]">
          <p className="font-semibold line-clamp-1">{book.title}</p>
          <p className="text-xs text-muted-foreground">{book.author || 'No Author'}</p>
        </div>
      ),
      sortKey: 'title',
    },
    {
      label: 'Lendable',
      render: (book: Book) => (
        <Switch
          checked={!!book.isLendable}
          onCheckedChange={(checked) => handleSettingChange(book.id, 'isLendable', checked)}
        />
      ),
      sortKey: 'isLendable',
    },
    {
      label: 'Duration (Days)',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.lendDurationDays || 7}
          onChange={(e) => handleSettingChange(book.id, 'lendDurationDays', parseInt(e.target.value))}
          className="w-20 h-8"
          disabled={!book.isLendable}
        />
      ),
    },
    {
      label: 'Concurrent',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.maxConcurrentBorrows || 5}
          onChange={(e) => handleSettingChange(book.id, 'maxConcurrentBorrows', parseInt(e.target.value))}
          className="w-16 h-8"
          disabled={!book.isLendable}
        />
      ),
    },
    {
      label: 'Quota (Limit)',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.quotaLimit || 3}
          onChange={(e) => handleSettingChange(book.id, 'quotaLimit', parseInt(e.target.value))}
          className="w-16 h-8"
          disabled={!book.isLendable}
        />
      ),
    },
    {
      label: 'Period (Days)',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.quotaPeriodDays || 30}
          onChange={(e) => handleSettingChange(book.id, 'quotaPeriodDays', parseInt(e.target.value))}
          className="w-16 h-8"
          disabled={!book.isLendable}
        />
      ),
    },
  ];

  const borrowColumns = [
    {
      label: 'User',
      render: (borrow: any) => (
        <div>
          <p className="font-semibold">{borrow.user.firstName} {borrow.user.lastName}</p>
          <p className="text-xs text-muted-foreground">{borrow.user.email}</p>
        </div>
      ),
    },
    {
      label: 'Book',
      render: (borrow: any) => (
        <div>
          <p className="font-semibold line-clamp-1">{borrow.book.title}</p>
          <p className="text-xs text-muted-foreground">ID: {borrow.book.id}</p>
        </div>
      ),
    },
    {
      label: 'Borrowed At',
      render: (borrow: any) => format(new Date(borrow.borrowedAt), 'MMM dd, yyyy'),
    },
    {
      label: 'Expires At',
      render: (borrow: any) => (
        <span className={new Date(borrow.expiresAt) < new Date() ? 'text-red-500 font-bold' : ''}>
          {format(new Date(borrow.expiresAt), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      label: 'Status',
      render: (borrow: any) => {
        const colors: Record<string, string> = {
          ACTIVE: 'bg-green-100 text-green-800',
          RETURNED: 'bg-blue-100 text-blue-800',
          EXPIRED: 'bg-orange-100 text-orange-800',
          REVOKED: 'bg-red-100 text-red-800',
        };
        return (
          <Badge className={colors[borrow.status] || ''} variant="outline">
            {borrow.status}
          </Badge>
        );
      },
    },
    {
      label: 'Actions',
      render: (borrow: any) => (
        borrow.status === 'ACTIVE' ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRevoke(borrow.id)}
            className="h-8 py-0"
          >
            Revoke
          </Button>
        ) : null
      ),
    },
  ];

  if (loading && books.length === 0) return <PageLoader />;

  return (
    <Card className="rounded">
      <CardContent className="px-0 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-4 pb-2 border-b mb-4 flex justify-between items-center">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="settings">Lending Settings</TabsTrigger>
              <TabsTrigger value="borrows">Active Borrows</TabsTrigger>
            </TabsList>

            {activeTab === 'settings' && (
              <Button
                onClick={handleSave}
                disabled={saving || Object.keys(modifiedSettings).length === 0}
                size="sm"
              >
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
            )}
          </div>

          <TabsContent value="settings" className="mt-0">
            <div className="px-4 pb-2">
              <h2 className="text-sm text-muted-foreground mb-4">
                Configure book lending availability, duration, and quotas.
              </h2>
            </div>
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
          </TabsContent>

          <TabsContent value="borrows" className="mt-0">
            <div className="px-4 pb-2 flex justify-between items-center">
              <h2 className="text-sm text-muted-foreground">
                View and manage current book borrows across all users.
              </h2>
              <div className="flex gap-2">
                {['ACTIVE', 'RETURNED', 'EXPIRED', 'REVOKED', ''].map((s) => (
                  <Button
                    key={s}
                    variant={borrowsStatus === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBorrowsStatus(s)}
                    className="h-7 text-[10px] px-2"
                  >
                    {s || 'ALL'}
                  </Button>
                ))}
              </div>
            </div>
            <AdminTable
              admins={borrows}
              loading={borrowsLoading}
              page={borrowsPage}
              pageSize={borrowsPageSize}
              total={borrowsTotal}
              onPageChange={setBorrowsPage}
              onPageSizeChange={setBorrowsPageSize}
              columns={borrowColumns}
              renderActions={undefined}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LendingManagement;
