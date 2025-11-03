



import api from './apiService';

// Get all admins (paginated)
export interface AdminPage {
  admins: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    email: string;
    phoneNumber?: string;
    lastActive?: string;
    createdAt?: string;
    status?: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export const getAdmins = async (page = 1, pageSize = 10): Promise<AdminPage> => {
  const res = await api.get('/admin', { params: { page, pageSize } });
  return res.data;
};

// Get all roles
export const getRoles = async () => {
  const res = await api.get('/roles');
  return res.data;
};

// Invite one or more admins with email(s) and role
export const inviteAdminWithRole = async (emails: string[], role: string) => {
  const invites = emails.map(email => ({ email: email.trim(), role }));
  const res = await api.post('/admin-invite/invite', { invites });
  return res.data;
};

export const acceptAdminInvite = async ({email, firstName, lastName, password, phoneNumber, phcode, token }: {email: string, firstName: string, lastName: string, password: string, phoneNumber?: string, phcode:string, token:string}) => {
  const res = await api.post('/admin-invite/accept', { email, firstName, lastName, password, phoneNumber, phcode, token });
  return res.data;
};

// Suspend an admin (super_admin only)
export const suspendAdmin = async (adminId: number) => {
  const res = await api.post('/admin/suspend', { adminId });
  return res.data;
};

// Unsuspend an admin (super_admin only)
export const unsuspendAdmin = async (adminId: number) => {
  const res = await api.post('/admin/unsuspend', { adminId });
  return res.data;
};