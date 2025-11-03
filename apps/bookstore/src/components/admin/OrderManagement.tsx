import { useQuery } from '@tanstack/react-query';
import { getAllOrders, Order } from '@/services/user';

import { format } from 'date-fns';
import { useState } from 'react';
import AdminTable from './AdminTable';
import { Card, CardContent } from '../ui/card';

const OrderManagement = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const orders = await getAllOrders();
      // Sort by createdAt descending
      return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalOrders = orders?.length || 0;
  const paginatedOrders = orders?.slice((page - 1) * pageSize, page * pageSize) || [];

  if (isLoading) {
    return <div>Loading orders...</div>;
  }

  // Custom columns for orders
  const orderColumns = [
    { label: 'Order ID', render: (order: Order) => order.id },
    { label: 'Customer', render: (order: Order) => order.user?.email || '-' },
    { label: 'Book', render: (order: Order) => order.book ? `${order.book.title} by ${order.book.author}` : '-' },
    { label: 'Price', render: (order: Order) => order.book ? `₦${Number(order.book.price).toLocaleString()}` : '-' },
    { label: 'Date', render: (order: Order) => format(new Date(order.createdAt), 'PPP') },
    {
      label: 'Status', render: (order: Order) => (
        <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Completed</span>
      )
    },
  ];

  return (
    <Card className='rounded'>
      <CardContent className='px-0'>
        <AdminTable
          page={page}
          loading={isLoading}
          pageSize={pageSize}
          total={totalOrders}
          onPageChange={setPage}
          columns={orderColumns}
          admins={paginatedOrders}
          renderActions={() => null}
          onPageSizeChange={setPageSize}
        />
      </CardContent>
    </Card>
  );
};

export default OrderManagement;
