import api from './apiService'
import { User } from '../hooks/useAuth'

export interface UserPage {
  users: User[]
  total: number
  page: number
  pageSize: number
}
// Order type for admin/user orders
export interface BookPrice {
  id: number
  bookId: number
  currency: string
  soft_copy_price?: number
  hard_copy_price?: number
  country?: string
  createdAt: string
}

export interface Order {
  id: string
  userId: string
  bookId: string
  price: number
  paymentReference?: string
  status?: string
  createdAt: string
  updatedAt?: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    phoneNumber: string
  }
  book?: {
    id: string
    title: string
    author: string
    cover_url?: string
    coverImage?: string
    prices?: BookPrice[]
  }
}
export interface AuthResponse {
  user: User
  token: string
}

// Auth APIs
export const login = async (
  phcode: string,
  password: string,
  platform: string = 'web',
  deviceId: string,
  deviceName?: string,
  location?: string,
): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/users/login', {
    phcode,
    password,
    platform,
    deviceId,
    deviceName,
    location,
  })
  return res.data
}
// export const login = async (email_phcode: string, password: string, platform: string = 'web', deviceId: string, deviceName?: string, location?: string): Promise<AuthResponse> => {
//   const isEmail = email_phcode?.includes('@') ? true : false;
//   console.log('isEmail', isEmail);
//   const res = await api.post<AuthResponse>('/users/login', isEmail ? { email: email_phcode, password, platform, deviceId, deviceName, location } : { phcode: email_phcode, password, platform, deviceId, deviceName, location });
//   return res.data;
// };

export const register = async ({
  email,
  firstName,
  lastName,
  password,
  phoneNumber,
  countryOfResidence,
  stateOfResidence,
  gender,
  dateOfBirth,
}: {
  email: string
  firstName: string
  lastName: string
  password: string
  phoneNumber?: string
  countryOfResidence: string
  stateOfResidence?: string
  gender: string
  dateOfBirth: string
}): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/users/signup', {
    email,
    firstName,
    lastName,
    password,
    phoneNumber,
    countryOfResidence,
    stateOfResidence,
    gender,
    dateOfBirth,
  })
  return res.data
}

export const logout = async (): Promise<void> => {
  await api.post('/users/logout')
}

export const getCurrentUser = async (): Promise<User> => {
  const res = await api.get<{ user: User }>('/users/me')
  return res.data.user
}

// Forgot password
export const requestPasswordReset = async (
  email: string,
): Promise<{ message: string; resetToken?: string }> => {
  const res = await api.post('/users/request-password-reset', { email })
  return res.data
}

// Reset password
export const resetPassword = async (
  token: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const res = await api.post('/users/reset-password', { token, newPassword })
  return res.data
}

// Order filters interface
export interface OrderFilters {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

// Get all orders (admin only)
export const getAllOrders = async (
  page = 1,
  pageSize = 10,
  filters?: OrderFilters,
): Promise<{
  orders: Order[]
  total: number
  page: number
  pageSize: number
}> => {
  const res = await api.get<{
    orders: Order[]
    total: number
    page: number
    pageSize: number
  }>('/users/orders/all', {
    params: {
      page,
      pageSize,
      ...filters,
    },
  })
  return res.data
}

// Get orders for current user
export const getUserOrders = async (): Promise<Order[]> => {
  const res = await api.get<{ orders: Order[] }>('/users/orders')
  return res.data.orders
}

// Get paginated users (admin only)
export const getUsers = async (page = 1, pageSize = 10): Promise<UserPage> => {
  const res = await api.get('/admin/users', { params: { page, pageSize } })
  return res.data
}

// Update user profile
export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  preferredDisplayCountry?: string | null
}

export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const res = await api.put<{ user: User }>('/users/profile', data)
  return res.data.user
}

/** Save display preferences (e.g. currency/country). Persists across web and mobile. */
export const updatePreferences = async (data: {
  preferredDisplayCountry?: string | null
}): Promise<{ preferredDisplayCountry: string | null; message: string }> => {
  const res = await api.patch<{
    preferredDisplayCountry: string | null
    message: string
  }>('/users/me/preferences', data)
  return res.data
}

// Change password
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const res = await api.post('/users/change-password', {
    currentPassword,
    newPassword,
  })
  return res.data
}

// Session/Device management
export interface Session {
  id: string
  platform: string
  deviceId: string
  deviceName: string
  location: string
  createdAt: string
  isCurrent: boolean
}

export const getUserSessions = async (): Promise<{
  sessions: Session[]
  total: number
}> => {
  const res = await api.get<{ sessions: Session[]; total: number }>(
    '/users/sessions',
  )
  return res.data
}

