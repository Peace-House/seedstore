import api from './apiService'

/**
 * Site-wide announcements.
 *
 * `getActiveAnnouncement` is public (used by the site-wide bar);
 * everything else is admin-only and requires the auth token that
 * apiService attaches automatically.
 */

export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'ARCHIVED'

/** Surfaces an announcement can target. */
export type AnnouncementPlatform = 'android' | 'ios' | 'web'

export const ALL_PLATFORMS: AnnouncementPlatform[] = ['android', 'ios', 'web']

export const PLATFORM_LABEL: Record<AnnouncementPlatform, string> = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
}

export interface Announcement {
  id: string
  message: string
  body: string | null
  linkUrl: string | null
  linkLabel: string | null
  status: AnnouncementStatus
  startsAt: string | null
  endsAt: string | null
  /** Targets. EMPTY MEANS ALL PLATFORMS, not "none". */
  platforms: AnnouncementPlatform[]
  reusedFromId: string | null
  /**
   * Display name of the admin who created it (falls back to their
   * email). Null when the author's account was since removed — the FK
   * is ON DELETE SET NULL so history survives.
   */
  createdBy: string | null
  /** Derived server-side: SCHEDULED and inside its window right now. */
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AnnouncementInput {
  message: string
  body?: string | null
  /** Omit or send [] to target every platform. */
  platforms?: AnnouncementPlatform[]
  status?: 'DRAFT' | 'SCHEDULED'
  /**
   * Omit (or send null) to publish immediately — the server fills in
   * its own current time, so the admin's clock can't skew the start.
   */
  startsAt?: string | null
  endsAt?: string | null
}

/** Shape the API returns on a 409 when windows overlap. */
export interface ScheduleClash {
  error: 'SCHEDULE_CLASH'
  message: string
  conflictsWith: {
    id: string
    message: string
    startsAt: string | null
    endsAt: string | null
  }
}

export function isScheduleClash(err: unknown): ScheduleClash | null {
  const data = (err as { response?: { data?: unknown } })?.response?.data as
    | ScheduleClash
    | undefined
  return data?.error === 'SCHEDULE_CLASH' ? data : null
}

// ─── public ───────────────────────────────────────────────────────────

/**
 * The announcement live right now, or null. Never throws.
 *
 * Sends `platform=web` so platform-targeted announcements resolve
 * correctly — the mobile apps identify themselves via the
 * `X-App-Platform` header they already send on every request.
 */
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  try {
    const res = await api.get<{ announcement: Announcement | null }>(
      '/announcements/active',
      { params: { platform: 'web' } },
    )
    return res.data.announcement ?? null
  } catch {
    // An announcement must never break the page it sits on.
    return null
  }
}

// ─── admin ────────────────────────────────────────────────────────────

export async function listAnnouncements(params?: {
  status?: AnnouncementStatus
  page?: number
  pageSize?: number
}) {
  const res = await api.get<{
    announcements: Announcement[]
    total: number
    page: number
    pageSize: number
  }>('/announcements', { params })
  return res.data
}

export async function createAnnouncement(input: AnnouncementInput) {
  const res = await api.post<{ announcement: Announcement }>(
    '/announcements',
    input,
  )
  return res.data.announcement
}

export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput> & { status?: AnnouncementStatus },
) {
  const res = await api.put<{ announcement: Announcement }>(
    `/announcements/${id}`,
    input,
  )
  return res.data.announcement
}

/**
 * Copy an announcement into a new draft. Pass a window to schedule the
 * copy straight away; omit it to get a draft.
 */
export async function reuseAnnouncement(
  id: string,
  /** `startsAt` optional — an end date alone publishes immediately. */
  window?: { startsAt?: string; endsAt: string },
) {
  const res = await api.post<{ announcement: Announcement }>(
    `/announcements/${id}/reuse`,
    window ?? {},
  )
  return res.data.announcement
}

/** Archives by default; `hard` removes the row entirely. */
export async function deleteAnnouncement(id: string, hard = false) {
  const res = await api.delete(`/announcements/${id}`, {
    params: hard ? { hard: true } : undefined,
  })
  return res.data
}
