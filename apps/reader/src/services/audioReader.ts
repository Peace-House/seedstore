import axios, { AxiosError } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

// Reader-exposed voice catalogue. Trimmed to two voices (Studio-C
// and Studio-B) so the live Google TTS bill stays predictable —
// every voice in the list multiplies cache misses by 1×. Kept in
// sync with the mobile app's `_kStudioVoiceDisplay`.
const STUDIO_VOICE_DISPLAY: Record<string, string> = {
  C: 'Charlotte',
  B: 'Benjamin',
}

const STUDIO_LETTER_RE = /\bStudio[-_ ]?([A-Z])\b/i

/** Voice metadata returned by `GET /audio/voices`. */
export interface AudioVoice {
  id: string
  friendlyName: string
  languageCode: string
  gender: string // 'MALE' | 'FEMALE' | 'NEUTRAL'
  quality: string // 'studio' | 'neural2' | 'wavenet' | 'neural'
}

/** Single synthesized audio clip — either cached or freshly generated. */
export interface AudioClip {
  audioUrl: string
  durationMs: number
  cached: boolean
}

export interface SynthesizePayload {
  bookId: number
  chapterId: string
  paragraphIdx: number
  text: string
  voiceId: string
  speed: number
  pitch: number
}

export class AudioReaderError extends Error {
  status?: number
  code?: string
  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'AudioReaderError'
    this.status = status
    this.code = code
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function studioLetterFromId(id: string): string | null {
  const m = STUDIO_LETTER_RE.exec(id)
  if (!m) return null
  const letter = m[1]?.toUpperCase() ?? ''
  return letter && letter in STUDIO_VOICE_DISPLAY ? letter : null
}

/**
 * Map the raw backend voice list down to our curated 2-voice catalogue
 * with friendly names. Voices that don't match a Studio C/B id are
 * dropped. If multiple locales advertise the same letter (e.g. en-US-
 * Studio-C and en-GB-Studio-C) the first one wins.
 */
function curateStudioVoices(raw: AudioVoice[]): AudioVoice[] {
  const out: AudioVoice[] = []
  const seen = new Set<string>()
  for (const v of raw) {
    const letter = studioLetterFromId(v.id)
    if (!letter || seen.has(letter)) continue
    seen.add(letter)
    out.push({
      id: v.id,
      friendlyName: STUDIO_VOICE_DISPLAY[letter] ?? letter,
      languageCode: v.languageCode,
      gender: v.gender,
      quality: v.quality,
    })
  }
  return out
}

function toError(e: unknown, fallback: string): AudioReaderError {
  if (e instanceof AxiosError) {
    const data = e.response?.data as
      | { message?: string; error?: string }
      | undefined
    return new AudioReaderError(
      data?.message ?? fallback,
      e.response?.status,
      data?.error,
    )
  }
  return new AudioReaderError(fallback)
}

// Voice list rarely changes; cache in-memory so panel re-mounts don't
// re-hit the network. Mirrors the mobile service's `_voiceCache`.
let voiceCache: AudioVoice[] | null = null
let voiceCacheLang: string | null = null

export async function listVoices(lang = 'en'): Promise<AudioVoice[]> {
  if (voiceCache && voiceCacheLang === lang) return voiceCache
  try {
    const res = await api.get('/audio/voices', { params: { lang } })
    const raw = Array.isArray(res.data?.voices)
      ? (res.data.voices as unknown[])
      : []
    const parsed: AudioVoice[] = raw
      .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
      .map((v) => ({
        id: String(v.id ?? ''),
        friendlyName: String(v.friendlyName ?? ''),
        languageCode: String(v.languageCode ?? ''),
        gender: String(v.gender ?? 'NEUTRAL'),
        quality: String(v.quality ?? 'neural2'),
      }))
    const curated = curateStudioVoices(parsed)
    voiceCache = curated
    voiceCacheLang = lang
    return curated
  } catch (e) {
    throw toError(e, 'Could not load voices')
  }
}

/**
 * Paragraph chunker — line-for-line port of the mobile
 * `_chunkParagraphs`. Splits on blank lines, collapses internal
 * whitespace, then breaks any paragraph over 4500 chars on sentence
 * boundaries (and last-resort on raw 4500-char windows). Kept here so
 * both `synthesize` callers and tests can import a single function.
 */
export function chunkParagraphs(pageText: string): string[] {
  const normalized = pageText.replace(/\r\n/g, '\n')
  const raw = normalized
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
  if (raw.length === 0) return []
  const limit = 4500
  const out: string[] = []
  for (const p of raw) {
    if (p.length <= limit) {
      out.push(p)
      continue
    }
    const sentences = p.split(/(?<=[.?!])\s+/)
    let buf = ''
    for (const s of sentences) {
      if (buf.length + s.length + 1 > limit) {
        if (buf.length > 0) {
          out.push(buf.trim())
          buf = ''
        }
        if (s.length > limit) {
          for (let i = 0; i < s.length; i += limit) {
            out.push(s.substring(i, Math.min(i + limit, s.length)))
          }
        } else {
          buf = s
        }
      } else {
        buf = buf.length > 0 ? `${buf} ${s}` : s
      }
    }
    if (buf.length > 0) out.push(buf.trim())
  }
  return out
}

/**
 * Synthesize a paragraph. The caller is responsible for keeping `text`
 * under 5000 chars (see `chunkParagraphs`).
 */
export async function synthesize(
  payload: SynthesizePayload,
): Promise<AudioClip> {
  try {
    const res = await api.post('/audio/synthesize', payload)
    const d = (res.data ?? {}) as Record<string, unknown>
    return {
      audioUrl: String(d.audioUrl ?? ''),
      durationMs:
        typeof d.durationMs === 'number' ? d.durationMs : Number(d.durationMs ?? 0),
      cached: d.cached === true,
    }
  } catch (e) {
    throw toError(e, 'Could not synthesize audio')
  }
}
