import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, isToday, isYesterday, differenceInDays, differenceInMonths, format as formatDate } from 'date-fns';
import { useState } from 'react';


export interface TableColumn<T> {
  label: string;
  render: (row: T) => React.ReactNode;
}

export interface AdminTableProps<T = { id: string; firstName: string; lastName: string; role: string; email: string; phoneNumber?: string; status: string; lastActive?: string; createdAt?: string }> {
  admins: T[] | any[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  columns?: TableColumn<T>[] | any[];
  renderActions?: (row: T) => React.ReactNode;
}


const defaultAdminColumns: TableColumn<{ id: string; firstName: string; lastName: string; role: string; email: string; phoneNumber?: string; status: string; lastActive?: string; createdAt?: string }>[] = [
  { label: 'Name', render: (admin) => `${admin.firstName} ${admin.lastName}` },
  { label: 'Role', render: (admin) => admin.role },
  { label: 'Email', render: (admin) => admin.email },
  { label: 'Phone', render: (admin) => admin.phoneNumber || '-' },
  { label: 'Status', render: (admin) => (
    <span className={`capitalize ${admin.status === 'online' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>● {admin.status}</span>
  ) },
  { label: 'Last Active', render: (admin) => {
    if (!admin.lastActive) return '-';
    const last = new Date(admin.lastActive);
    const now = new Date();
    let rel = '';
    if (isToday(last)) rel = 'today';
    else if (isYesterday(last)) rel = 'yesterday';
    else {
      const days = differenceInDays(now, last);
      const months = differenceInMonths(now, last);
      if (months >= 1) rel = months === 1 ? '1 month ago' : `${months} months ago`;
      else if (days > 1) rel = `${days} days ago`;
      else rel = formatDate(last, 'MMM d, yyyy');
    }
    const time = format(last, 'h:mmaaa').toLowerCase();
    return `${rel} at ${time}`;
  } },
  { label: 'Date Joined', render: (admin) => admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-' },
];

function AdminTable<T extends { id: string; firstName: string; lastName: string; role: string; email: string; phoneNumber?: string; status: string; lastActive?: string; createdAt?: string }>({ admins, loading, page, pageSize, total, onPageChange, onPageSizeChange, columns, renderActions }: AdminTableProps<T>) {
  const cols = columns || defaultAdminColumns;
  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className='bg-gray-100'>
            <TableRow>
              {cols.map((col, i) => (
                <TableHead key={i}>{col.label}</TableHead>
              ))}
              {renderActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={cols.length + (renderActions ? 1 : 0)}>Loading...</TableCell></TableRow>
            ) : admins && admins.length ? (
              admins.map((row: T) => (
                <TableRow key={row.id}>
                  {cols.map((col, i) => (
                    <TableCell key={i}>{col.render(row)}</TableCell>
                  ))}
                  {renderActions && <TableCell>{renderActions(row)}</TableCell>}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={cols.length + (renderActions ? 1 : 0)}>No data found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 px-6 pb-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className='text-xs'
          >
            Previous
          </Button>
          <span className="mx-2 text-xs">Page {page} of {Math.ceil(total / pageSize) || 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page * pageSize < total ? page + 1 : page)}
            disabled={page * pageSize >= total}
            className='text-xs'
          >
            Next
          </Button>
        </div>
        <div>
          <label className="mr-2 text-xs">Rows per page:</label>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-xs"
          >
            {[5, 10, 20, 50].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default AdminTable;
