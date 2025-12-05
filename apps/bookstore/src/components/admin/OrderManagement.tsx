import { useQuery } from '@tanstack/react-query';
import { getAllOrders, Order, OrderFilters } from '@/services/user';

import { format } from 'date-fns';
import { useState, useCallback } from 'react';
import AdminTable from './AdminTable';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import AdvancedFilter, { FilterValues, FilterConfig } from './AdvancedFilter';

// Helper to format currency
const formatPrice = (price: number | undefined, currency = 'NGN') => {
  if (price === undefined || price === null) return '-';
  const symbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${Number(price).toLocaleString()}`;
};

// Get status badge style
const getStatusBadge = (status?: string) => {
  const normalizedStatus = status?.toLowerCase() || 'pending';
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    successful: 'bg-green-100 text-green-800',
    success: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return styles[normalizedStatus] || 'bg-gray-100 text-gray-800';
};

// Filter configuration for orders
const orderFilterConfig: FilterConfig = {
  searchPlaceholder: 'Search by book, customer, amount, or reference...',
  searchEnabled: true,
  statusEnabled: true,
  statusOptions: [
    { value: 'completed', label: 'Completed' },
    { value: 'successful', label: 'Successful' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  statusPlaceholder: 'All statuses',
  dateEnabled: true,
};

const OrderManagement = () => {
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [filters, setFilters] = useState<OrderFilters>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, pageSize, filters],
    queryFn: () => getAllOrders(page, pageSize, filters),
  });

  const orders = data?.orders || [];
  const totalOrders = data?.total || 0;

  // Handle filter changes
  const handleFilterChange = useCallback((filterValues: FilterValues) => {
    setFilters({
      search: filterValues.search || undefined,
      status: filterValues.status || undefined,
      dateFrom: filterValues.dateFrom ? format(filterValues.dateFrom, 'yyyy-MM-dd') : undefined,
      dateTo: filterValues.dateTo ? format(filterValues.dateTo, 'yyyy-MM-dd') : undefined,
    });
    setPage(1); // Reset to first page when filters change
  }, []);

  // Custom columns for orders
  const orderColumns = [
    { label: 'ID', sortKey: 'id', render: (order: Order) => order.id },
    {
      label: 'Customer',
      sortKey: 'user.email',
      render: (order: Order) => (
        <div>
          <div className="font-medium">
            {order.user?.firstName} {order.user?.lastName}
          </div>
          <div className="text-xs text-gray-500">{order.user?.email || '-'}</div>
        </div>
      ),
    },
    {
      label: 'Book',
      sortKey: 'book.title',
      render: (order: Order) =>
        order.book ? (
          <div>
            <div className="font-medium">{order.book.title}</div>
            <div className="text-xs text-gray-500">by {order.book.author}</div>
          </div>
        ) : (
          '-'
        ),
    },
    {
      label: 'Amount Paid',
      sortKey: 'price',
      render: (order: Order) => {
        // Find the currency from book prices if available
        const bookPrice = order.book?.prices?.[0];
        const currency = bookPrice?.currency || 'NGN';
        return <span className="font-medium">{formatPrice(order.price, currency)}</span>;
      },
    },
    {
      label: 'Date',
      sortKey: 'createdAt',
      render: (order: Order) => (
        <div>
          <div>{format(new Date(order.createdAt), 'MMM d, yyyy')}</div>
          <div className="text-xs text-gray-500">{format(new Date(order.createdAt), 'h:mm a')}</div>
        </div>
      ),
    },
    {
      label: 'Status',
      sortKey: 'status',
      render: (order: Order) => {
        const status = order.status || (order.paymentReference ? 'completed' : 'pending');
        return (
          <span
            className={`inline-block rounded px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(status)}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      label: 'Reference',
      sortKey: 'paymentReference',
      render: (order: Order) => (
        <span className="text-xs text-gray-500 font-mono">
          {order.paymentReference ? order.paymentReference.slice(0, 12) + '...' : '-'}
        </span>
      ),
    },
  ];

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <AdvancedFilter config={orderFilterConfig} onFilterChange={handleFilterChange} />
      </CardHeader>
      <CardContent className="px-0">
        <AdminTable
          page={page}
          loading={isLoading}
          pageSize={pageSize}
          total={totalOrders}
          onPageChange={setPage}
          columns={orderColumns}
          admins={orders}
          renderActions={() => null}
          onPageSizeChange={setPageSize}
        />
      </CardContent>
    </Card>
  );
};

export default OrderManagement;
