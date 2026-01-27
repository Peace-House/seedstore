import api from './apiService';

// Audit log types and API
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  details?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}
export interface AuditLogPage {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export const getAuditLogs = async (page = 1, pageSize = 20, search = ''): Promise<AuditLogPage> => {
  const res = await api.get('/audit-logs', { params: { page, pageSize, search } });
  return res.data;
};
