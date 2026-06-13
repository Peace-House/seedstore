// import { useCallback, useEffect, useRef, useState } from 'react'

// export interface TTSVoice {
//   name: string
//   lang: string
//   voiceURI: string
//   default: boolean
// }

// export interface TTSState {
//   isSupported: boolean
//   isPlaying: boolean
//   isPaused: boolean
//   currentText: string
//   progress: number // 0-100
//   voices: TTSVoice[]
//   selectedVoice: TTSVoice | null
//   rate: number // 0.5-2
//   pitch: number // 0-2
//   volume: number // 0-1
// }

// export interface TTSControls {
//   speak: (text: string) => void
//   speakFromElement: (element: HTMLElement) => void
//   pause: () => void
//   resume: () => void
//   stop: () => void
//   setVoice: (voice: TTSVoice) => void
//   setRate: (rate: number) => void
//   setPitch: (pitch: number) => void
//   setVolume: (volume: number) => void
// }

// const TTS_SETTINGS_KEY = 'reader_tts_settings'

// interface SavedTTSSettings {
//   voiceURI?: string
//   rate: number
//   pitch: number
//   volume: number
// }

// function loadSavedSettings(): SavedTTSSettings {
//   if (typeof window === 'undefined') {
//     return { rate: 1, pitch: 1, volume: 1 }
//   }
//   try {
//     const saved = localStorage.getItem(TTS_SETTINGS_KEY)
//     if (saved) {
//       return JSON.parse(saved)
//     }
//   } catch (e) {
//     // ignore
//   }
//   return { rate: 1, pitch: 1, volume: 1 }
// }

// function saveSettings(settings: SavedTTSSettings) {
//   try {
//     localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings))
//   } catch (e) {
//     // ignore
//   }
// }

// export function useTextToSpeech(): [TTSState, TTSControls] {
//   const [isSupported, setIsSupported] = useState(false)
//   const [isPlaying, setIsPlaying] = useState(false)
//   const [isPaused, setIsPaused] = useState(false)
//   const [currentText, setCurrentText] = useState('')
//   const [progress, setProgress] = useState(0)
//   const [voices, setVoices] = useState<TTSVoice[]>([])
//   const [selectedVoice, setSelectedVoice] = useState<TTSVoice | null>(null)
//   const [rate, setRateState] = useState(1)
//   const [pitch, setPitchState] = useState(1)
//   const [volume, setVolumeState] = useState(1)

//   const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
//   const textChunksRef = useRef<string[]>([])
//   const currentChunkRef = useRef(0)

//   // Initialize
//   useEffect(() => {
//     if (typeof window === 'undefined') return

//     const supported = 'speechSynthesis' in window
//     setIsSupported(supported)

//     if (!supported) return

//     // Load saved settings
//     const saved = loadSavedSettings()
//     setRateState(saved.rate)
//     setPitchState(saved.pitch)
//     setVolumeState(saved.volume)

//     // Load voices
//     const loadVoices = () => {
//       const availableVoices = speechSynthesis.getVoices()
//       const mappedVoices: TTSVoice[] = availableVoices.map((v) => ({
//         name: v.name,
//         lang: v.lang,
//         voiceURI: v.voiceURI,
//         default: v.default,
//       }))
//       setVoices(mappedVoices)

//       // Set default voice
//       if (mappedVoices.length > 0) {
//         // Try to find saved voice
//         if (saved.voiceURI) {
//           const savedVoice = mappedVoices.find((v) => v.voiceURI === saved.voiceURI)
//           if (savedVoice) {
//             setSelectedVoice(savedVoice)
//             return
//           }
//         }
//         // Fall back to default or first English voice
//         const defaultVoice = mappedVoices.find((v) => v.default)
//         const englishVoice = mappedVoices.find((v) => v.lang.startsWith('en'))
//         setSelectedVoice(defaultVoice || englishVoice || mappedVoices[0] || null)
//       }
//     }

