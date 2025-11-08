import { useSplitViewItem } from '../base'
import { useBackground } from '../../hooks'
import { useReaderSnapshot } from '../../models'
import clsx from 'clsx'
import { ComponentProps } from 'react'

interface ReaderProps extends ComponentProps<'div'> {}
const Reader = ({ className, ...props }: ReaderProps) => {
  useSplitViewItem(Reader)
  const [bg] = useBackground()
  const r = useReaderSnapshot()
  const readMode = r.focusedTab?.isBook

  return (
    <div
      className={clsx(
        'Reader flex-1 overflow-hidden',
        readMode || 'mb-12 sm:mb-0',
        bg,
        className,
      )}
      {...props}
    />
  )
}
export default Reader;
