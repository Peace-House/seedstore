import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getChartAnalytics } from '@/services/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LiquidGlassWrapper from '../LiquidGlassWrapper';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

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
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('week');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: getAnalytics,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['admin-chart-analytics', chartPeriod],
    queryFn: () => getChartAnalytics(chartPeriod),
    refetchOnMount: "always",
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (chartPeriod === 'year') {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <section className="container py-10">
      {isLoading && <div>Loading analytics...</div>}
      {error && <div className="text-red-500">Failed to load analytics.</div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {analyticsCards.map(card => (
            <LiquidGlassWrapper
            // variant="defa"
            liquidGlass={true}
            key={card.key} className="!shadow-md">
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
            </LiquidGlassWrapper>
          ))}
        </div>
      )}

      {/* Charts Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Analytics Overview</h2>
          <div className="flex gap-2">
            <Button
              variant={chartPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartPeriod('week')}
            >
              Week
            </Button>
            <Button
              variant={chartPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartPeriod('month')}
            >
              Month
            </Button>
            <Button
              variant={chartPeriod === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartPeriod('year')}
            >
              Year
            </Button>
          </div>
        </div>

        {chartLoading && <div>Loading chart data...</div>}
        
        {chartData && chartData.chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders & Users Chart */}
            <LiquidGlassWrapper liquidGlass={true} className="!shadow-md p-4">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Orders & New Users</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={formatDate}
                      formatter={(value: number, name: string) => [value, name === 'orders' ? 'Orders' : 'New Users']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Orders"
                      dot={{ fill: '#8884d8' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="New Users"
                      dot={{ fill: '#82ca9d' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </LiquidGlassWrapper>

            {/* Sales Chart */}
            <LiquidGlassWrapper liquidGlass={true} className="!shadow-md p-4">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Sales Revenue (₦)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₦${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      labelFormatter={formatDate}
                      formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Sales']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="sales" 
                      fill="#8884d8" 
                      name="Sales"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </LiquidGlassWrapper>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminOverview;