//     // Voices may load asynchronously
//     loadVoices()
//     speechSynthesis.addEventListener('voiceschanged', loadVoices)

//     return () => {
//       speechSynthesis.removeEventListener('voiceschanged', loadVoices)
//       speechSynthesis.cancel()
//     }
//   }, [])

//   // Split text into chunks for better control and progress tracking
//   const splitTextIntoChunks = (text: string, maxLength = 200): string[] => {
//     const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
//     const chunks: string[] = []
//     let currentChunk = ''

//     for (const sentence of sentences) {
//       if (currentChunk.length + sentence.length > maxLength && currentChunk) {
//         chunks.push(currentChunk.trim())
//         currentChunk = sentence
//       } else {
//         currentChunk += ' ' + sentence
//       }
//     }

//     if (currentChunk.trim()) {
//       chunks.push(currentChunk.trim())
//     }

//     return chunks
//   }

//   const speakChunk = useCallback((text: string, onEnd?: () => void) => {
//     if (!isSupported) return

//     const utterance = new SpeechSynthesisUtterance(text)
//     utteranceRef.current = utterance

//     // Set voice
//     if (selectedVoice) {
//       const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === selectedVoice.voiceURI)
//       if (voice) {
//         utterance.voice = voice
//       }
//     }

//     utterance.rate = rate
//     utterance.pitch = pitch
//     utterance.volume = volume

//     utterance.onend = () => {
//       onEnd?.()
//     }

//     utterance.onerror = (event) => {
//       console.error('TTS error:', event.error)
//       setIsPlaying(false)
//       setIsPaused(false)
//     }

//     speechSynthesis.speak(utterance)
//   }, [isSupported, selectedVoice, rate, pitch, volume])

//   const speakNextChunk = useCallback(() => {
//     const chunks = textChunksRef.current
//     const currentIndex = currentChunkRef.current

//     if (currentIndex >= chunks.length) {
//       // Finished all chunks
//       setIsPlaying(false)
//       setIsPaused(false)
//       setProgress(100)
//       return
//     }

//     // Update progress
//     setProgress(Math.round((currentIndex / chunks.length) * 100))

//     const chunk = chunks[currentIndex]
//     if (chunk) {
//       speakChunk(chunk, () => {
//         currentChunkRef.current++
//         speakNextChunk()
//       })
//     }
//   }, [speakChunk])

//   const speak = useCallback((text: string) => {
//     if (!isSupported || !text.trim()) return

//     // Stop any current speech
//     speechSynthesis.cancel()

//     // Split text and start speaking
//     const chunks = splitTextIntoChunks(text)
//     textChunksRef.current = chunks
//     currentChunkRef.current = 0

//     setCurrentText(text)
//     setIsPlaying(true)
//     setIsPaused(false)
//     setProgress(0)

//     speakNextChunk()
//   }, [isSupported, speakNextChunk])

//   const speakFromElement = useCallback((element: HTMLElement) => {
//     const text = element.innerText || element.textContent || ''
//     speak(text)
//   }, [speak])

//   const pause = useCallback(() => {
//     if (!isSupported) return
//     speechSynthesis.pause()
//     setIsPaused(true)
//   }, [isSupported])

//   const resume = useCallback(() => {
//     if (!isSupported) return
//     speechSynthesis.resume()
//     setIsPaused(false)
//   }, [isSupported])

//   const stop = useCallback(() => {
//     if (!isSupported) return
//     speechSynthesis.cancel()
//     setIsPlaying(false)
//     setIsPaused(false)
//     setProgress(0)
//     textChunksRef.current = []
//     currentChunkRef.current = 0
//   }, [isSupported])

//   const setVoice = useCallback((voice: TTSVoice) => {
//     setSelectedVoice(voice)
//     saveSettings({ voiceURI: voice.voiceURI, rate, pitch, volume })
//   }, [rate, pitch, volume])

