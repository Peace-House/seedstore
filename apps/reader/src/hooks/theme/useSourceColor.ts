import { useCallback } from 'react'

import { useSettings } from '@flow/reader/state'

export function useSourceColor() {
  const [{ theme }, setSettings] = useSettings()

  const setSourceColor = useCallback(
    (source: string) => {
      setSettings((prev) => ({
        ...prev,
        theme: {
          ...prev.theme,
          source,
        },
      }))
    },
    [setSettings],
  )
// bg-[#8FB51C]/15
  // return { sourceColor: theme?.source ?? '#8FB51C26', setSourceColor }
  return { sourceColor: theme?.source ?? '#0ea5e9', setSourceColor }
}
