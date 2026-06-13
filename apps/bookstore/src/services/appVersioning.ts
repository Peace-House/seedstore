import api from './apiService'

// ─── Types ────────────────────────────────────────────────────────

export interface AppFeatureBadge {
  id: number
  featureKey: string
  sinceVersion: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface WhatsNewSlide {
  id: number
  version: string
  locale: string
  order: number
  title: string
  body: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

// ─── Feature badges ───────────────────────────────────────────────

export const listFeatureBadges = async (): Promise<AppFeatureBadge[]> => {
  const res = await api.get('/app-config/admin/feature-badges')
  const rows = Array.isArray(res.data?.badges) ? res.data.badges : []
  return rows.map(normaliseBadge)
}

export const createFeatureBadge = async (input: {
  featureKey: string
  sinceVersion?: string
  active?: boolean
}): Promise<AppFeatureBadge> => {
  const res = await api.post('/app-config/admin/feature-badges', input)
  return normaliseBadge(res.data?.badge)
}

export const updateFeatureBadge = async (
  id: number,
  input: Partial<{
    featureKey: string
    sinceVersion: string
    active: boolean
  }>,
): Promise<AppFeatureBadge> => {
  const res = await api.put(
    `/app-config/admin/feature-badges/${id}`,
    input,
  )
  return normaliseBadge(res.data?.badge)
}

export const deleteFeatureBadge = async (id: number): Promise<void> => {
  await api.delete(`/app-config/admin/feature-badges/${id}`)
}

// ─── What's New slides ────────────────────────────────────────────

export const listWhatsNewSlides = async (params?: {
  version?: string
}): Promise<WhatsNewSlide[]> => {
  const res = await api.get('/app-config/admin/whats-new/slides', {
    params: params?.version ? { version: params.version } : undefined,
  })
  const rows = Array.isArray(res.data?.slides) ? res.data.slides : []
  return rows.map(normaliseSlide)
}

export const createWhatsNewSlide = async (input: {
  version: string
  locale?: string
  order?: number
  title: string
  body: string
  imageUrl?: string | null
}): Promise<WhatsNewSlide> => {
  const res = await api.post('/app-config/admin/whats-new/slides', input)
  return normaliseSlide(res.data?.slide)
}

export const updateWhatsNewSlide = async (
  id: number,
  input: Partial<{
    version: string
    locale: string
    order: number
    title: string
    body: string
    imageUrl: string | null
  }>,
): Promise<WhatsNewSlide> => {
  const res = await api.put(
    `/app-config/admin/whats-new/slides/${id}`,
    input,
  )
  return normaliseSlide(res.data?.slide)
}

export const deleteWhatsNewSlide = async (id: number): Promise<void> => {
  await api.delete(`/app-config/admin/whats-new/slides/${id}`)
}

// Upload a What's New slide image; returns the Cloudinary URL.
export const uploadWhatsNewImage = async (
  file: File,
): Promise<{ imageUrl: string }> => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await api.post('/app-config/admin/whats-new/upload-image', formData)
  return res.data
}

// ─── Normalisers ──────────────────────────────────────────────────

function normaliseBadge(raw: any): AppFeatureBadge {
  return {
    id: Number(raw?.id ?? 0),
    featureKey: String(raw?.featureKey ?? ''),
    sinceVersion: String(raw?.sinceVersion ?? ''),
    active: raw?.active !== false,
    createdAt: String(raw?.createdAt ?? ''),
    updatedAt: String(raw?.updatedAt ?? ''),
  }
}

function normaliseSlide(raw: any): WhatsNewSlide {
  return {
    id: Number(raw?.id ?? 0),
    version: String(raw?.version ?? ''),
    locale: String(raw?.locale ?? 'en'),
    order: Number(raw?.order ?? 0),
    title: String(raw?.title ?? ''),
    body: String(raw?.body ?? ''),
    imageUrl:
      typeof raw?.imageUrl === 'string' && raw.imageUrl.trim()
        ? raw.imageUrl
        : null,
    createdAt: String(raw?.createdAt ?? ''),
    updatedAt: String(raw?.updatedAt ?? ''),
  }
}
