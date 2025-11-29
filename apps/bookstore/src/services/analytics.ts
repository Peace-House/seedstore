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

export const getAnalytics = async (): Promise<AnalyticsData> => {
  const res = await api.get('/admin/analytics');
  return res.data;
};

export const getChartAnalytics = async (period: 'week' | 'month' | 'year' = 'week'): Promise<ChartAnalyticsData> => {
  const res = await api.get('/admin/analytics/chart', { params: { period } });
  return res.data;
};
