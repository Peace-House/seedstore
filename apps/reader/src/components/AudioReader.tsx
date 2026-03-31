// import clsx from 'clsx'
// import { useState, useEffect, useRef } from 'react'
// import {
//   MdClose,
//   MdPause,
//   MdPlayArrow,
//   MdSettings,
//   MdSkipNext,
//   MdSkipPrevious,
//   MdStop,
//   MdVolumeUp,
//   MdHeadphones,
// } from 'react-icons/md'

// import { useTextToSpeech, TTSVoice } from '../hooks/useTextToSpeech'

// interface AudioReaderProps {
//   getText: () => string
//   page?: number | string
//   onPageChange?: (page: number | string) => void
//   onClose?: () => void
//   onNextPage?: () => void
//   onPrevPage?: () => void
//   className?: string
// }

// export const AudioReader: React.FC<AudioReaderProps> = ({
//   getText,
//   page,
//   onPageChange,
//   onClose,
//   onNextPage,
//   onPrevPage,
//   className,
// }) => {
//   const [state, controls] = useTextToSpeech()
//   const [showSettings, setShowSettings] = useState(false)
//   const prevTextRef = useRef<string>("")
//   const prevPageRef = useRef<number | string | undefined>(undefined)
//   const LOCALSTORAGE_KEY = 'audioReader:lastPage'

//   // Restore last page on mount
//   useEffect(() => {
//     if (page === undefined && onPageChange) {
//       const last = localStorage.getItem(LOCALSTORAGE_KEY)
//       if (last !== null) {
//         try {
//           const parsed = isNaN(Number(last)) ? last : Number(last)
//           onPageChange(parsed)
//         } catch {}
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   // Store last page on change
//   useEffect(() => {
//     if (page !== undefined) {
//       localStorage.setItem(LOCALSTORAGE_KEY, String(page))
//     }
//   }, [page])

//   // Auto-stop/restart audio if text or page changes while playing
//   useEffect(() => {
//     const currentText = getText()
//     if (
//       state.isPlaying &&
//       (currentText !== prevTextRef.current || page !== prevPageRef.current)
//     ) {
//       controls.stop()
//       if (currentText) {
//         controls.speak(currentText)
//       }
//     }
//     prevTextRef.current = currentText
//     prevPageRef.current = page
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [getText, page])

//   const handlePlayPause = () => {
//     if (state.isPlaying) {
//       if (state.isPaused) {
//         controls.resume()
//       } else {
//         controls.pause()
//       }
//     } else {
//       const text = getText()
//       if (text) {
//         controls.speak(text)
//       }
//     }
//   }

//   const handleStop = () => {
//     controls.stop()
//   }

//   if (!state.isSupported) {
//     return (
//       <div className={clsx('bg-surface-variant rounded-lg p-4 text-center', className)}>
//         <p className="text-on-surface-variant">
//           Text-to-speech is not supported in your browser.
//         </p>
//       </div>
//     )
//   }

//   return (
//     <div className={clsx('bg-surface rounded-lg shadow-lg border border-outline-variant', className)}>
//       {/* Main controls */}
//       <div className="flex items-center gap-2 p-3">
//         <MdHeadphones className="text-primary w-5 h-5" />
        
//         {/* Previous page button */}
//         <button
//           onClick={() => {
//             controls.stop()
//             onPrevPage?.()
//           }}
//           className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
//           title="Previous page"
//         >
//           <MdSkipPrevious className="w-5 h-5" />
//         </button>

//         {/* Play/Pause button */}
//         <button
//           onClick={handlePlayPause}
//           className="p-2 rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors"
//           title={state.isPlaying ? (state.isPaused ? 'Resume' : 'Pause') : 'Play'}
//         >
//           {state.isPlaying && !state.isPaused ? (
//             <MdPause className="w-6 h-6" />
//           ) : (
//             <MdPlayArrow className="w-6 h-6" />
//           )}
//         </button>

