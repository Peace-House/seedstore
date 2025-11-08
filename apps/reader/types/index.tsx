import { ComponentProps } from 'react'
import clsx from 'clsx'


export interface ActionBarProps extends ComponentProps<'ul'> {}
export function ActionBar({ className, ...props }: ActionBarProps) {
  return (
    <ul className={clsx('ActionBar flex sm:flex-col', className)} {...props} />
  )
}