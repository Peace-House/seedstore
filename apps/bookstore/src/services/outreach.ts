import api from './apiService'

export type OutreachType = 'office' | 'class'
export type CommitMode = 'append' | 'upsert' | 'replace-active'

export interface OutreachLocation {
  id: number
  type: OutreachType
  externalId: string | null
  name: string
  addressLine: string | null
  city: string
  region: string | null
  country: string
  latitude: number | null
  longitude: number | null
  geocodedAt: string | null
  geocodingNote: string | null
  contactName: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  openingHours: Record<string, string> | null
  classSchedule: {
    dayOfWeek: number
    time: string
    durationMin: number | null
  } | null
  languages: string[]
  privateLocation: boolean
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PreviewRow {
  rowNumber: number
  status: 'ok' | 'geocoded' | 'error'
  error?: string
  data: Partial<OutreachLocation>
}

export interface AdminOutreachFilters {
  page?: number
  pageSize?: number
  type?: OutreachType
  country?: string
  region?: string
  city?: string
  q?: string
  active?: boolean
  privateLocation?: boolean
  hasCoords?: boolean
  language?: string
  dateFrom?: string
  dateTo?: string
}

export const listAdminOutreachLocations = async (
  filters: AdminOutreachFilters,
): Promise<{
  locations: OutreachLocation[]
  total: number
  page: number
  pageSize: number
}> => {
  const params: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue
    params[k] = v as string | number | boolean
  }
  const res = await api.get('/admin/outreach/locations', { params })
  return res.data
}

export const createAdminOutreachLocation = async (
  data: Partial<OutreachLocation> & { type: OutreachType },
): Promise<{ location: OutreachLocation }> => {
  const res = await api.post('/admin/outreach/locations', data)
  return res.data
}

export const updateAdminOutreachLocation = async (
  id: number,
  data: Partial<OutreachLocation>,
): Promise<{ location: OutreachLocation }> => {
  const res = await api.put(`/admin/outreach/locations/${id}`, data)
  return res.data
}

export const deactivateAdminOutreachLocation = async (
  id: number,
  opts?: { hard?: boolean },
): Promise<{ message: string; hard?: boolean }> => {
  const res = await api.delete(`/admin/outreach/locations/${id}`, {
    params: opts?.hard ? { hard: 'true' } : undefined,
  })
  return res.data
}

export const reactivateAdminOutreachLocation = async (
  id: number,
): Promise<{ location: OutreachLocation }> => {
  const res = await api.post(
    `/admin/outreach/locations/${id}/reactivate`,
  )
  return res.data
}

// Template download — returns a Blob the caller can save via FileSaver
// or anchor-click. Includes the credential cookie/header that the
// shared `api` client adds.
export const downloadOutreachTemplate = async (
  type: OutreachType,
): Promise<Blob> => {
  const res = await api.get('/admin/outreach/template', {
    params: { type },
    responseType: 'blob',
  })
  return res.data
}

export const uploadOutreachFile = async (
  file: File,
  type: OutreachType,
): Promise<{ rows: PreviewRow[] }> => {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  const res = await api.post('/admin/outreach/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const commitOutreachUpload = async (payload: {
  type: OutreachType
  mode: CommitMode
  rows: PreviewRow['data'][]
}): Promise<{
  message: string
  inserted: number
  updated: number
  deactivated: number
  total: number
  countries: string[]
  type: OutreachType
}> => {
  const res = await api.post('/admin/outreach/commit', payload)
  return res.data
}
