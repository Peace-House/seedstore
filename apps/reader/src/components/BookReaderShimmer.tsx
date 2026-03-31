import clsx from 'clsx'
import React from 'react'

// Simple shimmer effect with theme-aware colors
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`

interface BookReaderShimmerProps {
  className?: string
  background?: string
}

/**
 * Shimmer loading animation for the book reader view.
 * Shows a loading placeholder while restoring the reading position.
 * Adapts to light/dark mode using CSS classes and accepts background prop.
 */
export const BookReaderShimmer: React.FC<BookReaderShimmerProps> = ({
  className,
  background,
}) => {
  return (
    <div
      className={clsx(
        'absolute inset-0 z-30 flex flex-col items-center justify-start',
        'p-8 pt-16',
        // Use provided background class or default
        background || 'bg-gray-50 dark:bg-gray-900',
        className
      )}
    >
      <style>{shimmerKeyframes}</style>

      {/* Shimmer content container - mimics book page */}
      <div className="w-full max-w-2xl space-y-6">
        {/* Title shimmer */}
        <div
          className="h-6 w-2/5 rounded bg-gray-200/60 dark:bg-gray-700/60"
          style={{
            background:
              'linear-gradient(90deg, var(--shimmer-base, rgba(200,200,200,0.3)) 25%, var(--shimmer-highlight, rgba(180,180,180,0.5)) 50%, var(--shimmer-base, rgba(200,200,200,0.3)) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />

        {/* Paragraph shimmer lines */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-gray-200/60 dark:bg-gray-700/60"
            style={{
              width: `${85 + Math.random() * 15}%`,
              background:
                'linear-gradient(90deg, var(--shimmer-base, rgba(200,200,200,0.3)) 25%, var(--shimmer-highlight, rgba(180,180,180,0.5)) 50%, var(--shimmer-base, rgba(200,200,200,0.3)) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}

        {/* Additional paragraph */}
        <div className="pt-4 space-y-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`p2-${i}`}
              className="h-4 rounded bg-gray-200/60 dark:bg-gray-700/60"
              style={{
                width: `${80 + Math.random() * 20}%`,
                background:
                  'linear-gradient(90deg, var(--shimmer-base, rgba(200,200,200,0.3)) 25%, var(--shimmer-highlight, rgba(180,180,180,0.5)) 50%, var(--shimmer-base, rgba(200,200,200,0.3)) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: `${(i + 12) * 0.05}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Restoring your reading position...
        </p>
      </div>
    </div>
  )
}

export default BookReaderShimmer
