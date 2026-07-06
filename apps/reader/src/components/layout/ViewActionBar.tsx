import { useRouter } from 'next/router'
import { ComponentProps } from 'react'

import { ActionBar } from 'apps/reader/types'

import { Env, useAction, useTranslation } from '../../hooks'

import ActionButton from './ActionButton'
import { viewActions } from './viewActions'

interface EnvActionBarProps extends ComponentProps<'div'> {
  env: Env
}

const ViewActionBar = ({ className, env }: EnvActionBarProps) => {
  const [action, setAction] = useAction()
  const router = useRouter()
  const t = useTranslation()

  return (
    <ActionBar className={className}>
      {viewActions
        .filter((a: { env: number }) => a.env & env)
        .map(({ name, title, Icon }: { name: string; title: string; Icon: any }) => {
          const active = action === name
          return (
            <ActionButton
              title={t(`${title}.title`)}
              Icon={Icon}
              active={active}
              onClick={() => {
                if (name === 'store') {
                  const bookstoreUrl = process.env.NEXT_PUBLIC_BOOKSTORE_URL
                  if (bookstoreUrl) {
                    window.location.href = bookstoreUrl
                  }
                  return
                }

                if (name === 'library') {
                  router.push('/library')
                  return
                }

                // If the user is currently on /library and they pick a
                // reader-only side panel (TOC, search, annotations,
                // typography, theme), the book they previously opened
                // isn't visible — it only renders on `/`. Bounce them
                // back to the reader so the chosen panel actually has
                // a book on screen next to it. The reader tab tree
                // persists across navigation, so no state is lost.
                if (router.pathname === '/library') {
                  router.push('/')
                }

                setAction(active ? undefined : (name as any))
              }}
              key={name}
            />
          )
        })}
    </ActionBar>
  )
}
export default ViewActionBar;
