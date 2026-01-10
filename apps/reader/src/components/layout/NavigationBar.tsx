import { Overlay } from '@literal-ui/core'
import clsx from 'clsx'
import { useRecoilState } from 'recoil'

import { Env } from '../../hooks'
import { useReaderSnapshot } from '../../models'
import { navbarState } from '../../state'

import PageActionBar from './PageActionBar'
import ViewActionBar from './ViewActionBar'

const NavigationBar = () => {
  const r = useReaderSnapshot()
  const readMode = r.focusedTab?.isBook
  const [visible, setVisible] = useRecoilState(navbarState)

  return (
    <>
      {visible && (
        <Overlay
          className="!bg-transparent"
          onClick={() => setVisible(false)}
        />
      )}
      <div className="NavigationBar bg-surface border-surface-variant fixed inset-x-0 bottom-0 z-10 border-t">
        {readMode ? (
          <ViewActionBar
            env={Env.Mobile}
            className={clsx(visible || 'hidden')}
          />
        ) : (
          <PageActionBar env={Env.Mobile} />
        )}
      </div>
    </>
  )
}
export default NavigationBar;
