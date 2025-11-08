import { ComponentProps } from 'react'
import { IconType } from 'react-icons'
import clsx from 'clsx'
import { useMobile } from '../../hooks'
import { activeClass } from '../../styles'

interface ActionButtonProps extends ComponentProps<'button'> {
  Icon: IconType
  active?: boolean
}
const ActionButton: React.FC<ActionButtonProps> = ({
  className,
  Icon,
  active,
  ...props
}) => {
  const mobile = useMobile()
  return (
    <button
      className={clsx(
        'Action relative flex h-12 w-12 flex-1 items-center justify-center sm:flex-initial',
        active ? 'text-on-surface-variant' : 'text-outline/70',
        props.disabled ? 'text-on-disabled' : 'hover:text-on-surface-variant ',
        className,
      )}
      {...props}
    >
      {active &&
        (mobile || (
          <div
            className={clsx('absolute', 'inset-y-0 left-0 w-0.5', activeClass)}
          />
        ))}
      <Icon size={28} />
    </button>
  )
}
export default ActionButton;
