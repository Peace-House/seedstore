import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getChartAnalytics, getBookReadingAnalytics, BookReadingAnalytics } from '@/services/analytics';
import { getBooks } from '@/services/book';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { BookOpen, Users, CheckCircle, Clock } from 'lucide-react';

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
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [readersPage, setReadersPage] = useState(1);
  const [readersPageSize, setReadersPageSize] = useState(10);

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

  // Fetch all books for dropdown
  const { data: booksData } = useQuery({
    queryKey: ['all-books-dropdown'],
    queryFn: () => getBooks(1, 500), // Get up to 500 books
  });

  // Fetch book reading analytics when a book is selected
  const { data: bookAnalytics, isLoading: analyticsLoading } = useQuery<BookReadingAnalytics>({
    queryKey: ['book-reading-analytics', selectedBookId],
    queryFn: () => getBookReadingAnalytics(Number(selectedBookId)),
    enabled: !!selectedBookId,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (chartPeriod === 'year') {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'reading':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Reading</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Not Started</Badge>;
    }
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

      {/* Book Reading Analytics Section */}
      <div className="mt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold">Book Reading Analytics</h2>
          <Select value={selectedBookId} onValueChange={(value) => { setSelectedBookId(value); setReadersPage(1); }}>
            <SelectTrigger className="w-full md:w-[350px]">
              <SelectValue placeholder="Select a book to view analytics" />
            </SelectTrigger>
            <SelectContent>
              {booksData?.books?.map((book) => (
                <SelectItem key={book.id} value={String(book.id)}>
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBookId && analyticsLoading && (
          <div className="text-center py-8">Loading analytics...</div>
        )}

        {selectedBookId && bookAnalytics && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Purchased</p>
                      <p className="text-2xl font-bold">{bookAnalytics.summary.totalPurchased}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Clock className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Not Started</p>
                      <p className="text-2xl font-bold">{bookAnalytics.summary.notStarted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Currently Reading</p>
                      <p className="text-2xl font-bold">{bookAnalytics.summary.currentlyReading}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{bookAnalytics.summary.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Readers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {bookAnalytics.book.coverImage && (
                    <img
                      src={bookAnalytics.book.coverImage}
                      alt={bookAnalytics.book.title}
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div>
                    <span className="text-lg">{bookAnalytics.book.title}</span>
                    <p className="text-sm font-normal text-muted-foreground">
                      by {bookAnalytics.book.author}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookAnalytics.readers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No users have purchased this book yet.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reader</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Purchase Date</TableHead>
                            <TableHead>Started Reading</TableHead>
                            <TableHead>Last Read</TableHead>
                            <TableHead>Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookAnalytics.readers
                            .slice((readersPage - 1) * readersPageSize, readersPage * readersPageSize)
                            .map((reader) => (
                            <TableRow key={reader.userId}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{reader.userName}</p>
                                  <p className="text-xs text-muted-foreground">{reader.userEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(reader.readingStatus)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{ width: `${reader.percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-sm">{reader.percentage}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {format(new Date(reader.purchaseDate), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                {reader.startedReading
                                  ? format(new Date(reader.startedReading), 'MMM d, yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {reader.lastReadAt
                                  ? format(new Date(reader.lastReadAt), 'MMM d, yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {reader.completedAt
                                  ? format(new Date(reader.completedAt), 'MMM d, yyyy')
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Showing {((readersPage - 1) * readersPageSize) + 1} to {Math.min(readersPage * readersPageSize, bookAnalytics.readers.length)} of {bookAnalytics.readers.length} readers
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Rows per page:</span>
                          <select
                            value={readersPageSize}
                            onChange={(e) => { setReadersPageSize(Number(e.target.value)); setReadersPage(1); }}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {[5, 10, 20, 50].map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReadersPage(p => Math.max(1, p - 1))}
                            disabled={readersPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {readersPage} of {Math.ceil(bookAnalytics.readers.length / readersPageSize)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReadersPage(p => p + 1)}
                            disabled={readersPage * readersPageSize >= bookAnalytics.readers.length}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedBookId && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a book from the dropdown above to view reading analytics</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

export default AdminOverview;
