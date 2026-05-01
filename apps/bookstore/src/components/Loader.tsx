import { useMemo } from 'react'

import Logo from './Logo'

const LOADER_QUOTES: readonly string[] = [
  'A room without books is like a body without a soul.',
  'The more that you read, the more things you will know.',
  'Reading gives us someplace to go when we have to stay where we are.',
  'Books are a uniquely portable magic.',
  'Today a reader, tomorrow a leader.',
  'Reading is to the mind what exercise is to the body.',
  'A book is a dream that you hold in your hand.',
  "There is more treasure in books than in all the pirate's loot on Treasure Island.",
  'The journey of a thousand miles begins with a single page.',
  'In the case of good books, the point is not to see how many of them you can get through, but how many can get through to you.',
]

function pickRandomQuote(quotes: readonly string[]): string {
  return quotes[Math.floor(Math.random() * quotes.length)]
}

export const Loader = ({ withText }: { withText?: boolean }) => {
  return <Logo withText={withText} />
}

export const PageLoader = () => {
  const quote = useMemo(() => pickRandomQuote(LOADER_QUOTES), [])

  return (
    <div className="grid h-[80vh] w-full animate-pulse place-items-center bg-transparent backdrop-blur supports-[backdrop-filter]:bg-transparent">
      <div className="flex max-w-md flex-col items-center gap-6 px-6 text-center">
        <Logo />
        <blockquote className="text-black text-lg italic leading-relaxed">
          {quote}
        </blockquote>
      </div>
    </div>
  )
}
