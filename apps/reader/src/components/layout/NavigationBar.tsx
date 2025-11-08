import { useRecoilState } from 'recoil'
import { Overlay } from '@literal-ui/core'
import clsx from 'clsx'
import { useReaderSnapshot } from '../../models'
import { navbarState } from '../../state'
import ViewActionBar from './ViewActionBar'
import PageActionBar from './PageActionBar'
import { Env } from '../../hooks'

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
