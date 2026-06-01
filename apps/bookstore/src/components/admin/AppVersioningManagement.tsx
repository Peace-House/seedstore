import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Megaphone,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type AppFeatureBadge,
  type WhatsNewSlide,
  createFeatureBadge,
  createWhatsNewSlide,
  deleteFeatureBadge,
  deleteWhatsNewSlide,
  listFeatureBadges,
  listWhatsNewSlides,
  updateFeatureBadge,
  updateWhatsNewSlide,
  uploadWhatsNewImage,
} from '@/services/appVersioning'
import { getAppUpdateSettings, getObservedVersions } from '@/services/admin'
import ImageInput from './communications/ImageInput'

// ─────────────────────────────────────────────────────────────────
// Catalog of mobile feature keys. Keep this in sync with the values
// passed to `_FeatureItem(featureKey: ...)` in
// seedstore-mobile/lib/common/features_popup.dart. The admin picks a
// key from this list when authoring a badge; an "Other…" escape
// hatch lets the admin type a custom key for any feature this list
// doesn't yet cover (e.g. a new entry the mobile codebase has but
// the bookstore hasn't been updated for).
//
// When a new feature is added to the mobile features popup that
// should be advertisable as "NEW", append it here.
// ─────────────────────────────────────────────────────────────────
const KNOWN_FEATURE_KEYS: Array<{ key: string; label: string }> = [
  { key: 'find_peace_house', label: 'Find Peace House' },
  { key: 'media', label: 'Media' },
  { key: 'cart', label: 'Cart' },
  { key: 'programs', label: 'Programs' },
  { key: 'my_library', label: 'My Library' },
  { key: 'manage_group_purchases', label: 'Manage group purchases' },
  { key: 'manage_lent_books', label: 'Manage lent books' },
]
const CUSTOM_KEY_SENTINEL = '__CUSTOM__'
const CUSTOM_VERSION_SENTINEL = '__CUSTOM__'
const NONE_VERSION_SENTINEL = '__NONE__'

// ─────────────────────────────────────────────────────────────────
// Version helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Enumerate every patch version from 1.0.0 up to and including the
 * supplied "latest" version. Used to seed the version dropdown so
 * the admin can pick a previous patch even if no slide or badge has
 * been authored for it yet. Example: enumeratePatchVersionsUpTo('1.0.3')
 * returns ['1.0.0', '1.0.1', '1.0.2', '1.0.3'].
 *
 * Only enumerates patches under the latest's major.minor. Older
 * minor/major versions surface separately via observed/existing
 * versions if they're actually relevant.
 */
function enumeratePatchVersionsUpTo(latest: string): string[] {
  const parts = latest.split('.').map((n) => parseInt(n, 10) || 0)
  if (parts.length < 3) return [latest]
  const [maj, min, patch] = parts
  const out: string[] = []
  for (let p = 0; p <= patch; p++) {
    out.push(`${maj}.${min}.${p}`)
  }
  return out
}

/** Crude-but-stable semver-ish comparator: highest version first. */
function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return db - da
  }
  return 0
}

/**
 * Shared hook that returns the union of:
 *   1. Versions of slides that already exist (any locale).
 *   2. The current `latest_version` from App Settings, plus every
 *      patch version from 1.0.0 up to it (so the admin can back-
 *      fill historical patches without having to remember them).
 *   3. Observed versions reported by live mobile clients
 *      (X-App-Version header on inbound requests).
 * Deduped and sorted, highest version first.
 */
const useKnownVersions = () => {
  const slidesAllQuery = useQuery({
    queryKey: ['admin', 'whats-new', 'all-versions'],
    queryFn: () => listWhatsNewSlides(),
  })
  const appSettingsQuery = useQuery({
    queryKey: ['admin', 'app-settings'],
    queryFn: getAppUpdateSettings,
  })
  const observedQuery = useQuery({
    queryKey: ['admin', 'observed-versions'],
    queryFn: getObservedVersions,
  })

  const versions = useMemo(() => {
    const set = new Set<string>()
    for (const s of slidesAllQuery.data ?? []) set.add(s.version)
    const latest = appSettingsQuery.data?.latest_version
    if (latest) {
      set.add(latest)
      for (const v of enumeratePatchVersionsUpTo(latest)) set.add(v)
    }
    const ios = observedQuery.data?.ios
    const android = observedQuery.data?.android
    if (ios) set.add(ios)
    if (android) set.add(android)
    set.delete('')
    return Array.from(set).sort(compareVersionsDesc)
  }, [
    slidesAllQuery.data,
    appSettingsQuery.data?.latest_version,
    observedQuery.data?.ios,
    observedQuery.data?.android,
  ])

  return versions
}

