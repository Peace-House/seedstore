import { useEffect, useMemo, useState } from 'react'
import { Mail } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  listEmailSettings,
  setEmailSetting,
  type EmailSetting,
} from '@/services/admin'

/**
 * Admin tab for toggling each email type the server can send.
 *
 * The toggles are optimistic — the UI flips immediately and rolls back
 * on API failure — so admins get instant feedback even when the network
 * is sluggish. The backend's in-memory cache means the change is live
 * for the next email send the moment the PATCH returns 200.
 */
const EmailSettings = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<EmailSetting[]>([])
  /** Per-key in-flight flag so we can disable individual switches
   *  during their PATCH without locking the whole table. */
  const [pending, setPending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const data = await listEmailSettings()
        setSettings(data)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Failed to load email settings',
          description: 'Could not fetch the toggle list.',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  /** Group by category for the rendered headings. The order of
   *  categories in the result matches the order of first appearance
   *  in the list returned by the server (which itself mirrors
   *  EMAIL_TYPES order on the backend). */
  const grouped = useMemo(() => {
    const out: Array<{ category: string; items: EmailSetting[] }> = []
    const seen = new Map<string, EmailSetting[]>()
    for (const s of settings) {
      let bucket = seen.get(s.category)
      if (!bucket) {
        bucket = []
        seen.set(s.category, bucket)
        out.push({ category: s.category, items: bucket })
      }
      bucket.push(s)
    }
    return out
  }, [settings])

  const onToggle = async (key: string, next: boolean) => {
    // Optimistic flip — keep the previous value so we can roll back
    // if the server rejects the change.
    const previous = settings
    setSettings((s) =>
      s.map((row) => (row.key === key ? { ...row, enabled: next } : row)),
    )
    setPending((p) => ({ ...p, [key]: true }))

    try {
      const updated = await setEmailSetting(key, next)
      setSettings(updated)
      toast({
        title: next ? 'Email enabled' : 'Email disabled',
        description: `${
          updated.find((u) => u.key === key)?.label ?? key
        } is now ${next ? 'on' : 'off'}.`,
      })
    } catch {
      setSettings(previous)
      toast({
        variant: 'destructive',
        title: 'Could not update email setting',
        description: 'The change was reverted. Please try again.',
      })
    } finally {
      setPending((p) => {
        const { [key]: _, ...rest } = p
        return rest
      })
    }
  }

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Settings
        </CardTitle>
        <CardDescription>
          Toggle each email type the server can send. Disabled emails
          short-circuit at send time — no SMTP connection, no delivery.
          Changes apply immediately to the next email in flight.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : settings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No email types registered yet.
          </p>
        ) : (
          grouped.map(({ category, items }) => (
            <section key={category} className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {category}
              </h3>
              <div className="divide-border divide-y rounded-lg border">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      checked={item.enabled}
                      disabled={!!pending[item.key]}
                      onCheckedChange={(v) => onToggle(item.key, v)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default EmailSettings