//   const setRate = useCallback((newRate: number) => {
//     const clampedRate = Math.max(0.5, Math.min(2, newRate))
//     setRateState(clampedRate)
//     saveSettings({ voiceURI: selectedVoice?.voiceURI, rate: clampedRate, pitch, volume })
//   }, [selectedVoice, pitch, volume])

//   const setPitch = useCallback((newPitch: number) => {
//     const clampedPitch = Math.max(0, Math.min(2, newPitch))
//     setPitchState(clampedPitch)
//     saveSettings({ voiceURI: selectedVoice?.voiceURI, rate, pitch: clampedPitch, volume })
//   }, [selectedVoice, rate, volume])

//   const setVolume = useCallback((newVolume: number) => {
//     const clampedVolume = Math.max(0, Math.min(1, newVolume))
//     setVolumeState(clampedVolume)
//     saveSettings({ voiceURI: selectedVoice?.voiceURI, rate, pitch, volume: clampedVolume })
//   }, [selectedVoice, rate, pitch])

//   const state: TTSState = {
//     isSupported,
//     isPlaying,
//     isPaused,
//     currentText,
//     progress,
//     voices,
//     selectedVoice,
//     rate,
//     pitch,
//     volume,
//   }

//   const controls: TTSControls = {
//     speak,
//     speakFromElement,
//     pause,
//     resume,
//     stop,
//     setVoice,
//     setRate,
//     setPitch,
//     setVolume,
//   }

//   return [state, controls]
// }

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
  pitch: number // 0-1.5
  volume: number // 0-1
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

const TTS_SETTINGS_KEY = 'reader_tts_settings'

// Reader-exposed voice catalogue. Trimmed to two voices (Studio-C
// and Studio-B) so the live Google TTS bill stays predictable —
// every voice in the list multiplies cache misses by 1×. Olivia (O)
// and Quinn (Q) were removed; they can be re-added here if usage
// volume drops or if you cap Studio behind a paid tier.
const STUDIO_VOICE_DISPLAY: Record<string, string> = {
  C: 'Charlotte',
  B: 'Benjamin',
}

/**
 * Inspect a SpeechSynthesisVoice name and return the Studio letter
 * (O / C / B / Q) when it matches one of our allow-listed Studio
 * voices, or `null` otherwise. The match is intentionally loose so
 * it catches variations like "Studio-O", "Studio O", "Studio_O",
 * regardless of the surrounding locale prefix (en-US, en-GB, etc).
 */
function studioLetterFromName(name: string): string | null {
  const m = /\bStudio[-_ ]?([A-Z])\b/i.exec(name)
  if (!m) return null
  const letter = m[1]?.toUpperCase() ?? ''
  return letter && letter in STUDIO_VOICE_DISPLAY ? letter : null
}

/**
 * Map the raw browser voice list down to our curated 4-voice catalogue
 * with friendly names. Voices that don't match a Studio O/C/B/Q name
 * are dropped. If multiple voices in different locales match the same
 * letter (e.g. en-US-Studio-O and en-GB-Studio-O), the first one wins.
 */