export const removeSession = async (
  sessionId: string,
): Promise<{ message: string }> => {
  const res = await api.delete('/users/sessions/remove', {
    data: { sessionId },
  })
  return res.data
}

// Notification preferences
export interface NotificationPreferences {
  emailNotifications: boolean
  orderUpdates: boolean
  promotions: boolean
  newBooks: boolean
  newBooksUpload: boolean
  loginAlerts: boolean
}

export const getNotificationPreferences = async (): Promise<{
  preferences: NotificationPreferences
}> => {
  const res = await api.get<{ preferences: NotificationPreferences }>(
    '/users/notifications',
  )
  return res.data
}

export const updateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>,
): Promise<{ preferences: NotificationPreferences; message: string }> => {
  const res = await api.put<{
    preferences: NotificationPreferences
    message: string
  }>('/users/notifications', preferences)
  return res.data
}

// Email verification
export const verifyEmail = async (
  token: string,
): Promise<{
  message: string
  verified?: boolean
  alreadyVerified?: boolean
}> => {
  const res = await api.post<{
    message: string
    verified?: boolean
    alreadyVerified?: boolean
  }>('/users/verify-email', { token })
  return res.data
}

export const resendVerificationEmail = async (
  email: string,
): Promise<{ message: string }> => {
  const res = await api.post<{ message: string }>(
    '/users/resend-verification',
    { email },
  )
  return res.data
}

export interface RetrievePHCodeParams {
  surname: string
  phoneNumber: string
  email: string
  day: string
  month: string
  year: string
}

export const retrievePHCode = async (
  params: RetrievePHCodeParams,
): Promise<{
  success: boolean
  phcode?: string
  source?: 'legacy' | 'signup'
  message?: string
}> => {
  const res = await api.post<{
    success: boolean
    phcode?: string
    source?: 'legacy' | 'signup'
    message?: string
  }>('/users/retrieve-ph-code', params)
  return res.data
}

// Create manual order (admin)
export interface CreateManualOrderInput {
  userId: number
  bookId: number
  price: number
  paymentReference?: string
  status?: string
}

export async function createManualOrder(input: CreateManualOrderInput) {
  const res = await api.post('/admin/orders/manual', input)
  return res.data
}

export type NewsletterReaderLevel =
  | 'active'
  | 'heavy'
  | 'reviewers'
  | 'annotators'

export type NewsletterBookReadingStatus =
  | 'reading'
  | 'purchased-not-reading'
  | 'finished'

export type NewsletterTargetMode = 'all' | 'manual' | 'pasted-emails'

export interface NewsletterRecipient {
  id: number | null
  email: string
  firstName?: string
  lastName?: string
  source: 'user' | 'pasted'
}

export interface NewsletterPreviewFilters {
  targetMode?: NewsletterTargetMode
  emailsPerMinute?: number
  dateFrom?: string
  dateTo?: string
  activeInDays?: number
  inactiveInDays?: number
  readerLevel?: NewsletterReaderLevel
  recentBuyerDays?: number
  minSpending?: number
  cartAbandonersOnly?: boolean
  multiBuyersOnly?: boolean
  freeContentOnly?: boolean
  bookId?: number
  bookReadingStatus?: NewsletterBookReadingStatus
  genres?: string[]
  multiGenreOnly?: boolean
  peerLenderOnly?: boolean
  peerBorrowerOnly?: boolean
  groupBuyerOnly?: boolean
  countries?: string[]
  platform?: 'web' | 'mobile' | 'all'
  emailVerified?: boolean
  promotionOptedIn?: boolean
  hasPhcode?: boolean
  userIds?: number[]
  pastedEmails?: string[]
  page?: number
  pageSize?: number
}

export interface NewsletterPreviewResponse {
  preview: boolean
  total: number
  page: number
  pageSize: number
  recipients: NewsletterRecipient[]
}

export interface NewsletterCampaign {
  id: string
  subject: string
  emailsPerMinute: number
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED'
  smtpRateLimitWarning: boolean
  smtpRateLimitWarningMessage?: string | null
  smtpRateLimitWarningAt?: string | null
  totalRecipients: number
  queuedCount: number
  sentCount: number
  failedCount: number
  createdAt: string
  createdByUserId?: number | null
}

export interface NewsletterCampaignDetails extends NewsletterCampaign {
  html: string
}

export interface NewsletterFailureRecipient {
  id: string
  email: string
  attempts: number
  lastError?: string | null
  lastAttemptAt?: string | null
  updatedAt: string
}

