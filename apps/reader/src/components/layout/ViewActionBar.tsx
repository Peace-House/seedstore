import { ComponentProps } from 'react'
import { Env, useAction, useTranslation } from '../../hooks'
import { viewActions } from './viewActions'
import ActionButton from './ActionButton'
import { ActionBar } from 'apps/reader/types'
import { useRouter } from 'next/router'

interface EnvActionBarProps extends ComponentProps<'div'> {
  env: Env
}

const ViewActionBar = ({ className, env }: EnvActionBarProps) => {
  const [action, setAction] = useAction()
  const t = useTranslation()
  const router = useRouter()

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
                 const bookstore_url = process.env.NEXT_PUBLIC_BOOKSTORE_URL
                  window.location.href = bookstore_url as string
                  return
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
