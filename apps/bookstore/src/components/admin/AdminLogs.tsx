import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, AuditLogPage } from '@/services/auditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';

const AdminLogs = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: logPage, isLoading } = useQuery<AuditLogPage>({
    queryKey: ['audit-logs', page, pageSize, search],
    queryFn: () => getAuditLogs(page, pageSize, search),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page on new search
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  return (
    <Card className="rounded">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Audit Logs</CardTitle>
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search user, email, or action..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
            {search && (
              <Button type="button" variant="outline" size="sm" onClick={handleClearSearch}>
                Clear
              </Button>
            )}
          </form>
        </div>
        {search && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing results for: <span className="font-medium">&quot;{search}&quot;</span>
            {logPage && ` (${logPage.total} found)`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className='bg-gray-100'>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
              ) : logPage && logPage.logs && logPage.logs.length ? (
                logPage.logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{log.user?.firstName || ''} {log.user?.lastName || ''}</TableCell>
                    <TableCell>{log.user?.email || '-'}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.details || '-'}</TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5}>No logs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 px-6 pb-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="mx-2">Page {logPage?.page || page} of {logPage ? Math.ceil(logPage.total / (logPage.pageSize || pageSize)) : 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => (logPage && (p * (logPage.pageSize || pageSize) < logPage.total)) ? p + 1 : p)}
            disabled={logPage ? (logPage.page * (logPage.pageSize || pageSize) >= logPage.total) : true}
          >
            Next
          </Button>
        </div>
        <div>
          <label className="mr-2">Rows per page:</label>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="border rounded px-2 py-1"
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
};

export default AdminLogs;