export interface NewsletterBookOption {
  id: number
  title: string
  author: string
  genre?: string
}

export const getNewsletterBooks = async (): Promise<NewsletterBookOption[]> => {
  const res = await api.get<{ books: NewsletterBookOption[] }>(
    '/admin/newsletter/books',
  )
  return res.data.books
}

export const previewNewsletterRecipients = async (
  filters: NewsletterPreviewFilters,
): Promise<NewsletterPreviewResponse> => {
  const res = await api.post<NewsletterPreviewResponse>(
    '/admin/newsletter/preview',
    filters,
  )
  return res.data
}

export const sendNewsletter = async (
  payload: NewsletterPreviewFilters & { subject: string; html: string },
): Promise<{ message: string; queuedCount: number; campaignId: string }> => {
  const res = await api.post<{
    message: string
    queuedCount: number
    campaignId: string
  }>('/admin/newsletter/send', payload)
  return res.data
}

export const getNewsletterCampaigns = async (
  page = 1,
  pageSize = 20,
): Promise<{
  campaigns: NewsletterCampaign[]
  total: number
  page: number
  pageSize: number
}> => {
  const res = await api.get<{
    campaigns: NewsletterCampaign[]
    total: number
    page: number
    pageSize: number
  }>('/admin/newsletter/campaigns', {
    params: { page, pageSize },
  })
  return res.data
}

export const getNewsletterCampaignDetails = async (
  campaignId: string,
): Promise<{ campaign: NewsletterCampaignDetails }> => {
  const res = await api.get<{ campaign: NewsletterCampaignDetails }>(
    `/admin/newsletter/campaigns/${campaignId}`,
  )
  return res.data
}

export const getNewsletterCampaignFailures = async (
  campaignId: string,
  page = 1,
  pageSize = 50,
): Promise<{
  campaign: { id: string; subject: string; failedCount: number }
  recipients: NewsletterFailureRecipient[]
  total: number
  page: number
  pageSize: number
}> => {
  const res = await api.get<{
    campaign: { id: string; subject: string; failedCount: number }
    recipients: NewsletterFailureRecipient[]
    total: number
    page: number
    pageSize: number
  }>(`/admin/newsletter/campaigns/${campaignId}/failures`, {
    params: { page, pageSize },
  })
  return res.data
}

export const resendNewsletterCampaignFailures = async (
  campaignId: string,
  deliveryIds?: string[],
): Promise<{ message: string; queuedCount: number; campaignId: string }> => {
  const res = await api.post<{
    message: string
    queuedCount: number
    campaignId: string
  }>(`/admin/newsletter/campaigns/${campaignId}/resend-failed`, { deliveryIds })
  return res.data
}

export const pauseNewsletterCampaign = async (
  campaignId: string,
): Promise<{ message: string; campaignId: string }> => {
  const res = await api.post<{ message: string; campaignId: string }>(
    `/admin/newsletter/campaigns/${campaignId}/pause`,
  )
  return res.data
}

export const resumeNewsletterCampaign = async (
  campaignId: string,
): Promise<{ message: string; campaignId: string }> => {
  const res = await api.post<{ message: string; campaignId: string }>(
    `/admin/newsletter/campaigns/${campaignId}/resume`,
  )
  return res.data
}

export const saveNewsletterDraft = async (
  payload: NewsletterPreviewFilters & { subject: string; html: string },
): Promise<{ message: string; campaignId: string }> => {
  const res = await api.post<{ message: string; campaignId: string }>(
    '/admin/newsletter/draft',
    payload,
  )
  return res.data
}

export const updateNewsletterDraft = async (
  campaignId: string,
  payload: NewsletterPreviewFilters & { subject: string; html: string },
): Promise<{ message: string; campaignId: string }> => {
  const res = await api.put<{ message: string; campaignId: string }>(
    `/admin/newsletter/campaigns/${campaignId}/draft`,
    payload,
  )
  return res.data
}

export const sendNewsletterDraft = async (
  campaignId: string,
): Promise<{ message: string; campaignId: string; queuedCount: number }> => {
  const res = await api.post<{
    message: string
    campaignId: string
    queuedCount: number
  }>(`/admin/newsletter/campaigns/${campaignId}/send-draft`)
  return res.data
}

export const deleteNewsletterDraft = async (
  campaignId: string,
): Promise<{ message: string; campaignId: string }> => {
  const res = await api.delete<{ message: string; campaignId: string }>(
    `/admin/newsletter/campaigns/${campaignId}/draft`,
  )
  return res.data
}
