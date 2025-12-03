import clsx from 'clsx'
import { useState } from 'react'
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

import { useTextToSpeech, TTSVoice } from '../hooks/useTextToSpeech'

interface AudioReaderProps {
  getText: () => string
  onClose?: () => void
  onNextPage?: () => void
  onPrevPage?: () => void
  className?: string
}

export const AudioReader: React.FC<AudioReaderProps> = ({
  getText,
  onClose,
  onNextPage,
  onPrevPage,
  className,
}) => {
  const [state, controls] = useTextToSpeech()
  const [showSettings, setShowSettings] = useState(false)

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
        controls.speak(text)
      }
    }
  }

  const handleStop = () => {
    controls.stop()
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
        <button
          onClick={() => {
            controls.stop()
            onPrevPage?.()
          }}
          className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
          title="Previous page"
        >
          <MdSkipPrevious className="w-5 h-5" />
        </button>

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
        <button
          onClick={() => {
            controls.stop()
            onNextPage?.()
          }}
          className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
          title="Next page"
        >
          <MdSkipNext className="w-5 h-5" />
        </button>

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
            <span>{state.isPlaying ? (state.isPaused ? 'Paused' : 'Playing...') : 'Ready'}</span>
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
