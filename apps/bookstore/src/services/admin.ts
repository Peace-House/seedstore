import api from './apiService'

export interface AppFeatureSettings {
  peer_lending_enabled: boolean
  seedstore_lending_enabled: boolean
  group_buying_enabled: boolean
  /** Master on/off switch for the Refer & Share program. */
  referral_enabled: boolean
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
    referral_enabled: !!res.data?.referral_enabled,
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
    referral_enabled: !!res.data?.referral_enabled,
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

// ─────────────────────────────────────────────────────────────────────────
// App-update / kill-switch settings
//
// Same `/app-config` endpoint, scoped to the version-control fields.
// Kept separate from the feature-toggle API above so an admin editing
// one set never accidentally writes another.
// ─────────────────────────────────────────────────────────────────────────

export interface AppUpdateSettings {
  /** Hard floor — anything below this is force-updated. */
  min_supported_version: string
  /** Latest available version (drives the optional-update prompt). */
  latest_version: string
  /** Manual force flag: when true, every client is force-updated
   *  regardless of version comparison. */
  force_update: boolean
  /** Kill switch. When true, every client is blocked outright. */
  app_disabled: boolean
  /** Optional ISO-8601 UTC deadline (with a trailing Z). If now > this,
   *  all clients are force-updated even if their version is otherwise OK. */
  force_update_after: string | null
  update_url_android: string
  update_url_ios: string
}

const APP_STORE_DEFAULT =
  'https://apps.apple.com/us/app/living-seed/id6762559749'
const PLAY_STORE_DEFAULT =
  'https://play.google.com/store/apps/details?id=com.livingseed.seedapp'

function readAppUpdate(data: any): AppUpdateSettings {
  return {
    min_supported_version: String(data?.min_supported_version ?? '1.0.0'),
    latest_version: String(data?.latest_version ?? '1.0.0'),
    force_update: !!data?.force_update,
    app_disabled: !!data?.app_disabled,
    force_update_after: data?.force_update_after ?? null,
    update_url_android: String(
      data?.update_url_android ?? PLAY_STORE_DEFAULT,
    ),
    update_url_ios: String(data?.update_url_ios ?? APP_STORE_DEFAULT),
  }
}

export const getAppUpdateSettings = async (): Promise<AppUpdateSettings> => {
  const res = await api.get('/app-config')
  return readAppUpdate(res.data)
}

export const updateAppUpdateSettings = async (
  input: Partial<AppUpdateSettings>,
): Promise<AppUpdateSettings> => {
  const res = await api.put('/app-config', input)
  return readAppUpdate(res.data)
}

/** Highest app version the server has seen reported by active mobile
 *  clients (via the `X-App-Version` request header). Drives the
 *  admin App Settings page's `latest_version` prefill — replaces the
 *  earlier "scrape the public stores" approach, which proved
 *  unreliable (Play Store HTML matches arbitrary numbers; App Store
 *  listing can lag what users actually have installed).
 *
 *  The codebase is the source of truth — and what's running on
 *  devices is the freshest reflection of the codebase.
 */
export interface ObservedVersions {
  ios: string | null
  android: string | null
  iosObservedAt: string | null
  androidObservedAt: string | null
}

export const getObservedVersions = async (): Promise<ObservedVersions> => {
  const res = await api.get('/app-config/observed-versions')
  return {
    ios: typeof res.data?.ios === 'string' ? res.data.ios : null,
    android: typeof res.data?.android === 'string' ? res.data.android : null,
    iosObservedAt:
      typeof res.data?.iosObservedAt === 'string'
        ? res.data.iosObservedAt
        : null,
    androidObservedAt:
      typeof res.data?.androidObservedAt === 'string'
        ? res.data.androidObservedAt
        : null,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Email settings (admin)
//
// One toggle per email type. Disabled toggles short-circuit the matching
// `sendBookEmail` / `sendSeedStoreEmail` call on the server with no SMTP
// connection — see backend services/emailToggle.service.ts.
// ─────────────────────────────────────────────────────────────────────────

export interface EmailSetting {
  key: string
  label: string
  description: string
  category: string
  enabled: boolean
}

export const listEmailSettings = async (): Promise<EmailSetting[]> => {
  const res = await api.get('/admin/email-settings')
  return Array.isArray(res.data?.types) ? res.data.types : []
}

export const setEmailSetting = async (
  key: string,
  enabled: boolean,
): Promise<EmailSetting[]> => {
  const res = await api.patch(`/admin/email-settings/${encodeURIComponent(key)}`, {
    enabled,
  })
  return Array.isArray(res.data?.types) ? res.data.types : []
}