function curateStudioVoices(raw: SpeechSynthesisVoice[]): TTSVoice[] {
  const out: TTSVoice[] = []
  const seen = new Set<string>()
  for (const v of raw) {
    const letter = studioLetterFromName(v.name)
    if (!letter || seen.has(letter)) continue
    seen.add(letter)
    out.push({
      name: STUDIO_VOICE_DISPLAY[letter] ?? letter,
      lang: v.lang,
      voiceURI: v.voiceURI,
      default: v.default,
    })
  }
  return out
}

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
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const textChunksRef = useRef<string[]>([])
  const currentChunkRef = useRef(0)
  const shouldRestartRef = useRef(false)
  const settingsChangedRef = useRef(false)

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

    // Load voices.
    //
    // We pass the raw OS/browser voice list through `curateStudioVoices`,
    // which keeps only the four Studio voices (O / C / B / Q) and renames
    // them to Olivia, Charlotte, Benjamin, Quinn. This is the single
    // choke point — every consumer of the hook sees only those voices.
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices()
      const mappedVoices = curateStudioVoices(availableVoices)
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
        // Fall back to default or first English voice within the
        // curated set. If none match either, take whatever the
        // curator returned first (Olivia by alphabetical order of
        // the source list).
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

  // Apply settings changes in real-time
  useEffect(() => {
    if (isPlaying && !isPaused && settingsChangedRef.current) {
      settingsChangedRef.current = false
      shouldRestartRef.current = true
      
      // Cancel current speech and restart from current chunk
      speechSynthesis.cancel()
      
      // Small delay to ensure cancellation completes
      setTimeout(() => {
        if (shouldRestartRef.current) {
          speakNextChunk()
          shouldRestartRef.current = false
        }
      }, 100)
    }
  }, [rate, pitch, volume, selectedVoice])

  // Split text into chunks for better control and progress tracking
  const splitTextIntoChunks = (text: string, maxLength = 200): string[] => {
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
      if (!shouldRestartRef.current) {
        onEnd?.()
      }
    }

    utterance.onerror = (event) => {
      console.error('TTS error:', event.error)
      if (event.error !== 'interrupted') {
        setIsPlaying(false)
        setIsPaused(false)
      }
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
      setCurrentChunkIndex(0)
      return
    }

    // Update progress
    const progressValue = Math.round((currentIndex / chunks.length) * 100)
    setProgress(progressValue)
    setCurrentChunkIndex(currentIndex)

    const chunk = chunks[currentIndex]
    if (chunk) {
      speakChunk(chunk, () => {
        currentChunkRef.current++
        speakNextChunk()
      })
    }
  }, [speakChunk])

  const speak = useCallback((text: string, startFromChunk = 0) => {
    if (!isSupported || !text.trim()) return

    // Stop any current speech
    speechSynthesis.cancel()

    // Split text and start speaking
    const chunks = splitTextIntoChunks(text)
    textChunksRef.current = chunks
    currentChunkRef.current = Math.max(0, Math.min(startFromChunk, chunks.length - 1))

    setCurrentText(text)
    setIsPlaying(true)
    setIsPaused(false)
    setTotalChunks(chunks.length)
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
    shouldRestartRef.current = false
    speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
    setCurrentChunkIndex(0)
    textChunksRef.current = []
    currentChunkRef.current = 0
  }, [isSupported])

  const setVoice = useCallback((voice: TTSVoice) => {
    setSelectedVoice(voice)
    settingsChangedRef.current = true
    saveSettings({ voiceURI: voice.voiceURI, rate, pitch, volume })
  }, [rate, pitch, volume])

  const setRate = useCallback((newRate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2, newRate))
    setRateState(clampedRate)
    settingsChangedRef.current = true
    saveSettings({ voiceURI: selectedVoice?.voiceURI, rate: clampedRate, pitch, volume })
  }, [selectedVoice, pitch, volume])

  const setPitch = useCallback((newPitch: number) => {
    const clampedPitch = Math.max(0.5, Math.min(1.5, newPitch))
    setPitchState(clampedPitch)
    settingsChangedRef.current = true
    saveSettings({ voiceURI: selectedVoice?.voiceURI, rate, pitch: clampedPitch, volume })
  }, [selectedVoice, rate, volume])

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
    settingsChangedRef.current = true
    saveSettings({ voiceURI: selectedVoice?.voiceURI, rate, pitch, volume: clampedVolume })
  }, [selectedVoice, rate, pitch])

  const getCurrentPosition = useCallback(() => {
    return {
      chunkIndex: currentChunkRef.current,
      text: currentText,
    }
  }, [currentText])

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