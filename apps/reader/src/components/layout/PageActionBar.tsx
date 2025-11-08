import { useState, useMemo, ComponentProps } from 'react'
import { Env, useMobile, useTranslation } from '../../hooks'
import ActionButton from './ActionButton'
import { Settings } from '../pages'
import { RiHome6Line, RiSettings5Line } from 'react-icons/ri'
import { MdChevronLeft } from 'react-icons/md'
import { ActionBar } from 'apps/reader/types'

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
  const [action, setAction] = useState('Home')
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
        Component: Settings,
      },
    ],
    [],
  )

  return (
    <ActionBar>
      {pageActions
        .filter((a) => a.env & env)
        .map(({ name, title, Icon, Component, disabled }, i) => (
          <ActionButton
            title={t(`${title}.title`)}
            Icon={Icon}
            active={mobile ? action === name : undefined}
            disabled={disabled}
            onClick={() => {
              Component ? null : null // handle tab logic externally
              setAction(name)
            }}
            key={i}
          />
        ))}
    </ActionBar>
  )
}
export default PageActionBar;
