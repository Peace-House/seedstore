import { useQuery } from '@tanstack/react-query';
import { getAnalytics } from '@/services/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const analyticsCards = [
    { key: 'totalUsers', label: 'Total Users' },
    { key: 'totalUsersOnline', label: 'Users Online' },
  { key: 'totalAdmins', label: 'Total Admins' },
  { key: 'totalAdminsOnline', label: 'Admins Online' },
  { key: 'totalBooks', label: 'Total Books' },
  { key: 'totalOrders', label: 'Total Orders' },
  { key: 'totalFailedOrders', label: 'Failed Orders' },
  { key: 'totalSuccessfulOrders', label: 'Successful Orders' },
  { key: 'totalBookSales', label: 'Total Book Sales (₦)' },
];

const AdminOverview = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: getAnalytics,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  return (
    <section className="container py-10">
      {isLoading && <div>Loading analytics...</div>}
      {error && <div className="text-red-500">Failed to load analytics.</div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {analyticsCards.map(card => (
            <Card key={card.key} className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {card.key === 'totalBookSales'
                    ? `₦${Number(data[card.key]).toLocaleString()}`
                    : data[card.key as keyof typeof data]}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default AdminOverview;