//         {/* Next page button */}
//         <button
//           onClick={() => {
//             controls.stop()
//             onNextPage?.()
//           }}
//           className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
//           title="Next page"
//         >
//           <MdSkipNext className="w-5 h-5" />
//         </button>

//         {/* Stop button */}
//         <button
//           onClick={handleStop}
//           disabled={!state.isPlaying}
//           className={clsx(
//             'p-2 rounded-full transition-colors',
//             state.isPlaying
//               ? 'bg-error/10 text-error hover:bg-error/20'
//               : 'bg-surface-variant text-on-surface-variant/50'
//           )}
//           title="Stop"
//         >
//           <MdStop className="w-5 h-5" />
//         </button>

//         {/* Progress bar */}
//         <div className="flex-1 mx-2">
//           <div className="h-1.5 bg-surface-variant rounded-full overflow-hidden">
//             <div
//               className="h-full bg-primary transition-all duration-300"
//               style={{ width: `${state.progress}%` }}
//             />
//           </div>
//           <div className="flex justify-between text-xs text-on-surface-variant mt-1">
//             <span>{state.isPlaying ? (state.isPaused ? 'Paused' : 'Playing...') : 'Ready'}</span>
//             <span>{state.progress}%</span>
//           </div>
//         </div>

//         {/* Settings toggle */}
//         <button
//           onClick={() => setShowSettings(!showSettings)}
//           className={clsx(
//             'p-2 rounded-full transition-colors',
//             showSettings
//               ? 'bg-primary/10 text-primary'
//               : 'hover:bg-surface-variant text-on-surface-variant'
//           )}
//           title="Settings"
//         >
//           <MdSettings className="w-5 h-5" />
//         </button>

//         {/* Close button */}
//         {onClose && (
//           <button
//             onClick={onClose}
//             className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
//             title="Close"
//           >
//             <MdClose className="w-5 h-5" />
//           </button>
//         )}
//       </div>

//       {/* Settings panel */}
//       {showSettings && (
//         <div className="border-t border-outline-variant p-3 space-y-4">
//           {/* Voice selection */}
//           <div>
//             <label className="block text-sm font-medium text-on-surface mb-1">
//               Voice
//             </label>
//             <select
//               value={state.selectedVoice?.voiceURI || ''}
//               onChange={(e) => {
//                 const voice = state.voices.find((v) => v.voiceURI === e.target.value)
//                 if (voice) controls.setVoice(voice)
//               }}
//               className="w-full p-2 rounded-md bg-surface-variant text-on-surface border border-outline-variant"
//             >
//               {state.voices.map((voice) => (
//                 <option key={voice.voiceURI} value={voice.voiceURI}>
//                   {voice.name} ({voice.lang})
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Speed control */}
//           <div>
//             <label className="block text-sm font-medium text-on-surface mb-1">
//               Speed: {state.rate.toFixed(1)}x
//             </label>
//             <input
//               type="range"
//               min="0.5"
//               max="2"
//               step="0.1"
//               value={state.rate}
//               onChange={(e) => controls.setRate(parseFloat(e.target.value))}
//               className="w-full accent-primary"
//             />
//             <div className="flex justify-between text-xs text-on-surface-variant">
//               <span>0.5x</span>
//               <span>1x</span>
//               <span>2x</span>
//             </div>
//           </div>

//           {/* Pitch control */}
//           <div>
//             <label className="block text-sm font-medium text-on-surface mb-1">
//               Pitch: {state.pitch.toFixed(1)}
//             </label>
//             <input
//               type="range"
//               min="0.5"
//               max="1.5"
//               step="0.1"
//               value={state.pitch}
//               onChange={(e) => controls.setPitch(parseFloat(e.target.value))}
//               className="w-full accent-primary"
//             />
//           </div>

