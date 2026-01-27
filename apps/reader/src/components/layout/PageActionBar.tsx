import { useRouter } from 'next/router'
import { useState, useMemo, ComponentProps } from 'react'
import { MdChevronLeft } from 'react-icons/md'
import { RiHome6Line, RiSettings5Line } from 'react-icons/ri'

import { ActionBar } from 'apps/reader/types'

import { Env, useMobile, useTranslation, useSetAction } from '../../hooks'

import ActionButton from './ActionButton'

interface EnvActionBarProps extends ComponentProps<'div'> {
  env: Env
}

interface IAction {
  name: string
  title: string
  Icon: any
  env: number
}
interface IPageAction extends IAction {
  Component?: React.FC
  disabled?: boolean
}

const PageActionBar = ({ env }: EnvActionBarProps) => {
  const mobile = useMobile()
  const router = useRouter()
  const setAction = useSetAction()
  const [action, setLocalAction] = useState('Home')
  const t = useTranslation()

  const pageActions: IPageAction[] = useMemo(
    () => [
      {
        name: 'store',
        title: 'Store',
        Icon: MdChevronLeft,
        env: Env.Mobile,
      },
      {
        name: 'home',
        title: 'home',
        Icon: RiHome6Line,
        env: Env.Mobile,
      },
      {
        name: 'settings',
        title: 'settings',
        Icon: RiSettings5Line,
        env: Env.Desktop | Env.Mobile,
      },
    ],
    [],
  )

  const handleAction = (name: string) => {
    setLocalAction(name)
    
    if (name === 'store') {
      const bookstoreUrl = process.env.NEXT_PUBLIC_BOOKSTORE_URL
      if (bookstoreUrl) {
        window.location.href = bookstoreUrl
      }
      return
    }
    
    if (name === 'home') {
      router.push('/library')
      return
    }
    
    if (name === 'settings') {
      setAction('theme')
    }
  }

  return (
    <ActionBar>
      {pageActions
        .filter((a) => a.env & env)
        .map(({ name, title, Icon, disabled }, i) => (
          <ActionButton
            title={t(`${title}.title`)}
            Icon={Icon}
            active={mobile ? action === name : undefined}
            disabled={disabled}
            onClick={() => handleAction(name)}
            key={i}
          />
        ))}
    </ActionBar>
  )
}
export default PageActionBar;
