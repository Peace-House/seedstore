import { PropsWithChildren, useEffect, useState } from 'react'

import { useColorScheme, useMobile, useSetAction, useAction } from '../../hooks'
import { SplitView } from '../base'

import ActivityBar from './ActivityBar'
import NavigationBar from './NavigationBar'
import Reader from './Reader'
import SideBar from './SideBar'

export const Layout = ({ children }: PropsWithChildren) => {
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
        {ready && action !== 'library' && <SideBar />}
        {ready && <Reader>{children}</Reader>}
      </SplitView>
    </div>
  )
}
