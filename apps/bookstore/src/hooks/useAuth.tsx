
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import * as userApi from '../services';
import { toast } from 'sonner';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isAdmin: boolean;
  role: string;
  createdAt: string;
}
export const useAuth = () => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));

  // Fetch current user
  const {
    data: user,
    isLoading: loading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['authUser', token],
    queryFn: async () => {
      if (!token) return null;
      return await userApi.getCurrentUser();
    },
    enabled: !!token,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      return await userApi.login(payload.email, payload.password);
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
    onError: () => {
      setToken(null);
      localStorage.removeItem('auth_token');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (payload: { email: string; firstName: string; lastName: string; password: string; phoneNumber?: string }) => {
      return await userApi.register({ ...payload });
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
    onError: (error) => {
      setToken(null);
      localStorage.removeItem('auth_token');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await userApi.logout();
    },
    onSuccess: () => {
      setToken(null);
      localStorage.removeItem('auth_token');
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
  });

  return {
    user,
    token,
    loading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    signOut: logoutMutation.mutateAsync,
    refetchUser,
  };
};