/**
 * Admin section for the two mobile feature-announcement systems:
 *   1. AppFeatureBadge — small "NEW" pill on items in the mobile
 *      features popup. Backend-driven so a badge can be flipped on
 *      without shipping an app update.
 *   2. AppWhatsNewSlide — carousel shown on the home screen after
 *      login. Slides are grouped by app version; the deck for the
 *      version matching `latest_version` is what mobile clients see.
 */
const AppVersioningManagement = () => {
  return (
    <div className="space-y-8">
      <FeatureBadgesSection />
      <WhatsNewSection />
    </div>
  )
}

export default AppVersioningManagement

// ─────────────────────────────────────────────────────────────────
// Feature badges
// ─────────────────────────────────────────────────────────────────

const FeatureBadgesSection = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<AppFeatureBadge | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AppFeatureBadge | null>(
    null,
  )

  const badgesQuery = useQuery({
    queryKey: ['admin', 'feature-badges'],
    queryFn: listFeatureBadges,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      updateFeatureBadge(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-badges'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to update badge'),
  })

  const deleteBadge = useMutation({
    mutationFn: (id: number) => deleteFeatureBadge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-badges'] })
      toast.success('Badge deleted')
      setConfirmDelete(null)
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to delete badge'),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            "NEW" feature badges
          </CardTitle>
          <CardDescription>
            Each badge below adds a "NEW" pill on the matching item in
            the mobile features popup. The pill clears automatically
            for each user the moment they open the feature.
          </CardDescription>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add badge
        </Button>
      </CardHeader>
      <CardContent>
        {badgesQuery.isLoading && (
          <p className="text-muted-foreground text-sm">Loading…</p>
        )}
        {badgesQuery.isError && (
          <p className="text-sm text-red-600">Couldn't load badges.</p>
        )}
        {!badgesQuery.isLoading &&
          (badgesQuery.data?.length ?? 0) === 0 && (
            <p className="text-muted-foreground text-sm">
              No badges yet. Add one to highlight a new feature.
            </p>
          )}
        {(badgesQuery.data?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="pb-2 pr-2 text-left">Feature key</th>
                  <th className="pb-2 pr-2 text-left">Since version</th>
                  <th className="pb-2 pr-2 text-left">Active</th>
                  <th className="pb-2 pr-2 text-left">Created</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {(badgesQuery.data ?? []).map((b) => (
                  <tr key={b.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2 font-mono">{b.featureKey}</td>
                    <td className="py-2 pr-2">{b.sinceVersion || '—'}</td>
                    <td className="py-2 pr-2">
                      <Switch
                        checked={b.active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: b.id, active: checked })
                        }
                      />
                    </td>
                    <td className="text-muted-foreground py-2 pr-2 text-xs">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(b)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(b)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <FeatureBadgeDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete badge?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the "{confirmDelete?.featureKey}" badge
              permanently. To temporarily retire it instead, toggle
              "Active" off — the history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDelete && deleteBadge.mutate(confirmDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

const FeatureBadgeDialog = ({
  open,
  initial,
  onClose,
}: {
  open: boolean
  initial: AppFeatureBadge | null
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  const [featureKey, setFeatureKey] = useState(initial?.featureKey ?? '')
  // `selectValue` drives the Select's bound value. When the admin
  // picks a known key it mirrors `featureKey`; when they pick
  // "Other…", it stays on the sentinel and `featureKey` becomes a
  // free-text input.
  const [selectValue, setSelectValue] = useState<string>(
    initial
      ? KNOWN_FEATURE_KEYS.some((o) => o.key === initial.featureKey)
        ? initial.featureKey
        : CUSTOM_KEY_SENTINEL
      : '',
  )
  const [sinceVersion, setSinceVersion] = useState(
    initial?.sinceVersion ?? '',
  )
  // Drives the version Select. Mirrors `sinceVersion` for known
  // values, sits on a sentinel when the admin chose "Other…" or
  // explicitly chose "None".
  const [sinceVersionSelect, setSinceVersionSelect] = useState<string>('')
  const [active, setActive] = useState(initial?.active ?? true)

  const knownVersions = useKnownVersions()

  // Reset when the dialog reopens with a different row.
  useMemo(() => {
    if (open) {
      setFeatureKey(initial?.featureKey ?? '')
      setSelectValue(
        initial
          ? KNOWN_FEATURE_KEYS.some((o) => o.key === initial.featureKey)
            ? initial.featureKey
            : CUSTOM_KEY_SENTINEL
          : '',
      )
      const v = initial?.sinceVersion ?? ''
      setSinceVersion(v)
      setSinceVersionSelect(
        v === ''
          ? NONE_VERSION_SENTINEL
          : knownVersions.includes(v)
            ? v
            : CUSTOM_VERSION_SENTINEL,
      )
      setActive(initial?.active ?? true)
    }
  }, [open, initial, knownVersions])

  // Filter out keys the admin has already created a badge for, so
  // they can't accidentally try to create two badges for the same
  // feature. Editing the same row of course shows its own key.
  const existingBadgesQuery = useQuery({
    queryKey: ['admin', 'feature-badges'],
    queryFn: listFeatureBadges,
  })
  const takenKeys = new Set(
    (existingBadgesQuery.data ?? [])
      .filter((b) => b.id !== initial?.id)
      .map((b) => b.featureKey),
  )

  const save = useMutation({
    mutationFn: async () => {
      if (initial) {
        return updateFeatureBadge(initial.id, {
          featureKey: featureKey.trim(),
          sinceVersion: sinceVersion.trim(),
          active,
        })
      }
      return createFeatureBadge({
        featureKey: featureKey.trim(),
        sinceVersion: sinceVersion.trim(),
        active,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-badges'] })
      toast.success(initial ? 'Badge updated' : 'Badge created')
      onClose()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to save badge'),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? 'Edit badge' : 'New "NEW" badge'}
          </DialogTitle>
          <DialogDescription>
            The feature key must match the value used in the mobile
            features popup (e.g. <code>find_peace_house</code>,{' '}
            <code>media</code>).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Feature *</Label>
            <Select
              value={selectValue || undefined}
              onValueChange={(v) => {
                setSelectValue(v)
                if (v === CUSTOM_KEY_SENTINEL) {
                  // Leave the existing free-text value in place if
                  // the user is editing — otherwise clear it.
                  if (
                    KNOWN_FEATURE_KEYS.some((o) => o.key === featureKey)
                  ) {
                    setFeatureKey('')
                  }
                } else {
                  setFeatureKey(v)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a feature" />
              </SelectTrigger>
              <SelectContent>
                {KNOWN_FEATURE_KEYS.filter(
                  (o) => !takenKeys.has(o.key),
                ).map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}{' '}
                    <span className="text-muted-foreground text-xs">
                      ({o.key})
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_KEY_SENTINEL}>
                  Other (type a custom key)…
                </SelectItem>
              </SelectContent>
            </Select>
            {selectValue === CUSTOM_KEY_SENTINEL && (
              <div className="mt-2">
                <Input
                  value={featureKey}
                  onChange={(e) => setFeatureKey(e.target.value)}
                  placeholder="custom_feature_key"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  The key must match the value used in the mobile
                  features popup. Use snake_case.
                </p>
              </div>
            )}
          </div>
          <div>
            <Label>Since version (optional)</Label>
            <Select
              value={sinceVersionSelect || undefined}
              onValueChange={(v) => {
                setSinceVersionSelect(v)
                if (v === NONE_VERSION_SENTINEL) {
                  setSinceVersion('')
                } else if (v === CUSTOM_VERSION_SENTINEL) {
                  if (knownVersions.includes(sinceVersion)) {
                    setSinceVersion('')
                  }
                } else {
                  setSinceVersion(v)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a version (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VERSION_SENTINEL}>
                  None
                </SelectItem>
                {knownVersions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_VERSION_SENTINEL}>
                  Other (type a custom version)…
                </SelectItem>
              </SelectContent>
            </Select>
            {sinceVersionSelect === CUSTOM_VERSION_SENTINEL && (
              <Input
                className="mt-2"
                value={sinceVersion}
                onChange={(e) => setSinceVersion(e.target.value)}
                placeholder="1.0.5"
              />
            )}
            <p className="text-muted-foreground mt-1 text-xs">
              Reference only — mobile doesn't enforce this. Useful for
              keeping track of when the badge was introduced.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="badge-active">Active</Label>
            <Switch
              id="badge-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!featureKey.trim() || save.isPending}
          >
            {save.isPending ? 'Saving…' : initial ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────
// What's New
// ─────────────────────────────────────────────────────────────────

const WhatsNewSection = () => {
  const queryClient = useQueryClient()
  const [versionFilter, setVersionFilter] = useState<string>('')
  const [editing, setEditing] = useState<WhatsNewSlide | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<WhatsNewSlide | null>(
    null,
  )

  const slidesQuery = useQuery({
    queryKey: ['admin', 'whats-new', versionFilter || 'all'],
    queryFn: () =>
      listWhatsNewSlides(
        versionFilter ? { version: versionFilter } : undefined,
      ),
  })

  // Distinct versions across the returned set, plus the active
  // filter (so the Select keeps showing the user's choice even when
  // narrowing returns one version).
  const versions = useMemo(() => {
    const set = new Set<string>()
    for (const s of slidesQuery.data ?? []) set.add(s.version)
    if (versionFilter) set.add(versionFilter)
    return Array.from(set).sort()
  }, [slidesQuery.data, versionFilter])

  const deleteSlide = useMutation({
    mutationFn: (id: number) => deleteWhatsNewSlide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whats-new'] })
      toast.success('Slide deleted')
      setConfirmDelete(null)
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to delete slide'),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            "What's New" carousel
          </CardTitle>
          <CardDescription>
            Slides are grouped by app version. The mobile app shows
            the deck whose version matches{' '}
            <strong>Latest version</strong> in App Settings. Bump that
            value at release time so devices that update from older
            builds see the carousel; devices already on that version
            (including new signups) won't.
          </CardDescription>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add slide
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-3">
          <Label className="text-muted-foreground text-xs">
            Filter by version
          </Label>
          <Select
            value={versionFilter || 'ALL'}
            onValueChange={(v) =>
              setVersionFilter(v === 'ALL' ? '' : v)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All versions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All versions</SelectItem>
              {versions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {slidesQuery.isLoading && (
          <p className="text-muted-foreground text-sm">Loading…</p>
        )}
        {slidesQuery.isError && (
          <p className="text-sm text-red-600">Couldn't load slides.</p>
        )}
        {!slidesQuery.isLoading &&
          (slidesQuery.data?.length ?? 0) === 0 && (
            <p className="text-muted-foreground text-sm">
              No slides yet for this filter. Add a slide to start
              authoring the next release's deck.
            </p>
          )}
        {(slidesQuery.data?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {(slidesQuery.data ?? []).map((s) => (
              <div
                key={s.id}
                className="flex gap-3 rounded-lg border p-3"
              >
                <div className="bg-muted flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-md">
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="text-muted-foreground h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline">{s.version}</Badge>
                    <Badge variant="outline">{s.locale}</Badge>
                    <span className="text-muted-foreground text-xs">
                      order #{s.order}
                    </span>
                  </div>
                  <div className="font-semibold">{s.title}</div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {s.body}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <WhatsNewSlideDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete slide?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes this slide from the {confirmDelete?.version}{' '}
              deck. Other locales/orders for the same version are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDelete && deleteSlide.mutate(confirmDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

const LOCALES: Array<{ value: string; label: string }> = [
  { value: 'en', label: 'English (en)' },
  { value: 'pt', label: 'Portuguese (pt)' },
  { value: 'pt-BR', label: 'Portuguese — Brazil (pt-BR)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'fr', label: 'French (fr)' },
  { value: 'sw', label: 'Swahili (sw)' },
  { value: 'yo', label: 'Yoruba (yo)' },
  { value: 'ig', label: 'Igbo (ig)' },
  { value: 'tw', label: 'Twi (tw)' },
  { value: 'zu', label: 'Zulu (zu)' },
  { value: 'ko', label: 'Korean (ko)' },
  { value: 'it', label: 'Italian (it)' },
  { value: 'zh', label: 'Chinese (zh)' },
]

const WhatsNewSlideDialog = ({
  open,
  initial,
  onClose,
}: {
  open: boolean
  initial: WhatsNewSlide | null
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  const [version, setVersion] = useState(initial?.version ?? '')
  const [versionSelect, setVersionSelect] = useState<string>('')
  const [locale, setLocale] = useState(initial?.locale ?? 'en')
  const [order, setOrder] = useState(initial?.order ?? 0)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')

  // Known versions for the dropdown: existing slide versions, the
  // current `latest_version` plus every patch from 1.0.0 up to it,
  // and any observed mobile-client versions. The admin can still
  // type a custom version via the "Other…" sentinel — useful for
  // authoring the deck for the next release before that build has
  // been observed in the wild.
  const knownVersions = useKnownVersions()

  useMemo(() => {
    if (open) {
      const v = initial?.version ?? ''
      setVersion(v)
      // If the initial version is in the known set we mirror it on
      // the Select; otherwise drop to the custom sentinel so the
      // admin can keep editing the free-text value.
      setVersionSelect(
        v && knownVersions.includes(v)
          ? v
          : v
            ? CUSTOM_VERSION_SENTINEL
            : '',
      )
      setLocale(initial?.locale ?? 'en')
      setOrder(initial?.order ?? 0)
      setTitle(initial?.title ?? '')
      setBody(initial?.body ?? '')
      setImageUrl(initial?.imageUrl ?? '')
    }
  }, [open, initial, knownVersions])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        version: version.trim(),
        locale: locale.trim() || 'en',
        order: Number.isFinite(order) ? order : 0,
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || null,
      }
      if (initial) return updateWhatsNewSlide(initial.id, payload)
      return createWhatsNewSlide(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whats-new'] })
      toast.success(initial ? 'Slide updated' : 'Slide created')
      onClose()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to save slide'),
  })

  const canSave =
    version.trim().length > 0 && title.trim().length > 0 && body.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? 'Edit slide' : 'New "What\'s New" slide'}
          </DialogTitle>
          <DialogDescription>
            One slide per (version, locale, order). The mobile carousel
            picks the locale matching the user, with English fallback.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Version *</Label>
              <Select
                value={versionSelect || undefined}
                onValueChange={(v) => {
                  setVersionSelect(v)
                  if (v === CUSTOM_VERSION_SENTINEL) {
                    // Drop the bound version when the admin chooses
                    // to type their own, unless they're editing an
                    // existing slide with an unknown version (in
                    // which case keep the value for them to edit).
                    if (knownVersions.includes(version)) {
                      setVersion('')
                    }
                  } else {
                    setVersion(v)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a version" />
                </SelectTrigger>
                <SelectContent>
                  {knownVersions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_VERSION_SENTINEL}>
                    Other (type a custom version)…
                  </SelectItem>
                </SelectContent>
              </Select>
              {versionSelect === CUSTOM_VERSION_SENTINEL && (
                <div className="mt-2">
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.6"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Use the version this deck announces. Set it to
                    match the next release you're about to ship.
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label>Order</Label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div>
            <Label>Locale</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Find Peace House"
            />
          </div>
          <div>
            <Label>Body *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Locate nearby offices and classes…"
            />
          </div>
          <div>
            <Label>Image (optional)</Label>
            <ImageInput
              value={imageUrl}
              onChange={setImageUrl}
              upload={uploadWhatsNewImage}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Paste an image link or upload a file. Image is optional —
              text-only slides render without one.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending ? 'Saving…' : initial ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
