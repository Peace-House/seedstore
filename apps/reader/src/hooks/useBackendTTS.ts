import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AudioClip,
  AudioReaderError,
  AudioVoice,
  chunkParagraphs,
  listVoices,
  synthesize,
} from '../services/audioReader'

/**
 * Public shape mirrors the old `useTextToSpeech` hook so `AudioReader.tsx`
 * keeps working unchanged. `TTSVoice` here wraps a backend `AudioVoice` —
 * `voiceURI` is aliased to the voice id so the existing select-by-URI
 * logic in the consumer still works.
 */
export interface TTSVoice {
  name: string
  lang: string
  voiceURI: string
  default: boolean
}

export interface TTSState {
  isSupported: boolean
  isPlaying: boolean
  isPaused: boolean
  currentText: string
  progress: number
  voices: TTSVoice[]
  selectedVoice: TTSVoice | null
  rate: number
  pitch: number
  volume: number
  currentChunkIndex: number
  totalChunks: number
}

export interface TTSControls {
  speak: (text: string, startFromChunk?: number) => void
  speakFromElement: (element: HTMLElement) => void
  pause: () => void
  resume: () => void
  stop: () => void
  setVoice: (voice: TTSVoice) => void
  setRate: (rate: number) => void
  setPitch: (pitch: number) => void
  setVolume: (volume: number) => void
  getCurrentPosition: () => { chunkIndex: number; text: string }
}

export interface BackendTTSContext {
  bookId?: number
  chapterId?: string
}

const VOICE_STORAGE_KEY = 'reader_tts_voice'

function toTTSVoice(v: AudioVoice): TTSVoice {
  return {
    name: v.friendlyName || v.id,
    lang: v.languageCode || 'en',
    voiceURI: v.id,
    default: false,
  }
}

