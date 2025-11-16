import React from 'react'
import clsx from 'clsx'

// Simple shimmer effect
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f3f3f3 25%, #e0e0e0 50%, #f3f3f3 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
}

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`

export const ShimmerLoader: React.FC = () => (
  <div className="shimmer-loader grid gap-6 p-6" style={{ minHeight: '80vh' }}>
    <style>{shimmerKeyframes}</style>
    {/* Header shimmer */}
    <div className="h-8 w-1/3 rounded bg-gray-200" style={shimmerStyle} />
    {/* Grid of book cards shimmer */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div
            className="rounded aspect-[9/12] w-24 md:w-32 bg-gray-200 mb-2"
            style={shimmerStyle}
          />
          <div className="h-4 w-20 rounded bg-gray-200" style={shimmerStyle} />
        </div>
      ))}
    </div>
  </div>
)

export default ShimmerLoader