//           {/* Volume control */}
//           <div>
//             <div className="flex items-center gap-2 mb-1">
//               <MdVolumeUp className="w-4 h-4 text-on-surface-variant" />
//               <label className="text-sm font-medium text-on-surface">
//                 Volume: {Math.round(state.volume * 100)}%
//               </label>
//             </div>
//             <input
//               type="range"
//               min="0"
//               max="1"
//               step="0.1"
//               value={state.volume}
//               onChange={(e) => controls.setVolume(parseFloat(e.target.value))}
//               className="w-full accent-primary"
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// // Floating audio button to toggle the reader
// interface AudioReaderButtonProps {
//   onClick: () => void
//   isActive?: boolean
//   className?: string
// }

// export const AudioReaderButton: React.FC<AudioReaderButtonProps> = ({
//   onClick,
//   isActive,
//   className,
// }) => {
//   return (
//     <button
//       onClick={onClick}
//       className={clsx(
//         'p-3 rounded-full shadow-lg transition-all',
//         isActive
//           ? 'bg-primary text-on-primary'
//           : 'bg-surface text-on-surface hover:bg-surface-variant',
//         className
//       )}
//       title="Listen to book"
//     >
//       <MdHeadphones className="w-6 h-6" />
//     </button>
//   )
// }

import clsx from 'clsx'
import { useState, useEffect, useRef } from 'react'
import {
  MdClose,
  MdPause,
  MdPlayArrow,
  MdSettings,
  MdSkipNext,
  MdSkipPrevious,
  MdStop,
  MdVolumeUp,
  MdHeadphones,
} from 'react-icons/md'

import { useTextToSpeech } from '../hooks/useTextToSpeech'

interface AudioReaderProps {
  getText: () => string
  page?: number | string
  onPageChange?: (page: number | string) => void
  onClose?: () => void
  onNextPage?: () => void
  onPrevPage?: () => void
  className?: string
  bookId?: string // Unique identifier for the book
  chapter?: number | string // Current chapter
}

interface ReadingPosition {
  bookId: string
  chapter: number | string
  page: number | string
  chunkIndex: number
  timestamp: number
}

const READING_POSITION_KEY = 'audioReader:readingPositions'
const LAST_PAGE_KEY = 'audioReader:lastPage'

