import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, isToday, isYesterday, differenceInDays, differenceInMonths, format as formatDate } from 'date-fns';
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface TableColumn<T> {
  label: string;
  render: (row: T) => React.ReactNode;
  /** Key to use for sorting. If not provided, column is not sortable */
  sortKey?: keyof T | string;
  /** Custom sort function for complex sorting logic */
  sortFn?: (a: T, b: T) => number;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export interface AdminTableProps<T = { id: string; firstName: string; lastName: string; role: string; email: string; phoneNumber?: string; status: string; lastActive?: string; createdAt?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admins: T[] | any[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns?: TableColumn<T>[] | any[];
  renderActions?: (row: T) => React.ReactNode;
  /** Enable client-side sorting (default: true) */
  sortable?: boolean;
}


const defaultAdminColumns: TableColumn<{ id: string; firstName: string; lastName: string; role: string; email: string; phoneNumber?: string; status: string; lastActive?: string; createdAt?: string }>[] = [
  { label: 'Name', sortKey: 'firstName', render: (admin) => `${admin.firstName} ${admin.lastName}` },
  { label: 'Role', sortKey: 'role', render: (admin) => admin.role },
  { label: 'Email', sortKey: 'email', render: (admin) => admin.email },
  { label: 'Phone', sortKey: 'phoneNumber', render: (admin) => admin.phoneNumber || '-' },
  { label: 'Status', sortKey: 'status', render: (admin) => (
    <span className={`capitalize ${admin.status === 'online' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>● {admin.status}</span>
  ) },
  { label: 'Last Active', sortKey: 'lastActive', render: (admin) => {
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
  { label: 'Date Joined', sortKey: 'createdAt', render: (admin) => admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-' },
];

// Sort icon component
const SortIcon = ({ direction }: { direction: SortDirection }) => {
  if (direction === 'asc') return <ChevronUp className="w-4 h-4 inline-block ml-1" />;
  if (direction === 'desc') return <ChevronDown className="w-4 h-4 inline-block ml-1" />;
  return <ChevronsUpDown className="w-4 h-4 inline-block ml-1 opacity-40" />;
};

function AdminTable<T extends { id: string; firstName: string; lastName: string; role: string; email: string; phoneNumber?: string; status: string; lastActive?: string; createdAt?: string }>({ admins, loading, page, pageSize, total, onPageChange, onPageSizeChange, columns, renderActions, sortable = true }: AdminTableProps<T>) {
  const cols = columns || defaultAdminColumns;
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  // Handle column header click for sorting
  const handleSort = (column: TableColumn<T>) => {
    if (!sortable || !column.sortKey) return;

    const key = column.sortKey as string;
    let direction: SortDirection = 'asc';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }

    setSortConfig({ key: direction ? key : null, direction });
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction || !admins) return admins;

    const column = cols.find((col) => col.sortKey === sortConfig.key);
    
    return [...admins].sort((a, b) => {
      // Use custom sort function if provided
      if (column?.sortFn) {
        const result = column.sortFn(a, b);
        return sortConfig.direction === 'desc' ? -result : result;
      }

      const key = sortConfig.key as keyof T;
      const aValue = a[key];
      const bValue = b[key];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle date strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aDate = Date.parse(aValue);
        const bDate = Date.parse(bValue);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        }
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings (case-insensitive)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [admins, sortConfig, cols]);

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className='bg-gray-100'>
            <TableRow>
              {cols.map((col, i) => {
                const isSortable = sortable && col.sortKey;
                const isActive = sortConfig.key === col.sortKey;
                return (
                  <TableHead
                    key={i}
                    className={isSortable ? 'cursor-pointer select-none hover:bg-gray-200 transition-colors' : ''}
                    onClick={() => isSortable && handleSort(col)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {isSortable && <SortIcon direction={isActive ? sortConfig.direction : null} />}
                    </span>
                  </TableHead>
                );
              })}
              {renderActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={cols.length + (renderActions ? 1 : 0)}>Loading...</TableCell></TableRow>
            ) : sortedData && sortedData.length ? (
              sortedData.map((row: T) => (
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
