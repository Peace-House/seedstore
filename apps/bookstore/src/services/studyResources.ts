import api from './apiService'

/**
 * Study resources — meeting outlines, seminar handouts and workshop
 * material published as PDFs.
 *
 * Read by the mobile app's Study Resources browser; managed here. The
 * list/meta/detail endpoints are public (the mobile home banner renders
 * before sign-in); everything else is admin-only and relies on the auth
 * token apiService attaches automatically.
 */

export type StudyResourceStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export const ALL_STATUSES: StudyResourceStatus[] = [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]

export const STATUS_LABEL: Record<StudyResourceStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

/**
 * Programme abbreviations seen in the existing material, offered as
 * suggestions in the admin form.
 *
 * NOT a closed list — `meetingType` is free text server-side and the
 * mobile app derives its filter chips from whatever is actually
 * published (see `getStudyResourceMeta`). These are here purely so the
 * common cases are one click away instead of retyped.
 */
export const SUGGESTED_MEETING_TYPES = [
  'SAYCO',
  'MLR',
  'CLERGY',
  'CLR',
  'Couples Retreat',
  'Peace House General',
]

export interface StudyResource {
  id: string
  /** Meeting/seminar title. */
  theme: string
  /** Programme abbreviation — free text, see SUGGESTED_MEETING_TYPES. */
  meetingType: string
  year: number
  /**
   * `YYYY-MM-DD`, or '' when the exact date isn't known (much of the
   * back catalogue is only dated by year).
   */
  date: string
  description: string
  /** One-slide-per-page PDF, for reading on a phone. */
  singlePageUrl: string
  /** Two-up PDF, for printing. */
  twoOnOnePageUrl: string
  thumbnailUrl: string
  tags: string[]
  speakers: string[]
  status: StudyResourceStatus
  viewCount?: number
  downloadCount?: number
  /**
   * Display name of the admin who published it (falls back to their
   * email). Null when that account was since removed — the FK is
   * ON DELETE SET NULL so the material outlives its uploader.
   */
  createdBy?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface StudyResourceInput {
  theme: string
  meetingType: string
  year: number
  /** `YYYY-MM-DD`, or null when only the year is known. */
  date?: string | null
  description?: string | null
  singlePageUrl?: string | null
  twoOnOnePageUrl?: string | null
  thumbnailUrl?: string | null
  tags?: string[]
  speakers?: string[]
  status?: StudyResourceStatus
}

export interface StudyResourcePage {
  resources: StudyResource[]
  total: number
  page: number
  pageSize: number
}

/** Filter facets derived from the published material. */
export interface StudyResourceMeta {
  meetingTypes: string[]
  /** Null when nothing is published yet. */
  years: { min: number; max: number } | null
  tags: string[]
}

/** Pull the server's `error` string out of an axios failure. */
export function resourceErrorMessage(err: unknown): string {
  // Client-side rejections (e.g. an oversized PDF) never reach the
  // network, so they carry their message on the Error itself.
  if (err instanceof PdfTooLargeError) return err.message
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error || 'Something went wrong'
  )
}

// ─── public ───────────────────────────────────────────────────────────

export async function listPublishedStudyResources(params?: {
  page?: number
  pageSize?: number
  meetingType?: string | string[]
  year?: number
  yearStart?: number
  yearEnd?: number
  keyword?: string
}): Promise<StudyResourcePage> {
  const res = await api.get<StudyResourcePage>('/resources', { params })
  return res.data
}

/**
 * Filter facets. Never throws — an empty facet set is a valid answer
 * (nothing published yet) and a filter bar must not break its page.
 */
export async function getStudyResourceMeta(): Promise<StudyResourceMeta> {
  try {
    const res = await api.get<StudyResourceMeta>('/resources/meta')
    return res.data
  } catch {
    return { meetingTypes: [], years: null, tags: [] }
  }
}

// ─── admin ────────────────────────────────────────────────────────────

export async function listStudyResources(params?: {
  status?: StudyResourceStatus
  meetingType?: string | string[]
  keyword?: string
  page?: number
  pageSize?: number
}): Promise<StudyResourcePage> {
  const res = await api.get<StudyResourcePage>('/resources/admin/all', {
    params,
  })
  return res.data
}

export async function getStudyResource(id: string): Promise<StudyResource> {
  const res = await api.get<{ resource: StudyResource }>(
    `/resources/admin/${id}`,
  )
  return res.data.resource
}

export async function createStudyResource(
  input: StudyResourceInput,
): Promise<StudyResource> {
  const res = await api.post<{ resource: StudyResource }>('/resources', input)
  return res.data.resource
}

export async function updateStudyResource(
  id: string,
  input: Partial<StudyResourceInput>,
): Promise<StudyResource> {
  const res = await api.put<{ resource: StudyResource }>(
    `/resources/${id}`,
    input,
  )
  return res.data.resource
}

/**
 * Archives by default — study material is worth keeping even when it's
 * off the shelf, and an archived row can be republished. `hard` removes
 * it entirely.
 */
export async function deleteStudyResource(id: string, hard = false) {
  const res = await api.delete(`/resources/${id}`, {
    params: hard ? { hard: true } : undefined,
  })
  return res.data
}

/**
 * Ceiling on a study-resource PDF: files must be UNDER this size.
 *
 * This is Cloudinary's raw-asset ceiling on the current plan, not a
 * policy choice — a larger file cannot be stored at all. Checked here
 * as well as server-side so an admin finds out before sitting through
 * the upload rather than after.
 *
 * The comparison below is `>=`, matching multer's behaviour on the
 * server, which rejects a file that REACHES this size rather than only
 * one that exceeds it. If this used `>`, a file of exactly 10MB would
 * pass here, upload in full, and then be rejected — the precise
 * experience this check exists to prevent.
 */
export const MAX_PDF_BYTES = 10 * 1024 * 1024

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Thrown before any bytes go over the wire. */
export class PdfTooLargeError extends Error {
  constructor(public readonly size: number) {
    super(
      `That PDF is ${formatBytes(size)}. It must be under ${formatBytes(
        MAX_PDF_BYTES,
      )} — try splitting it, or re-exporting at a lower quality.`,
    )
    this.name = 'PdfTooLargeError'
  }
}

/**
 * Upload a PDF and get its URL back, to save into `singlePageUrl` or
 * `twoOnOnePageUrl`.
 *
 * Separate from create/update so a slow multi-megabyte upload doesn't
 * hold the form open, and so replacing one layout leaves the other
 * alone. `onProgress` reports 0–100 — these files run to several MB, so
 * a bare spinner would look stalled.
 */
export async function uploadStudyResourcePdf(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  // Fail before the upload starts — the server enforces this too, but
  // reaching it means the admin has already waited for the transfer.
  // `>=` deliberately, to match multer server-side. See MAX_PDF_BYTES.
  if (file.size >= MAX_PDF_BYTES) throw new PdfTooLargeError(file.size)

  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post<{ url: string }>(
    '/resources/admin/upload',
    formData,
    {
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return
        onProgress(Math.round((e.loaded / e.total) * 100))
      },
    },
  )
  return res.data.url
}

/** Upload a cover image for the mobile browse cards. */
export async function uploadStudyResourceThumbnail(
  file: File,
): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const res = await api.post<{ url: string }>(
    '/resources/admin/upload-thumbnail',
    formData,
  )
  return res.data.url
}
