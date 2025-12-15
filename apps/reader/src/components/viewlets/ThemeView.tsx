import clsx from 'clsx'
import { ComponentProps } from 'react'

import { range } from '@flow/internal'
import {
  useBackground,
  useColorScheme,
  useSourceColor,
  useTranslation,
} from '@flow/reader/hooks'

import { Label } from '../Form'
import { PaneViewProps, PaneView, Pane } from '../base'

// Preset theme colors
const presetColors = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Slate', color: '#64748b' },
]

export const ThemeView: React.FC<PaneViewProps> = (props) => {
  const { setScheme } = useColorScheme()
  const { sourceColor, setSourceColor } = useSourceColor()
  const [, setBackground] = useBackground()
  const t = useTranslation('theme')

  return (
    <PaneView {...props}>
      <Pane headline={t('title')} className="space-y-4 px-5 pt-2 pb-4">
        {/* Preset Theme Colors */}
        <div>
          <Label name={t('theme_color')} />
          <div className="flex flex-wrap gap-2 mt-1">
            {presetColors.map((preset) => (
              <button
                key={preset.color}
                title={preset.name}
                className={clsx(
                  'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                  sourceColor === preset.color
                    ? 'border-on-surface ring-2 ring-offset-1'
                    : 'border-transparent'
                )}
                style={{ backgroundColor: preset.color }}
                onClick={() => setSourceColor(preset.color)}
              />
            ))}
          </div>
        </div>

        {/* Custom Color Picker */}
        <div>
          <Label name={t('custom_color')} />
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={sourceColor}
              onChange={(e) => setSourceColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border-0 p-0"
            />
            <span className="text-on-surface-variant text-xs uppercase">
              {sourceColor}
            </span>
          </div>
        </div>

        {/* Background Color Options */}
        <div>
          <Label name={t('background_color')} />
          <div className="flex gap-2 mt-1">
            {range(7)
              .filter((i) => !(i % 2))
              .map((i) => i - 1)
              .map((i) => (
                <Background
                  key={i}
                  className={i > 0 ? `bg-surface${i}` : 'bg-white'}
                  title={i < 0 ? 'White' : `Surface ${i}`}
                  onClick={() => {
                    setScheme('light')
                    setBackground(i)
                  }}
                />
              ))}
            <Background
              className="bg-[#1a1a1a]"
              title="Dark"
              onClick={() => {
                setScheme('dark')
              }}
            />
          </div>
        </div>
      </Pane>
    </PaneView>
  )
}

interface BackgroundProps extends ComponentProps<'button'> {}
const Background: React.FC<BackgroundProps> = ({ className, ...props }) => {
  return (
    <button
      className={clsx(
        'border-outline-variant h-7 w-7 rounded border transition-transform hover:scale-110 cursor-pointer',
        className
      )}
      {...props}
    />
  )
}
