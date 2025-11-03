import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, AuditLogPage } from '@/services/auditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const AdminLogs = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: logPage, isLoading } = useQuery<AuditLogPage>({
    queryKey: ['audit-logs', page, pageSize],
    queryFn: () => getAuditLogs(page, pageSize),
  });

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
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
