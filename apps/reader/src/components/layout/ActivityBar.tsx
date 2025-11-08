import { useSplitViewItem } from '../base'
import ViewActionBar from './ViewActionBar'
import PageActionBar from './PageActionBar'
import { Env } from '../../hooks'

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
