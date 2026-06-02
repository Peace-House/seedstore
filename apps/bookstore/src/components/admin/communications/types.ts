export type Channel = 'email' | 'push'

/** Imperative handle each channel composer exposes so the History tab can
 *  load a draft into it and the shell can reset it on channel switch. */
export interface ComposerHandle {
  loadDraft: (id: string) => Promise<void>
  reset: () => void
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { data?: { error?: string } } }).response?.data?.error
  ) {
    return (error as { response?: { data?: { error?: string } } }).response?.data
      ?.error as string
  }
  return fallback
}