export function useBackendTTS(
  context: BackendTTSContext = {},
): [TTSState, TTSControls] {
  const { bookId, chapterId } = context

  const [isSupported, setIsSupported] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<TTSVoice | null>(null)
  const [rate] = useState(1)
  const [pitch] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)

  // Single shared HTMLAudioElement. Created lazily on first speak() so
  // SSR / tests without `window` don't blow up.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<string[]>([])
  const chunkIdxRef = useRef(0)
  // Prefetch slot for paragraph N+1 while N plays — mirrors mobile's
  // `_nextClipFuture` / `_nextClipForGlobalIdx`.
  const prefetchRef = useRef<{
    idx: number
    promise: Promise<AudioClip>
  } | null>(null)
  const selectedVoiceRef = useRef<TTSVoice | null>(null)
  const bookIdRef = useRef<number | undefined>(bookId)
  const chapterIdRef = useRef<string | undefined>(chapterId)
  const stoppedRef = useRef(false)

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice
  }, [selectedVoice])
  useEffect(() => {
    bookIdRef.current = bookId
  }, [bookId])
  useEffect(() => {
    chapterIdRef.current = chapterId
  }, [chapterId])

  // Bootstrap: load voices + restore the saved voice id.
  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    setIsSupported(true)
    listVoices()
      .then((raw) => {
        if (cancelled) return
        const mapped = raw.map(toTTSVoice)
        setVoices(mapped)
        const savedId = localStorage.getItem(VOICE_STORAGE_KEY)
        const saved = savedId
          ? mapped.find((v) => v.voiceURI === savedId)
          : undefined
        setSelectedVoice(saved ?? mapped[0] ?? null)
      })
      .catch((e: unknown) => {
        console.error('[useBackendTTS] listVoices failed:', e)
        setIsSupported(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const ensureAudioEl = useCallback((): HTMLAudioElement | null => {
    if (typeof window === 'undefined') return null
    if (!audioRef.current) {
      const el = new Audio()
      el.preload = 'auto'
      audioRef.current = el
    }
    return audioRef.current
  }, [])

  const synthChunk = useCallback(
    (idx: number): Promise<AudioClip> | null => {
      const voice = selectedVoiceRef.current
      const text = chunksRef.current[idx]
      const bId = bookIdRef.current
      const cId = chapterIdRef.current
      if (!voice || !text || !bId || !cId) return null
      // speed=1.0 / pitch=0.0 always — speed is applied locally via
      // `playbackRate`. Keeps every paragraph hitting the same Google
      // TTS cache row regardless of user rate.
      return synthesize({
        bookId: bId,
        chapterId: cId,
        paragraphIdx: idx,
        text,
        voiceId: voice.voiceURI,
        speed: 1.0,
        pitch: 0.0,
      })
    },
    [],
  )

  const schedulePrefetch = useCallback(
    (nextIdx: number) => {
      if (nextIdx >= chunksRef.current.length) {
        prefetchRef.current = null
        return
      }
      const promise = synthChunk(nextIdx)
      if (!promise) {
        prefetchRef.current = null
        return
      }
      prefetchRef.current = {
        idx: nextIdx,
        promise: promise.catch(() => ({
          audioUrl: '',
          durationMs: 0,
          cached: false,
        })),
      }
    },
    [synthChunk],
  )

  const playChunk = useCallback(
    async (idx: number) => {
      const el = ensureAudioEl()
      if (!el) return
      if (idx >= chunksRef.current.length) {
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentChunkIndex(0)
        return
      }
      setCurrentChunkIndex(idx)

      // Prefer the prefetched clip; fall through to fresh synth if
      // the slot's empty or stale.
      let clip: AudioClip | null = null
      const pre = prefetchRef.current
      if (pre && pre.idx === idx) {
        try {
          clip = await pre.promise
          if (!clip.audioUrl) clip = null
        } catch {
          clip = null
        }
      }
      if (!clip) {
        const p = synthChunk(idx)
        if (!p) {
          setIsPlaying(false)
          return
        }
        try {
          clip = await p
        } catch (e) {
          const msg =
            e instanceof AudioReaderError ? e.message : 'Synthesis failed'
          console.error('[useBackendTTS]', msg)
          setIsPlaying(false)
          return
        }
      }
      if (stoppedRef.current || !clip || !clip.audioUrl) return
      el.src = clip.audioUrl
      el.playbackRate = rate
      el.volume = volume
      try {
        await el.play()
        setIsPlaying(true)
        setIsPaused(false)
        schedulePrefetch(idx + 1)
      } catch (e) {
        console.error('[useBackendTTS] playback failed', e)
        setIsPlaying(false)
      }
    },
    [ensureAudioEl, rate, volume, synthChunk, schedulePrefetch],
  )

  // Wire 'ended' to advance to the next chunk. Re-wired when playChunk
  // changes so the closure captures the latest refs.
  useEffect(() => {
    const el = audioRef.current ?? ensureAudioEl()
    if (!el) return
    const onEnded = () => {
      chunkIdxRef.current += 1
      void playChunk(chunkIdxRef.current)
    }
    el.addEventListener('ended', onEnded)
    return () => el.removeEventListener('ended', onEnded)
  }, [ensureAudioEl, playChunk])

  const speak = useCallback(
    (text: string, startFromChunk = 0) => {
      if (!text.trim()) return
      const chunks = chunkParagraphs(text)
      if (chunks.length === 0) return
      stoppedRef.current = false
      chunksRef.current = chunks
      const startIdx = Math.max(0, Math.min(startFromChunk, chunks.length - 1))
      chunkIdxRef.current = startIdx
      prefetchRef.current = null
      setCurrentText(text)
      setTotalChunks(chunks.length)
      setCurrentChunkIndex(startIdx)
      void playChunk(startIdx)
    },
    [playChunk],
  )

  const speakFromElement = useCallback(
    (element: HTMLElement) => {
      speak(element.innerText || element.textContent || '')
    },
    [speak],
  )

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    void el.play().then(() => setIsPaused(false))
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    const el = audioRef.current
    if (el) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    chunksRef.current = []
    chunkIdxRef.current = 0
    prefetchRef.current = null
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentChunkIndex(0)
    setTotalChunks(0)
  }, [])

  const setVoice = useCallback((voice: TTSVoice) => {
    setSelectedVoice(voice)
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, voice.voiceURI)
    } catch {
      // ignore quota / disabled storage
    }
  }, [])

  // Rate + pitch sliders are intentionally removed. Setters kept as
  // no-ops for source-level parity with the old hook's controls shape.
  // Args dropped from the lambdas to keep eslint quiet; the typed
  // signatures on `TTSControls` still enforce shape at call sites.
  const setRate = useCallback<TTSControls['setRate']>(() => {}, [])
  const setPitch = useCallback<TTSControls['setPitch']>(() => {}, [])

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clamped)
    if (audioRef.current) audioRef.current.volume = clamped
  }, [])

  const getCurrentPosition = useCallback(
    () => ({ chunkIndex: chunkIdxRef.current, text: currentText }),
    [currentText],
  )

  const progress =
    totalChunks > 0 ? Math.round((currentChunkIndex / totalChunks) * 100) : 0

  const state: TTSState = {
    isSupported,
    isPlaying,
    isPaused,
    currentText,
    progress,
    voices,
    selectedVoice,
    rate,
    pitch,
    volume,
    currentChunkIndex,
    totalChunks,
  }

  const controls: TTSControls = {
    speak,
    speakFromElement,
    pause,
    resume,
    stop,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    getCurrentPosition,
  }

  return [state, controls]
}
