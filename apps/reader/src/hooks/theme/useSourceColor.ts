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
  // Default to a neutral blue that works well for reading
  return { sourceColor: theme?.source ?? '#6366f1', setSourceColor }
}