// Save reading position to localStorage
function saveReadingPosition(position: ReadingPosition) {
  try {
    const positions = getReadingPositions()
    const index = positions.findIndex(p => 
      p.bookId === position.bookId && 
      p.chapter === position.chapter && 
      p.page === position.page
    )
    
    if (index >= 0) {
      positions[index] = position
    } else {
      positions.push(position)
    }
    
    // Keep only last 100 positions
    const trimmed = positions.slice(-100)
    localStorage.setItem(READING_POSITION_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.error('Failed to save reading position:', e)
  }
}

// Get all reading positions
function getReadingPositions(): ReadingPosition[] {
  try {
    const stored = localStorage.getItem(READING_POSITION_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    return []
  }
}

// Get reading position for specific book/chapter/page
function getReadingPosition(
  bookId: string, 
  chapter: number | string, 
  page: number | string
): ReadingPosition | null {
  const positions = getReadingPositions()
  return positions.find(p => 
    p.bookId === bookId && 
    p.chapter === chapter && 
    p.page === page
  ) || null
}

export const AudioReader: React.FC<AudioReaderProps> = ({
  getText,
  page,
  onPageChange,
  onClose,
  onNextPage,
  onPrevPage,
  className,
  bookId = 'default-book',
  chapter = 1,
}) => {
  const [state, controls] = useTextToSpeech()
  const [showSettings, setShowSettings] = useState(false)
  const prevTextRef = useRef<string>("")
  const prevPageRef = useRef<number | string | undefined>(undefined)
  const hasRestoredPosition = useRef(false)
  const savePositionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Restore last page on mount
  useEffect(() => {
    if (page === undefined && onPageChange) {
      const last = localStorage.getItem(LAST_PAGE_KEY)
      if (last !== null) {
        try {
          const parsed = isNaN(Number(last)) ? last : Number(last)
          onPageChange(parsed)
        } catch {}
      }
    }
  }, [page, onPageChange])

  // Store last page on change
  useEffect(() => {
    if (page !== undefined) {
      localStorage.setItem(LAST_PAGE_KEY, String(page))
    }
  }, [page])

  // Restore reading position when page loads
  useEffect(() => {
    if (page === undefined || hasRestoredPosition.current) return
    
    const position = getReadingPosition(bookId, chapter, page)
    if (position && position.chunkIndex > 0) {
      // Auto-resume from saved position
      const text = getText()
      if (text) {
        controls.speak(text, position.chunkIndex)
        hasRestoredPosition.current = true
      }
    }
  }, [page, bookId, chapter, getText, controls])

  // Auto-save reading position while playing
  useEffect(() => {
    if (state.isPlaying && page !== undefined) {
      // Save position every 3 seconds while playing
      if (savePositionIntervalRef.current) {
        clearInterval(savePositionIntervalRef.current)
      }
      
      savePositionIntervalRef.current = setInterval(() => {
        const position = controls.getCurrentPosition()
        saveReadingPosition({
          bookId,
          chapter,
          page,
          chunkIndex: position.chunkIndex,
          timestamp: Date.now(),
        })
      }, 3000)
      
      return () => {
        if (savePositionIntervalRef.current) {
          clearInterval(savePositionIntervalRef.current)
        }
      }
    } else {
      if (savePositionIntervalRef.current) {
        clearInterval(savePositionIntervalRef.current)
      }
    }
  }, [state.isPlaying, page, bookId, chapter, controls])

  // Save position when stopping or pausing
  useEffect(() => {
    if ((state.isPaused || !state.isPlaying) && page !== undefined) {
      const position = controls.getCurrentPosition()
      if (position.chunkIndex > 0) {
        saveReadingPosition({
          bookId,
          chapter,
          page,
          chunkIndex: position.chunkIndex,
          timestamp: Date.now(),
        })
      }
    }
  }, [state.isPaused, state.isPlaying, page, bookId, chapter, controls])

  // Auto-stop/restart audio if text or page changes while playing
  useEffect(() => {
    const currentText = getText()
    if (
      state.isPlaying &&
      (currentText !== prevTextRef.current || page !== prevPageRef.current)
    ) {
      controls.stop()
      hasRestoredPosition.current = false
      
      // Check if there's a saved position for the new page
      if (page !== undefined) {
        const position = getReadingPosition(bookId, chapter, page)
        if (position && position.chunkIndex > 0) {
          controls.speak(currentText, position.chunkIndex)
          hasRestoredPosition.current = true
        } else if (currentText) {
          controls.speak(currentText)
        }
      } else if (currentText) {
        controls.speak(currentText)
      }
    }
    prevTextRef.current = currentText
    prevPageRef.current = page
  }, [getText, page, bookId, chapter, state.isPlaying, controls])

  const handlePlayPause = () => {
    if (state.isPlaying) {
      if (state.isPaused) {
        controls.resume()
      } else {
        controls.pause()
      }
    } else {
      const text = getText()
      if (text) {
        // Check for saved position
        if (page !== undefined && !hasRestoredPosition.current) {
          const position = getReadingPosition(bookId, chapter, page)
          if (position && position.chunkIndex > 0) {
            controls.speak(text, position.chunkIndex)
            hasRestoredPosition.current = true
            return
          }
        }
        controls.speak(text)
      }
    }
  }

  const handleStop = () => {
    controls.stop()
    hasRestoredPosition.current = false
    
    // Save final position
    if (page !== undefined) {
      saveReadingPosition({
        bookId,
        chapter,
        page,
        chunkIndex: 0,
        timestamp: Date.now(),
      })
    }
  }

  const handleNextPage = () => {
    controls.stop()
    hasRestoredPosition.current = false
    onNextPage?.()
  }

  const handlePrevPage = () => {
    controls.stop()
    hasRestoredPosition.current = false
    onPrevPage?.()
  }

  if (!state.isSupported) {
    return (
      <div className={clsx('bg-surface-variant rounded-lg p-4 text-center', className)}>
        <p className="text-on-surface-variant">
          Text-to-speech is not supported in your browser.
        </p>
      </div>
    )
  }

  return (
    <div className={clsx('bg-surface rounded-lg shadow-lg border border-outline-variant', className)}>
      {/* Main controls */}
      <div className="flex items-center gap-2 p-3">
        <MdHeadphones className="text-primary w-5 h-5" />
        
        {/* Previous page button */}
        {onPrevPage && (
          <button
            onClick={handlePrevPage}
            className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
            title="Previous page"
          >
            <MdSkipPrevious className="w-5 h-5" />
          </button>
        )}

        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className="p-2 rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors"
          title={state.isPlaying ? (state.isPaused ? 'Resume' : 'Pause') : 'Play'}
        >
          {state.isPlaying && !state.isPaused ? (
            <MdPause className="w-6 h-6" />
          ) : (
            <MdPlayArrow className="w-6 h-6" />
          )}
        </button>

        {/* Next page button */}
        {onNextPage && (
          <button
            onClick={handleNextPage}
            className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
            title="Next page"
          >
            <MdSkipNext className="w-5 h-5" />
          </button>
        )}

        {/* Stop button */}
        <button
          onClick={handleStop}
          disabled={!state.isPlaying}
          className={clsx(
            'p-2 rounded-full transition-colors',
            state.isPlaying
              ? 'bg-error/10 text-error hover:bg-error/20'
              : 'bg-surface-variant text-on-surface-variant/50'
          )}
          title="Stop"
        >
          <MdStop className="w-5 h-5" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-2">
          <div className="h-1.5 bg-surface-variant rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-on-surface-variant mt-1">
            <span>
              {state.isPlaying 
                ? (state.isPaused ? 'Paused' : 'Playing...') 
                : 'Ready'}
              {state.totalChunks > 0 && (
                <span className="ml-1">
                  ({state.currentChunkIndex + 1}/{state.totalChunks})
                </span>
              )}
            </span>
            <span>{state.progress}%</span>
          </div>
        </div>

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={clsx(
            'p-2 rounded-full transition-colors',
            showSettings
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-surface-variant text-on-surface-variant'
          )}
          title="Settings"
        >
          <MdSettings className="w-5 h-5" />
        </button>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
            title="Close"
          >
            <MdClose className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border-t border-outline-variant p-3 space-y-4">
          {/* Voice selection */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Voice
            </label>
            <select
              value={state.selectedVoice?.voiceURI || ''}
              onChange={(e) => {
                const voice = state.voices.find((v) => v.voiceURI === e.target.value)
                if (voice) controls.setVoice(voice)
              }}
              className="w-full p-2 rounded-md bg-surface-variant text-on-surface border border-outline-variant"
            >
              {state.voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speed control */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Speed: {state.rate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={state.rate}
              onChange={(e) => controls.setRate(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>0.5x</span>
              <span>1x</span>
              <span>2x</span>
            </div>
          </div>

          {/* Pitch control */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Pitch: {state.pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={state.pitch}
              onChange={(e) => controls.setPitch(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>0.5</span>
              <span>1.0</span>
              <span>1.5</span>
            </div>
          </div>

          {/* Volume control */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MdVolumeUp className="w-4 h-4 text-on-surface-variant" />
              <label className="text-sm font-medium text-on-surface">
                Volume: {Math.round(state.volume * 100)}%
              </label>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={state.volume}
              onChange={(e) => controls.setVolume(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Floating audio button to toggle the reader
interface AudioReaderButtonProps {
  onClick: () => void
  isActive?: boolean
  className?: string
}

export const AudioReaderButton: React.FC<AudioReaderButtonProps> = ({
  onClick,
  isActive,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-3 rounded-full shadow-lg transition-all',
        isActive
          ? 'bg-primary text-on-primary'
          : 'bg-surface text-on-surface hover:bg-surface-variant',
        className
      )}
      title="Listen to book"
    >
      <MdHeadphones className="w-6 h-6" />
    </button>
  )
}