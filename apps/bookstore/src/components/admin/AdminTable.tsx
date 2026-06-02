import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isYesterday, differenceInDays, differenceInMonths, format as formatDate } from 'date-fns';
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TableColumn<T> {
  label: React.ReactNode;
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
  /** Pin the table header to the top of the nearest scrolling ancestor (default: false) */
  stickyHeader?: boolean;
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

/**
 * Build the list of page numbers to render in the pager, with `null`
 * sentinels indicating where an ellipsis should appear. Keeps the
 * first/last page plus a sliding window of `siblingCount` around the
 * current page so the control stays compact for large datasets.
 */
function getPageItems(current: number, totalPages: number, siblingCount = 1): Array<number | null> {
  if (totalPages <= 1) return [1];
  const totalNumbers = siblingCount * 2 + 5; // first, last, current, 2x siblings, 2x ellipsis slots
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, totalPages);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  const items: Array<number | null> = [];
  if (!showLeftDots && showRightDots) {
    const left = 3 + 2 * siblingCount;
    for (let i = 1; i <= left; i++) items.push(i);
    items.push(null);
    items.push(totalPages);
  } else if (showLeftDots && !showRightDots) {
    items.push(1);
    items.push(null);
    const right = 3 + 2 * siblingCount;
    for (let i = totalPages - right + 1; i <= totalPages; i++) items.push(i);
  } else if (showLeftDots && showRightDots) {
    items.push(1);
    items.push(null);
    for (let i = leftSibling; i <= rightSibling; i++) items.push(i);
    items.push(null);
    items.push(totalPages);
  } else {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  }
  return items;
}

function AdminTable<T extends { id: string; firstName: string; lastName: string; role: string; email: string; phoneNumber?: string; status: string; lastActive?: string; createdAt?: string }>({ admins, loading, page, pageSize, total, onPageChange, onPageSizeChange, columns, renderActions, sortable = true, stickyHeader = false }: AdminTableProps<T>) {
  const cols = columns || defaultAdminColumns;
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [jumpValue, setJumpValue] = useState<string>('');

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = getPageItems(page, totalPages);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const goTo = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    if (clamped !== page) onPageChange(clamped);
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(jumpValue);
    if (!Number.isNaN(n) && n >= 1) {
      goTo(n);
      setJumpValue('');
    }
  };

  // Number of columns the skeleton row should span — matches actual data columns plus the optional actions column.
  const skeletonColCount = cols.length + (renderActions ? 1 : 0);
  // Render `pageSize` shimmer rows, capped at 10 so giant page sizes don't paint a huge loading state.
  const skeletonRowCount = Math.min(pageSize || 5, 10);

  return (
    <div>
      <div className={stickyHeader ? 'max-h-[65vh] overflow-auto' : 'overflow-x-auto'}>
        <Table wrapperClassName={stickyHeader ? 'overflow-visible' : undefined}>
          <TableHeader className={`bg-primary/10 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <TableRow className="hover:bg-primary/10">
              {cols.map((col, i) => {
                const isSortable = sortable && col.sortKey;
                const isActive = sortConfig.key === col.sortKey;
                return (
                  <TableHead
                    key={i}
                    className={`text-primary font-semibold ${isSortable ? 'cursor-pointer select-none hover:bg-primary/20 transition-colors' : ''}`}
                    onClick={() => isSortable && handleSort(col)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {isSortable && <SortIcon direction={isActive ? sortConfig.direction : null} />}
                    </span>
                  </TableHead>
                );
              })}
              {renderActions && <TableHead className="text-primary font-semibold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Shimmer skeleton — one row per expected data row, one
              // skeleton bar per column. Widths jittered so the loading
              // state doesn't read as a uniform grid.
              Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                <TableRow key={`skeleton-${rowIdx}`}>
                  {Array.from({ length: skeletonColCount }).map((__, colIdx) => (
                    <TableCell key={colIdx}>
                      <Skeleton
                        className="h-4"
                        style={{ width: `${55 + ((rowIdx * 7 + colIdx * 13) % 40)}%` }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
              <TableRow><TableCell colSpan={skeletonColCount}>No data found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Advanced pagination — range label + first/prev/numbered/next/last
          + quick page jump + rows-per-page selector. Wraps gracefully on
          narrow screens. */}
      <div className="flex flex-col gap-3 mt-4 px-6 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-muted-foreground">
          {total === 0 ? (
            'No results'
          ) : (
            <>
              Showing <span className="font-medium text-foreground">{rangeStart.toLocaleString()}</span>
              {'–'}
              <span className="font-medium text-foreground">{rangeEnd.toLocaleString()}</span>
              {' of '}
              <span className="font-medium text-foreground">{total.toLocaleString()}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(1)}
            disabled={page === 1}
            aria-label="First page"
            className="h-8 w-8"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageItems.map((item, idx) =>
            item === null ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => goTo(item)}
                className={`h-8 min-w-[2rem] px-2 text-xs ${item === page ? '' : 'hover:bg-primary/10'}`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
            className="h-8 w-8"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          {totalPages > 5 && (
            <form onSubmit={handleJump} className="ml-1 flex items-center gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="admin-table-jump">
                Go to
              </label>
              <input
                id="admin-table-jump"
                type="number"
                min={1}
                max={totalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                placeholder={String(page)}
                className="h-8 w-14 rounded border px-2 text-xs"
              />
            </form>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Rows per page:</label>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-xs"
          >
            {[5, 10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default AdminTable;
