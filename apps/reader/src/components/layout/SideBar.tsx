import { Overlay } from '@literal-ui/core'
import clsx from 'clsx'

import { useAction, useMobile, useTranslation } from '../../hooks'
import { useSplitViewItem } from '../base'

import { viewActions } from './viewActions'

const SideBar: React.FC = () => {
  const [action, setAction] = useAction()
  const mobile = useMobile()
  const t = useTranslation()

  const { size } = useSplitViewItem(SideBar, {
    preferredSize: 240,
    minSize: 160,
    visible: !!action && !mobile,
  })

  return (
    <>
      {action && mobile && <Overlay className="!z-40" onClick={() => setAction(undefined)} />}
      <div
        className={clsx(
          'SideBar bg-surface flex flex-col',
          !action && 'hidden',
          mobile && 'fixed inset-y-0 right-0 z-50 shadow-xl',
        )}
        style={{ width: mobile ? '75%' : size }}
      >
        {viewActions.map(({ name, title, View }) => (
          <View
            key={name}
            name={t(`${name}.title`)}
            title={t(`${title}.title`)}
            className={clsx(name !== action && 'hidden')}
          />
        ))}
      </div>
    </>
  )
}
export default SideBar;
