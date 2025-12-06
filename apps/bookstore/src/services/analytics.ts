import api from './apiService';

export interface AnalyticsData {
  totalUsers: number;
  totalAdmins: number;
  totalBooks: number;
  totalAdminsOnline: number;
  totalOrders: number;
  totalFailedOrders: number;
  totalSuccessfulOrders: number;
  totalBookSales: number;
}

export interface ChartDataPoint {
  date: string;
  orders: number;
  users: number;
  sales: number;
}

export interface ChartAnalyticsData {
  chartData: ChartDataPoint[];
  period: string;
}

export interface BookReader {
  userId: number;
  userName: string;
  userEmail: string;
  purchaseDate: string;
  readingStatus: 'not_started' | 'reading' | 'completed';
  percentage: number;
  startedReading: string | null;
  lastReadAt: string | null;
  completedAt: string | null;
}

export interface BookReadingAnalytics {
  book: {
    id: number;
    title: string;
    author: string;
    coverImage?: string;
  };
  summary: {
    totalPurchased: number;
    notStarted: number;
    currentlyReading: number;
    completed: number;
  };
  readers: BookReader[];
}

export const getAnalytics = async (): Promise<AnalyticsData> => {
  const res = await api.get('/admin/analytics');
  return res.data;
};

export const getChartAnalytics = async (period: 'week' | 'month' | 'year' = 'week'): Promise<ChartAnalyticsData> => {
  const res = await api.get('/admin/analytics/chart', { params: { period } });
  return res.data;
};

export const getBookReadingAnalytics = async (bookId: number): Promise<BookReadingAnalytics> => {
  const res = await api.get(`/admin/books/${bookId}/reading-analytics`);
  return res.data;
};
