import api from './apiService'

export type PushTargetMode = 'topic' | 'manual-user-list' | 'all'
export type PushCampaignStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELED'
  | 'COMPLETED'

export interface PushCampaign {
  id: string
  title: string
  body: string
  imageUrl?: string | null
  deepLink?: string | null
  surfaces: string[]
  targetMode: PushTargetMode
  topics: string[]
  userIds: number[]
  translations?: Record<string, { title?: string; body?: string }> | null
  scheduledFor?: string | null
  status: PushCampaignStatus
  totalRecipients: number
  queuedCount: number
  sentCount: number
  failedCount: number
  createdById: number
  createdAt: string
  updatedAt: string
}

export interface PushDraft {
  id: string
  title: string
  body: string
  imageUrl?: string | null
  deepLink?: string | null
  surfaces: string[]
  targetMode: PushTargetMode | null
  topics: string[]
  userIds: number[]
  translations?: Record<string, { title?: string; body?: string }> | null
  createdById: number
  createdAt: string
  updatedAt: string
}

export interface PushFailure {
  id: number
  userId: number | null
  fcmToken: string | null
  topic: string | null
  errorMessage: string | null
  sentAt: string | null
}

export interface ComposerPayload {
  title: string
  body: string
  imageUrl?: string | null
  deepLink?: string | null
  surfaces?: string[]
  targetMode: PushTargetMode
  topics?: string[]
  userIds?: number[]
  translations?: Record<string, { title?: string; body?: string }> | null
  scheduledFor?: string | null
}

export const sendPushNow = async (
  payload: ComposerPayload,
): Promise<{ message: string; campaignId: string; queuedCount: number }> => {
  const res = await api.post('/admin/push/send', payload)
  return res.data
}

export const listPushCampaigns = async (params: {
  page?: number
  pageSize?: number
  status?: string
}): Promise<{
  campaigns: PushCampaign[]
  total: number
  page: number
  pageSize: number
}> => {
  const res = await api.get('/admin/push/campaigns', { params })
  return res.data
}

export const getPushCampaignDetails = async (
  id: string,
): Promise<{ campaign: PushCampaign }> => {
  const res = await api.get(`/admin/push/campaigns/${id}`)
  return res.data
}

export const getPushCampaignFailures = async (
  id: string,
  params?: { page?: number; pageSize?: number },
): Promise<{
  campaign: { id: string; title: string; failedCount: number }
  deliveries: PushFailure[]
  total: number
  page: number
  pageSize: number
}> => {
  const res = await api.get(`/admin/push/campaigns/${id}/failures`, { params })
  return res.data
}

export const pausePushCampaign = async (id: string) => {
  const res = await api.post(`/admin/push/campaigns/${id}/pause`)
  return res.data
}

export const resumePushCampaign = async (id: string) => {
  const res = await api.post(`/admin/push/campaigns/${id}/resume`)
  return res.data
}

export const cancelPushCampaign = async (id: string) => {
  const res = await api.post(`/admin/push/campaigns/${id}/cancel`)
  return res.data
}

export const resendPushFailures = async (id: string) => {
  const res = await api.post(`/admin/push/campaigns/${id}/resend-failed`)
  return res.data
}

export const savePushDraft = async (
  payload: ComposerPayload,
): Promise<{ draft: PushDraft }> => {
  const res = await api.post('/admin/push/drafts', payload)
  return res.data
}

export const updatePushDraft = async (
  id: string,
  payload: Partial<ComposerPayload>,
): Promise<{ draft: PushDraft }> => {
  const res = await api.put(`/admin/push/drafts/${id}`, payload)
  return res.data
}

export const listPushDrafts = async (params?: {
  page?: number
  pageSize?: number
}): Promise<{
  drafts: PushDraft[]
  total: number
  page: number
  pageSize: number
}> => {
  const res = await api.get('/admin/push/drafts', { params })
  return res.data
}

export const getPushDraft = async (
  id: string,
): Promise<{ draft: PushDraft }> => {
  const res = await api.get(`/admin/push/drafts/${id}`)
  return res.data
}

export const deletePushDraft = async (id: string) => {
  const res = await api.delete(`/admin/push/drafts/${id}`)
  return res.data
}

export const sendPushDraft = async (
  id: string,
): Promise<{ message: string; campaignId: string; queuedCount: number }> => {
  const res = await api.post(`/admin/push/drafts/${id}/send`)
  return res.data
}

export const getPushHealth = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const res = await api.get('/admin/push/health')
    return res.data
  } catch (err: any) {
    return { ok: false, error: err?.response?.data?.error || 'Health check failed' }
  }
}

export const getPushAudienceEstimate = async (params: {
  targetMode: PushTargetMode
  topics?: string[]
  userIds?: number[]
}): Promise<{ deliveries: number; topics?: string[]; note?: string }> => {
  const queryParams: Record<string, string | number> = {
    targetMode: params.targetMode,
  }
  if (params.topics && params.topics.length > 0) {
    queryParams.topics = params.topics.join(',')
  }
  if (params.userIds && params.userIds.length > 0) {
    queryParams.userIds = params.userIds.join(',')
  }
  const res = await api.get('/admin/push/audience', { params: queryParams })
  return res.data
}
