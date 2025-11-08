import { PropsWithChildren, useEffect, useState } from 'react'
import { useColorScheme, useMobile, useSetAction, useAction } from '../../hooks'
import { SplitView } from '../base'
import ActivityBar from './ActivityBar'
import NavigationBar from './NavigationBar'
import SideBar from './SideBar'
import Reader from './Reader'
import LibraryView from './LibraryView'

export const Layout = ({ children }: PropsWithChildren<{}>) => {
  useColorScheme()
  const [ready, setReady] = useState(false)
  const setAction = useSetAction()
  const mobile = useMobile()
  const [action] = useAction()

  useEffect(() => {
    if (mobile === undefined) return
    setAction(mobile ? undefined : 'toc')
    setReady(true)
  }, [mobile, setAction])

  return (
    <div id="layout" className="select-none">
      <SplitView>
        {mobile === false && <ActivityBar />}
        {mobile === true && <NavigationBar />}
        {ready && (action === 'library' ? null : <SideBar />)}
        {ready && (action === 'library' ? <LibraryView /> : <Reader>{children}</Reader>)}
      </SplitView>
    </div>
  )
}
