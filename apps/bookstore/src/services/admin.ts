import api from './apiService'

export interface AppFeatureSettings {
  peer_lending_enabled: boolean
  seedstore_lending_enabled: boolean
  group_buying_enabled: boolean
  payment_paystack_enabled: boolean
  payment_applepay_enabled: boolean
  payment_flutterwave_enabled: boolean
  payment_methods: Array<{
    key: 'paystack' | 'applepay' | 'flutterwave'
    label: string
    enabled: boolean
  }>
  group_buying_discount_25_plus_copies: number
  group_buying_discount_25_plus: number
  group_buying_discount_50_plus_copies: number
  group_buying_discount_50_plus: number
}

// Get all admins (paginated)
export interface AdminPage {
  admins: Array<{
    id: string
    firstName?: string
    lastName?: string
    role?: string
    email: string
    phoneNumber?: string
    lastActive?: string
    createdAt?: string
    status?: string
  }>
  total: number
  page: number
  pageSize: number
}

export const getAdmins = async (
  page = 1,
  pageSize = 10,
): Promise<AdminPage> => {
  const res = await api.get('/admin', { params: { page, pageSize } })
  return res.data
}

// Get all roles
export const getRoles = async () => {
  const res = await api.get('/roles')
  return res.data
}

// Invite one or more admins with email(s) and role
export const inviteAdminWithRole = async (emails: string[], role: string) => {
  const invites = emails.map((email) => ({ email: email.trim(), role }))
  const res = await api.post('/admin-invite/invite', { invites })
  return res.data
}

export const acceptAdminInvite = async ({
  email,
  firstName,
  lastName,
  password,
  phoneNumber,
  phcode,
  token,
}: {
  email: string
  firstName: string
  lastName: string
  password: string
  phoneNumber?: string
  phcode: string
  token: string
}) => {
  const res = await api.post('/admin-invite/accept', {
    email,
    firstName,
    lastName,
    password,
    phoneNumber,
    phcode,
    token,
  })
  return res.data
}

// Suspend an admin (super_admin only)
export const suspendAdmin = async (adminId: number) => {
  const res = await api.post('/admin/suspend', { adminId })
  return res.data
}

// Unsuspend an admin (super_admin only)
export const unsuspendAdmin = async (adminId: number) => {
  const res = await api.post('/admin/unsuspend', { adminId })
  return res.data
}

export const getAppFeatureSettings = async (): Promise<AppFeatureSettings> => {
  const res = await api.get('/app-config')
  return {
    peer_lending_enabled: !!res.data?.peer_lending_enabled,
    seedstore_lending_enabled: !!res.data?.seedstore_lending_enabled,
    group_buying_enabled: !!res.data?.group_buying_enabled,
    payment_paystack_enabled: res.data?.payment_paystack_enabled !== false,
    payment_applepay_enabled: res.data?.payment_applepay_enabled !== false,
    payment_flutterwave_enabled:
      res.data?.payment_flutterwave_enabled !== false,
    payment_methods: Array.isArray(res.data?.payment_methods)
      ? res.data.payment_methods
      : [
          {
            key: 'paystack',
            label: 'Paystack',
            enabled: res.data?.payment_paystack_enabled !== false,
          },
          {
            key: 'applepay',
            label: 'Apple Pay',
            enabled: res.data?.payment_applepay_enabled !== false,
          },
          {
            key: 'flutterwave',
            label: 'Flutterwave',
            enabled: res.data?.payment_flutterwave_enabled !== false,
          },
        ],
    group_buying_discount_25_plus_copies: Number(
      res.data?.group_buying_discount_25_plus_copies ?? 25,
    ),
    group_buying_discount_25_plus: Number(
      res.data?.group_buying_discount_25_plus ?? 5,
    ),
    group_buying_discount_50_plus_copies: Number(
      res.data?.group_buying_discount_50_plus_copies ?? 50,
    ),
    group_buying_discount_50_plus: Number(
      res.data?.group_buying_discount_50_plus ?? 10,
    ),
  }
}

export const updateAppFeatureSettings = async (
  input: Partial<AppFeatureSettings>,
): Promise<AppFeatureSettings> => {
  const res = await api.put('/app-config', input)
  return {
    peer_lending_enabled: !!res.data?.peer_lending_enabled,
    seedstore_lending_enabled: !!res.data?.seedstore_lending_enabled,
    group_buying_enabled: !!res.data?.group_buying_enabled,
    payment_paystack_enabled: res.data?.payment_paystack_enabled !== false,
    payment_applepay_enabled: res.data?.payment_applepay_enabled !== false,
    payment_flutterwave_enabled:
      res.data?.payment_flutterwave_enabled !== false,
    payment_methods: Array.isArray(res.data?.payment_methods)
      ? res.data.payment_methods
      : [
          {
            key: 'paystack',
            label: 'Paystack',
            enabled: res.data?.payment_paystack_enabled !== false,
          },
          {
            key: 'applepay',
            label: 'Apple Pay',
            enabled: res.data?.payment_applepay_enabled !== false,
          },
          {
            key: 'flutterwave',
            label: 'Flutterwave',
            enabled: res.data?.payment_flutterwave_enabled !== false,
          },
        ],
    group_buying_discount_25_plus_copies: Number(
      res.data?.group_buying_discount_25_plus_copies ?? 25,
    ),
    group_buying_discount_25_plus: Number(
      res.data?.group_buying_discount_25_plus ?? 5,
    ),
    group_buying_discount_50_plus_copies: Number(
      res.data?.group_buying_discount_50_plus_copies ?? 50,
    ),
    group_buying_discount_50_plus: Number(
      res.data?.group_buying_discount_50_plus ?? 10,
    ),
  }
}
