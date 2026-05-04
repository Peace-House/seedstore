import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Info, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  getAppUpdateSettings,
  getObservedVersions,
  updateAppUpdateSettings,
  type AppUpdateSettings as AppUpdateSettingsT,
  type ObservedVersions,
} from '@/services/admin'

const APP_STORE_DEFAULT =
  'https://apps.apple.com/us/app/living-seed/id6762559749'
const PLAY_STORE_DEFAULT =
  'https://play.google.com/store/apps/details?id=com.livingseed.seedapp'

const DEFAULT: AppUpdateSettingsT = {
  min_supported_version: '1.0.0',
  latest_version: '1.0.0',
  force_update: false,
  app_disabled: false,
  force_update_after: null,
  update_url_android: PLAY_STORE_DEFAULT,
  update_url_ios: APP_STORE_DEFAULT,
}

/** Compare semver-ish strings ("1.2.3"). Returns negative if a<b. */
function compareVersion(a: string, b: string): number {
  const norm = (v: string) =>
    v
      .replace(/^[vV]/, '')
      .trim()
      .split('.')
      .map((p) => parseInt(p, 10) || 0)
  const pa = norm(a)
  const pb = norm(b)
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x - y
  }
  return 0
}

/** Convert a backend ISO-8601 string (or null) to a value the
 *  `<input type="datetime-local">` element accepts. The element wants
 *  local time without a timezone suffix, so we strip the Z and
 *  millisecond fractional seconds. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/** Convert a `datetime-local` value back to ISO UTC for the backend.
 *  Always emits trailing `Z` so the mobile client doesn't get tripped
 *  up by a naive timestamp interpreted as device-local time. */
