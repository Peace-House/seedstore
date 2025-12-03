import { useCallback, useEffect, useRef, useState } from 'react'

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
  progress: number // 0-100
  voices: TTSVoice[]
  selectedVoice: TTSVoice | null
  rate: number // 0.5-2
  pitch: number // 0-2
  volume: number // 0-1
}

export interface TTSControls {
  speak: (text: string) => void
  speakFromElement: (element: HTMLElement) => void
  pause: () => void
  resume: () => void
  stop: () => void
  setVoice: (voice: TTSVoice) => void
  setRate: (rate: number) => void
  setPitch: (pitch: number) => void
  setVolume: (volume: number) => void
}

const TTS_SETTINGS_KEY = 'reader_tts_settings'

interface SavedTTSSettings {
  voiceURI?: string
  rate: number
  pitch: number
  volume: number
}

function loadSavedSettings(): SavedTTSSettings {
  if (typeof window === 'undefined') {
    return { rate: 1, pitch: 1, volume: 1 }
  }
  try {
    const saved = localStorage.getItem(TTS_SETTINGS_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    // ignore
  }
  return { rate: 1, pitch: 1, volume: 1 }
}

function saveSettings(settings: SavedTTSSettings) {
  try {
    localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    // ignore
  }
}

export function useTextToSpeech(): [TTSState, TTSControls] {
  const [isSupported, setIsSupported] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [progress, setProgress] = useState(0)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<TTSVoice | null>(null)
  const [rate, setRateState] = useState(1)
  const [pitch, setPitchState] = useState(1)
  const [volume, setVolumeState] = useState(1)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const textChunksRef = useRef<string[]>([])
  const currentChunkRef = useRef(0)

  // Initialize
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supported = 'speechSynthesis' in window
    setIsSupported(supported)

    if (!supported) return

    // Load saved settings
    const saved = loadSavedSettings()
    setRateState(saved.rate)
    setPitchState(saved.pitch)
    setVolumeState(saved.volume)

    // Load voices
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices()
      const mappedVoices: TTSVoice[] = availableVoices.map((v) => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
        default: v.default,
      }))
      setVoices(mappedVoices)

      // Set default voice
      if (mappedVoices.length > 0) {
        // Try to find saved voice
        if (saved.voiceURI) {
          const savedVoice = mappedVoices.find((v) => v.voiceURI === saved.voiceURI)
          if (savedVoice) {
            setSelectedVoice(savedVoice)
            return
          }
        }
        // Fall back to default or first English voice
        const defaultVoice = mappedVoices.find((v) => v.default)
        const englishVoice = mappedVoices.find((v) => v.lang.startsWith('en'))
        setSelectedVoice(defaultVoice || englishVoice || mappedVoices[0] || null)
      }
    }

    // Voices may load asynchronously
    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      speechSynthesis.cancel()
    }
  }, [])

  // Split text into chunks for better control and progress tracking
  const splitTextIntoChunks = (text: string, maxLength: number = 200): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
    const chunks: string[] = []
    let currentChunk = ''

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += ' ' + sentence
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  const speakChunk = useCallback((text: string, onEnd?: () => void) => {
    if (!isSupported) return

    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance

    // Set voice
    if (selectedVoice) {
      const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === selectedVoice.voiceURI)
      if (voice) {
        utterance.voice = voice
      }
    }

    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onend = () => {
      onEnd?.()
    }

    utterance.onerror = (event) => {
      console.error('TTS error:', event.error)
      setIsPlaying(false)
      setIsPaused(false)
    }

    speechSynthesis.speak(utterance)
  }, [isSupported, selectedVoice, rate, pitch, volume])

  const speakNextChunk = useCallback(() => {
    const chunks = textChunksRef.current
    const currentIndex = currentChunkRef.current

    if (currentIndex >= chunks.length) {
      // Finished all chunks
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(100)
      return
    }

    // Update progress
    setProgress(Math.round((currentIndex / chunks.length) * 100))

    const chunk = chunks[currentIndex]
    if (chunk) {
      speakChunk(chunk, () => {
        currentChunkRef.current++
        speakNextChunk()
      })
    }
  }, [speakChunk])

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return

    // Stop any current speech
    speechSynthesis.cancel()

    // Split text and start speaking
    const chunks = splitTextIntoChunks(text)
    textChunksRef.current = chunks
    currentChunkRef.current = 0

    setCurrentText(text)
    setIsPlaying(true)
    setIsPaused(false)
    setProgress(0)

    speakNextChunk()
  }, [isSupported, speakNextChunk])

  const speakFromElement = useCallback((element: HTMLElement) => {
    const text = element.innerText || element.textContent || ''
    speak(text)
  }, [speak])

  const pause = useCallback(() => {
    if (!isSupported) return
    speechSynthesis.pause()
    setIsPaused(true)
  }, [isSupported])

  const resume = useCallback(() => {
    if (!isSupported) return
    speechSynthesis.resume()
    setIsPaused(false)
  }, [isSupported])

  const stop = useCallback(() => {
    if (!isSupported) return
    speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
    textChunksRef.current = []
    currentChunkRef.current = 0
  }, [isSupported])

  const setVoice = useCallback((voice: TTSVoice) => {
    setSelectedVoice(voice)
    saveSettings({ voiceURI: voice.voiceURI, rate, pitch, volume })
  }, [rate, pitch, volume])

  const setRate = useCallback((newRate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2, newRate))
    setRateState(clampedRate)
    saveSettings({ voiceURI: selectedVoice?.voiceURI, rate: clampedRate, pitch, volume })
  }, [selectedVoice, pitch, volume])

  const setPitch = useCallback((newPitch: number) => {
    const clampedPitch = Math.max(0, Math.min(2, newPitch))
    setPitchState(clampedPitch)
    saveSettings({ voiceURI: selectedVoice?.voiceURI, rate, pitch: clampedPitch, volume })
  }, [selectedVoice, rate, volume])

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
    saveSettings({ voiceURI: selectedVoice?.voiceURI, rate, pitch, volume: clampedVolume })
  }, [selectedVoice, rate, pitch])

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
  }

  return [state, controls]
}
