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

export const getAnalytics = async (): Promise<AnalyticsData> => {
  const res = await api.get('/admin/analytics');
  return res.data;
};