function fromLocalInputValue(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const AppUpdateSettings = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AppUpdateSettingsT>(DEFAULT)
  const [initial, setInitial] = useState<AppUpdateSettingsT>(DEFAULT)
  /** Highest app version the server has seen reported by active
   *  mobile clients via the X-App-Version header. Surfaced as hint
   *  chips next to latest_version so the admin sees what's actually
   *  running in the wild without needing build-pipeline access. */
  const [observed, setObserved] = useState<ObservedVersions | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        // Pull the saved DB config and observed versions in parallel
        // so the form has both ready as soon as it paints.
        const [data, obs] = await Promise.all([
          getAppUpdateSettings(),
          getObservedVersions().catch(() => null), // never block the form on this
        ])

        // If the saved DB value is still the schema default ("1.0.0",
        // i.e., admin has never explicitly set it) and we've actually
        // observed a higher version from a real device, prefill with
        // the higher of the two. Observed values are also offered as
        // one-click "Use this" chips below (see render).
        let prefilledLatest = data.latest_version
        if (data.latest_version === '1.0.0' && obs) {
          const candidates = [obs.ios, obs.android].filter(
            (v): v is string => !!v,
          )
          if (candidates.length > 0) {
            const highest = candidates.reduce((a, b) =>
              compareVersion(a, b) >= 0 ? a : b,
            )
            if (compareVersion(highest, data.latest_version) > 0) {
              prefilledLatest = highest
            }
          }
        }

        const next = { ...data, latest_version: prefilledLatest }
        setSettings(next)
        // `initial` keeps the original DB value so the form correctly
        // detects "dirty" if we auto-prefilled and the admin saves.
        setInitial(data)
        setObserved(obs)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Failed to load settings',
          description: 'Could not fetch app update settings.',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  /** Re-poll the observed-versions endpoint. Useful right after a new
   *  release goes out — the value updates as soon as a single device
   *  on the new version makes any authenticated API call. */
  const refreshObserved = async () => {
    setRefreshing(true)
    try {
      const obs = await getObservedVersions()
      setObserved(obs)
      toast({
        title: 'Reported versions refreshed',
        description:
          obs.ios || obs.android
            ? `iOS: ${obs.ios ?? '—'} · Android: ${obs.android ?? '—'}`
            : 'No active devices have reported a version yet.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description:
          'Could not fetch reported versions. Try again in a moment.',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initial),
    [settings, initial],
  )

  /** Validate before save. Returns null if OK, or a user-facing message
   *  describing what's wrong. We block saves rather than letting the
   *  backend reject — admins shouldn't have to read a Prisma error. */
  const validationError = useMemo<string | null>(() => {
    const semver = /^\d+\.\d+\.\d+$/
    if (!semver.test(settings.min_supported_version)) {
      return 'Minimum supported version must be in x.y.z form (e.g. 1.0.0).'
    }
    if (!semver.test(settings.latest_version)) {
      return 'Latest version must be in x.y.z form (e.g. 1.2.0).'
    }
    if (
      compareVersion(settings.latest_version, settings.min_supported_version) <
      0
    ) {
      return 'Latest version cannot be lower than the minimum supported version.'
    }
    return null
  }, [settings])

  const save = async () => {
    if (validationError) {
      toast({
        variant: 'destructive',
        title: 'Check your inputs',
        description: validationError,
      })
      return
    }
    // Extra confirmation for the kill switch — it locks every active
    // user out, so the admin should mean it.
    if (settings.app_disabled && !initial.app_disabled) {
      const ok = window.confirm(
        'Enabling the kill switch will block ALL users from using the app ' +
          'until you turn it off. Continue?',
      )
      if (!ok) return
    }
    if (settings.force_update && !initial.force_update) {
      const ok = window.confirm(
        'Enabling force-update will require ALL users on older versions ' +
          'to update before they can continue. Continue?',
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      // Store URLs are managed by the mobile client (hard-coded
      // production defaults), not the admin. Strip them from the
      // payload so we never overwrite the DB value with form state
      // that could go stale.
      const {
        update_url_android: _ignoreAndroid,
        update_url_ios: _ignoreIos,
        ...payload
      } = settings
      const updated = await updateAppUpdateSettings(payload)
      setSettings(updated)
      setInitial(updated)
      toast({
        title: 'App settings updated',
        description: 'Changes will reach clients on their next app open.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update app settings. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof AppUpdateSettingsT>(
    key: K,
    value: AppUpdateSettingsT[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Derive the headline impact statement so admins can see at a glance
  // what they're about to ship to their users.
  const impactSummary = useMemo(() => {
    if (settings.app_disabled) {
      return {
        tone: 'destructive' as const,
        title: 'Kill switch is ON',
        body: 'All users will be blocked from using the app on their next open.',
      }
    }
    if (settings.force_update) {
      return {
        tone: 'warning' as const,
        title: 'Force-update flag is ON',
        body: 'All users will be required to update on their next open.',
      }
    }
    if (
      settings.force_update_after &&
      new Date(settings.force_update_after).getTime() <= Date.now()
    ) {
      return {
        tone: 'warning' as const,
        title: 'Force-update deadline has passed',
        body: 'Users will be force-updated until you clear the deadline or bump the minimum version.',
      }
    }
    if (
      compareVersion(settings.min_supported_version, settings.latest_version) ===
      0
    ) {
      return {
        tone: 'info' as const,
        title: 'Minimum and latest versions are equal',
        body: 'Users below this version will be force-updated. Users on this version see no prompt.',
      }
    }
    return {
      tone: 'info' as const,
      title: 'Optional update only',
      body: `Users below ${settings.min_supported_version} will be force-updated; users between ${settings.min_supported_version} and ${settings.latest_version} will see an optional update prompt.`,
    }
  }, [settings])

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>App Settings</CardTitle>
        <CardDescription>
          Control mobile app version requirements, force-update behaviour,
          and the kill switch. Clients pick up changes on their next app open
          (or app resume after ~minute).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            {/* Impact preview */}
            <ImpactCallout {...impactSummary} />

            {/* Version fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min_supported_version">
                  Minimum supported version
                </Label>
                <Input
                  id="min_supported_version"
                  value={settings.min_supported_version}
                  placeholder="1.0.0"
                  onChange={(e) =>
                    update('min_supported_version', e.target.value.trim())
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Anything below this is force-updated.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="latest_version">Latest version</Label>
                  <button
                    type="button"
                    onClick={refreshObserved}
                    disabled={refreshing}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs disabled:opacity-50"
                    title="Refresh from active devices"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`}
                    />
                    {refreshing ? 'Refreshing…' : 'Refresh from devices'}
                  </button>
                </div>
                <Input
                  id="latest_version"
                  value={settings.latest_version}
                  placeholder="1.2.0"
                  onChange={(e) =>
                    update('latest_version', e.target.value.trim())
                  }
                />
                <p className="text-muted-foreground text-xs">
                  What clients should consider current. Drives the optional-update
                  prompt.
                </p>
                {/* "Use this" chips. Only show when we have observed
                    data and at least one platform version differs from
                    the form, so when admin already typed something or
                    the DB matches, the row stays out of the way. */}
                <ObservedVersionChips
                  observed={observed}
                  current={settings.latest_version}
                  onApply={(v) => update('latest_version', v)}
                />
              </div>
            </div>

            {/* Force update flag */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Force update everyone</p>
                <p className="text-muted-foreground text-sm">
                  When ON, all clients are force-updated regardless of version
                  comparison. Useful for shipping a critical fix.
                </p>
              </div>
              <Switch
                checked={settings.force_update}
                onCheckedChange={(v) => update('force_update', v)}
              />
            </div>

            {/* Deadline */}
            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="force_update_after">
                Force-update after (optional)
              </Label>
              <Input
                id="force_update_after"
                type="datetime-local"
                value={toLocalInputValue(settings.force_update_after)}
                onChange={(e) =>
                  update(
                    'force_update_after',
                    fromLocalInputValue(e.target.value),
                  )
                }
              />
              <p className="text-muted-foreground text-xs">
                After this date/time, all clients are force-updated even if their
                version would otherwise be acceptable. Stored as UTC; clear to
                disable.
              </p>
              {settings.force_update_after ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update('force_update_after', null)}
                >
                  Clear deadline
                </Button>
              ) : null}
            </div>

            {/* Kill switch */}
            <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50/50 p-4">
              <div>
                <p className="flex items-center gap-2 font-medium text-red-900">
                  <AlertTriangle className="h-4 w-4" />
                  Kill switch
                </p>
                <p className="text-sm text-red-900/80">
                  When ON, the app shows the &quot;App Unavailable&quot; screen for
                  every user. Use only for emergencies.
                </p>
              </div>
              <Switch
                checked={settings.app_disabled}
                onCheckedChange={(v) => update('app_disabled', v)}
              />
            </div>

            {validationError ? (
              <p className="text-sm text-red-600">{validationError}</p>
            ) : null}

            <div className="flex items-center gap-2">
              <Button
                onClick={save}
                disabled={saving || !dirty || !!validationError}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              {dirty && !saving ? (
                <Button
                  variant="outline"
                  onClick={() => setSettings(initial)}
                >
                  Discard
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ImpactCallout({
  tone,
  title,
  body,
}: {
  tone: 'info' | 'warning' | 'destructive'
  title: string
  body: string
}) {
  const styles =
    tone === 'destructive'
      ? 'border-red-300 bg-red-50 text-red-900'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-900'
        : 'border-blue-200 bg-blue-50 text-blue-900'
  const Icon = tone === 'destructive' || tone === 'warning' ? AlertTriangle : Info
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-90">{body}</p>
      </div>
    </div>
  )
}

/**
 * Renders an "iOS / Android: x.y.z [Use this]" row beneath the
 * latest_version field, populated from versions that real devices
 * have reported. One click applies the version into the form.
 *
 * Hides itself entirely when:
 *  - no device has reported anything yet (observed is null / empty), or
 *  - both reported versions exactly match what's already in the form.
 */
function ObservedVersionChips({
  observed,
  current,
  onApply,
}: {
  observed: ObservedVersions | null
  current: string
  onApply: (v: string) => void
}) {
  if (!observed) return null
  const { ios, android } = observed
  if (!ios && !android) return null
  const matchesAll =
    (!ios || ios === current) && (!android || android === current)
  if (matchesAll) return null

  const Chip = ({
    label,
    version,
  }: {
    label: string
    version: string | null
  }) => {
    if (!version) return null
    const isMatch = version === current
    return (
      <button
        type="button"
        onClick={() => onApply(version)}
        disabled={isMatch}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
          isMatch
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'hover:bg-accent border-border text-foreground'
        }`}
        title={
          isMatch ? 'Already matches the form' : `Use ${version} for ${label}`
        }
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{version}</span>
        {isMatch ? <span aria-hidden>✓</span> : null}
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-muted-foreground text-xs">
        Reported by devices:
      </span>
      <Chip label="iOS" version={observed.ios} />
      <Chip label="Android" version={observed.android} />
    </div>
  )
}

export default AppUpdateSettings
