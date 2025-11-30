import api from './apiService';
import { User } from '../hooks/useAuth';



export interface UserPage {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}
// Order type for admin/user orders
export interface Order {
  id: string;
  userId: string;
  bookId: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  book?: {
    id: string;
    title: string;
    author: string;
    price: number;
    cover_url?: string;
    coverImage?: string;
  };
}
export interface AuthResponse {
  user: User;
  token: string;
}


// Auth APIs
export const login = async (email_phcode: string, password: string, platform: string = 'web', deviceId: string, deviceName?: string, location?: string): Promise<AuthResponse> => {
  const isEmail = email_phcode?.search('@')
  const res = await api.post<AuthResponse>('/users/login', isEmail === 11 ? { email: email_phcode, password, platform, deviceId, deviceName, location } : { phcode: email_phcode, password, platform, deviceId, deviceName, location });
  return res.data;
};

export const register = async ({ email, firstName, lastName, password, phoneNumber, countryOfResidence, stateOfResidence }: { email: string, firstName: string, lastName: string, password: string, phoneNumber?: string, countryOfResidence: string, stateOfResidence?: string }): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/users/signup', { email, firstName, lastName, password, phoneNumber, countryOfResidence, stateOfResidence });
  return res.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/users/logout');
};

export const getCurrentUser = async (): Promise<User> => {
  const res = await api.get<{ user: User }>('/users/me');
  return res.data.user;
};

// Forgot password
export const requestPasswordReset = async (email: string): Promise<{ message: string; resetToken?: string }> => {
  const res = await api.post('/users/request-password-reset', { email });
  return res.data;
};

// Reset password
export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  const res = await api.post('/users/reset-password', { token, newPassword });
  return res.data;
};

// Get all orders (admin only)
export const getAllOrders = async (): Promise<Order[]> => {
  const res = await api.get<{ orders: Order[] }>('/users/orders/all');
  return res.data.orders;
};

// Get orders for current user
export const getUserOrders = async (): Promise<Order[]> => {
  const res = await api.get<{ orders: Order[] }>('/users/orders');
  return res.data.orders;
};

// Get paginated users (admin only)
export const getUsers = async (page = 1, pageSize = 10): Promise<UserPage> => {
  const res = await api.get('/admin/users', { params: { page, pageSize } });
  return res.data;
};

// Update user profile
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const res = await api.put<{ user: User }>('/users/profile', data);
  return res.data.user;
};

// Change password
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const res = await api.post('/users/change-password', { currentPassword, newPassword });
  return res.data;
};

// Session/Device management
export interface Session {
  id: string;
  platform: string;
  deviceId: string;
  deviceName: string;
  location: string;
  createdAt: string;
  isCurrent: boolean;
}

export const getUserSessions = async (): Promise<{ sessions: Session[]; total: number }> => {
  const res = await api.get<{ sessions: Session[]; total: number }>('/users/sessions');
  return res.data;
};

export const removeSession = async (sessionId: string): Promise<{ message: string }> => {
  const res = await api.delete('/users/sessions/remove', { data: { sessionId } });
  return res.data;
};