import { Env } from '../../hooks'
import { useSplitViewItem } from '../base'

import PageActionBar from './PageActionBar'
import ViewActionBar from './ViewActionBar'

const ActivityBar: React.FC = () => {
  useSplitViewItem(ActivityBar, {
    preferredSize: 48,
    minSize: 48,
    maxSize: 48,
  })
  return (
    <div className="ActivityBar flex flex-col justify-between">
      <ViewActionBar env={Env.Desktop} />
      <PageActionBar env={Env.Desktop} />
    </div>
  )
}
export default ActivityBar;
