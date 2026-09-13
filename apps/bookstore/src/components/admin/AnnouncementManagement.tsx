import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Megaphone,
  Copy,
  Archive,
  Pencil,
  Trash2,
  Plus,
  MoreHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react'
import DateTimePicker from './DateTimePicker'
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  reuseAnnouncement,
  deleteAnnouncement,
  isScheduleClash,
  ALL_PLATFORMS,
  PLATFORM_LABEL,
  type Announcement,
  type AnnouncementPlatform,
} from '@/services/announcement'

/**
 * Announcements — the site-wide scrolling bar (mobile home + web header).
 *
 * Layout: the main page is read-only — what's live now, and the full
 * history. Composing happens in a modal so the page stays scannable and
 * the form isn't permanently occupying space that's only used
 * occasionally.
 *
 * The heavy lifting (clash validation, deriving "active", defaulting a
 * blank start to now) is server-side; this component only prevents the
 * obvious mistakes before they're sent.
 */

/** Single date for a table cell. Em dash when a draft has no window. */
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatWindow(a: Announcement): string {
  if (!a.startsAt || !a.endsAt) return 'No schedule'
  const start = new Date(a.startsAt)
  const end = new Date(a.endsAt)
  return `${start.toLocaleString()} → ${end.toLocaleString()}`
}

function StatusBadge({ a }: { a: Announcement }) {
  // Live uses the brand colour rather than a hardcoded green so the
  // whole screen stays on palette.
  if (a.isActive) return <Badge className="bg-primary text-white">Live now</Badge>
  if (a.status === 'SCHEDULED') {
    const upcoming = a.startsAt && new Date(a.startsAt).getTime() > Date.now()
    return <Badge variant="secondary">{upcoming ? 'Scheduled' : 'Ended'}</Badge>
  }
  if (a.status === 'DRAFT') return <Badge variant="outline">Draft</Badge>
  return <Badge variant="outline">Archived</Badge>
}

/** Rows per page in the admin table. */
const PAGE_SIZE = 20

const emptyForm = {
  id: '' as string | null,
  message: '',
  body: '',
  // Empty = every platform (the API treats [] as "all").
  platforms: [] as AnnouncementPlatform[],
  startsAt: '',
  endsAt: '',
}

const AnnouncementManagement = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ ...emptyForm })
  const [composerOpen, setComposerOpen] = useState(false)
  const [preview, setPreview] = useState<Announcement | null>(null)

  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', page],
    queryFn: () => listAnnouncements({ page, pageSize: PAGE_SIZE }),
    // Keep the previous page on screen while the next one loads, so
    // paging doesn't flash an empty table. (v5 form — no extra import.)
    placeholderData: (prev) => prev,
  })

  const announcements = data?.announcements ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const editing = Boolean(form.id)

  /** Refetch every page — the key prefix matches all of them. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['announcements'] })
  }

  /**
   * After removing a row, step back if that emptied the current page —
   * otherwise the admin is left staring at an empty table on page 3
   * with no obvious way back.
   */
  const invalidateAfterRemoval = () => {
    if (announcements.length === 1 && page > 1) setPage(page - 1)
    invalidate()
  }

  const openNew = () => {
    setForm({ ...emptyForm })
    setComposerOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setForm({
      id: a.id,
      message: a.message,
      body: a.body ?? '',
      platforms: a.platforms ?? [],
      startsAt: a.startsAt ?? '',
      endsAt: a.endsAt ?? '',
    })
    setComposerOpen(true)
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setForm({ ...emptyForm })
  }

  /** Shared error handling — surfaces the clash conflict specifically. */
  const handleError = (err: unknown) => {
    const clash = isScheduleClash(err)
    if (clash) {
      const w = clash.conflictsWith
      toast.error('Schedule clash', {
        description: `"${w.message}" already runs ${
          w.startsAt ? new Date(w.startsAt).toLocaleString() : '?'
        } → ${
          w.endsAt ? new Date(w.endsAt).toLocaleString() : '?'
        }. Pick a different window.`,
      })
      return
    }
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error || 'Something went wrong'
    toast.error(message)
  }

  const save = useMutation({
    mutationFn: async (status: 'DRAFT' | 'SCHEDULED') => {
      const payload = {
        message: form.message.trim(),
        body: form.body.trim() || null,
        platforms: form.platforms,
        status,
        // Blank start = publish now; the server fills in the current
        // time rather than the browser's, so clock skew can't matter.
        // Form already holds ISO (DateTimePicker emits it), so no
        // local-string conversion is needed.
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      }
      return form.id
        ? updateAnnouncement(form.id, payload)
        : createAnnouncement(payload)
    },
    onSuccess: (announcement, status) => {
      toast.success(
        status !== 'SCHEDULED'
          ? 'Draft saved'
          : announcement.isActive
            ? 'Announcement is live now'
            : 'Announcement scheduled',
      )
      closeComposer()
      // Newest sorts first, so a freshly created one lives on page 1.
      setPage(1)
      invalidate()
    },
    onError: handleError,
  })

  const reuse = useMutation({
    mutationFn: (id: string) => reuseAnnouncement(id),
    onSuccess: (copy) => {
      toast.success('Copied — set a schedule to publish it')
      // Load the copy straight into the composer so it can be published.
      setForm({
        id: copy.id,
        message: copy.message,
        body: copy.body ?? '',
        platforms: copy.platforms ?? [],
        startsAt: '',
        endsAt: '',
      })
      setComposerOpen(true)
      invalidate()
    },
    onError: handleError,
  })

  const archive = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id, false),
    onSuccess: () => {
      toast.success('Archived')
      invalidate()
    },
    onError: handleError,
  })

  const hardDelete = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id, true),
    onSuccess: () => {
      toast.success('Deleted')
      // Hard delete removes the row entirely, so the page can empty.
      invalidateAfterRemoval()
    },
    onError: handleError,
  })

  /**
   * Toggle one platform chip.
   *
   * [] means "all", so the first click has to expand that into an
   * explicit list minus the one being switched off — otherwise clicking
   * "Web" while everything is implicitly on would read as *only* web,
   * the opposite of what the admin intended. Deselecting the last one
   * collapses back to [] (all) rather than leaving an announcement
   * targeting nothing, which would be invisible everywhere.
   */
  const togglePlatform = (p: AnnouncementPlatform) => {
    setForm((prev) => {
      const current =
        prev.platforms.length === 0 ? [...ALL_PLATFORMS] : prev.platforms
      const next = current.includes(p)
        ? current.filter((x) => x !== p)
        : [...current, p]
      return {
        ...prev,
        platforms: next.length === 0 ? [] : (next as AnnouncementPlatform[]),
      }
    })
  }

  const canSave = form.message.trim().length > 0 && !save.isPending

  // Date sanity. The picker disables invalid days/times, so these are a
  // backstop for edge cases — e.g. an end date chosen first, then a
  // later start, or the clock rolling past the chosen time while the
  // modal sits open.
  const datesInverted =
    !!form.startsAt &&
    !!form.endsAt &&
    new Date(form.endsAt).getTime() <= new Date(form.startsAt).getTime()

  const endsInPast =
    !!form.endsAt && new Date(form.endsAt).getTime() <= Date.now()

  // Publishing needs an end date and a coherent window; the start is
  // optional (blank = start now).
  const canPublish = canSave && !!form.endsAt && !datesInverted && !endsInPast

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Announcements</h2>
            <p className="text-sm text-muted-foreground">
              A scrolling notice shown on the app home screen and under the
              website header. One live announcement per platform — Android,
              iOS and Web can each run a different one at the same time.
            </p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New announcement
        </Button>
      </div>

      {/* ── History ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : total === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                No announcements yet.
              </p>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> New announcement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Platform
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Start date
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      End date
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Created by
                    </TableHead>
                    {/* Narrow, right-aligned so the kebab sits flush. */}
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="max-w-[22rem]">
                        <button
                          className="text-left font-medium truncate block w-full hover:underline"
                          onClick={() => setPreview(a)}
                          title={a.message}
                        >
                          {a.message}
                        </button>
                        {a.reusedFromId && (
                          <Badge variant="outline" className="text-xs mt-1">
                            reused
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge a={a} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {/* [] = all platforms. */}
                        {a.platforms.length === 0
                          ? 'All'
                          : a.platforms
                              .map((p) => PLATFORM_LABEL[p] ?? p)
                              .join(', ')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(a.startsAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(a.endsAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {a.createdBy ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="More options"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreview(a)}>
                              <Eye className="h-4 w-4 mr-2" /> Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => reuse.mutate(a.id)}
                              disabled={reuse.isPending}
                            >
                              <Copy className="h-4 w-4 mr-2" /> Reuse
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {/* Same action, different word: pulling a
                                LIVE announcement is "take down", which
                                is what the admin is actually doing.
                                Archiving a draft or an ended one is
                                just filing it away. */}
                            {a.isActive ? (
                              <DropdownMenuItem
                                onClick={() => archive.mutate(a.id)}
                                disabled={archive.isPending}
                              >
                                <EyeOff className="h-4 w-4 mr-2" /> Take down
                              </DropdownMenuItem>
                            ) : a.status !== 'ARCHIVED' ? (
                              <DropdownMenuItem
                                onClick={() => archive.mutate(a.id)}
                                disabled={archive.isPending}
                              >
                                <Archive className="h-4 w-4 mr-2" /> Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => hardDelete.mutate(a.id)}
                                disabled={hardDelete.isPending}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                permanently
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Only worth rendering once there's more than one page. */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm px-1">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Composer modal ─────────────────────────────────────────── */}
      <Dialog
        open={composerOpen}
        onOpenChange={(o) => (o ? setComposerOpen(true) : closeComposer())}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {editing ? 'Edit announcement' : 'New announcement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="ann-message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ann-message"
                value={form.message}
                maxLength={300}
                placeholder="e.g. Annual Convention registration closes Friday"
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.message.length}/300 — this is the line that scrolls.
              </p>
            </div>

            <div>
              <Label htmlFor="ann-body">Details (optional)</Label>
              <Textarea
                id="ann-body"
                value={form.body}
                rows={4}
                placeholder="Shown in the popup when someone taps the announcement."
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>

            <div>
              <Label>Show on</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {ALL_PLATFORMS.map((p) => {
                  // [] means "all", so with nothing selected every chip
                  // reads as on — which matches what actually happens.
                  const selected =
                    form.platforms.length === 0 || form.platforms.includes(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        selected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {PLATFORM_LABEL[p]}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {form.platforms.length === 0
                  ? 'Showing on every platform.'
                  : `Only on ${form.platforms
                      .map((p) => PLATFORM_LABEL[p])
                      .join(', ')}.`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="ann-start">
                  Starts{' '}
                  <span className="font-normal text-muted-foreground">
                    — leave blank to start now
                  </span>
                </Label>
                <DateTimePicker
                  id="ann-start"
                  value={form.startsAt}
                  onChange={(iso) => setForm({ ...form, startsAt: iso })}
                  placeholder="Start immediately"
                  // Can't pick a start after the end — those days are
                  // greyed out in the calendar.
                  maxDate={form.endsAt ? new Date(form.endsAt) : undefined}
                  aria-invalid={datesInverted}
                />
              </div>
              <div>
                <Label htmlFor="ann-end">
                  Ends <span className="text-destructive">*</span>
                </Label>
                <DateTimePicker
                  id="ann-end"
                  value={form.endsAt}
                  onChange={(iso) => setForm({ ...form, endsAt: iso })}
                  placeholder="Pick an end date & time"
                  // Never before the start (or before now, whichever is
                  // later) — an expired window would publish nothing.
                  minDate={
                    form.startsAt ? new Date(form.startsAt) : new Date()
                  }
                  aria-invalid={datesInverted || endsInPast}
                />
              </div>
            </div>

            {/* `min`/`max` stop the picker offering bad values, but a
                typed-in date can still be invalid, so check explicitly. */}
            {datesInverted && (
              <p className="text-xs text-destructive">
                The end date must be after the start date.
              </p>
            )}
            {!datesInverted && endsInPast && (
              <p className="text-xs text-destructive">
                The end date is in the past — the announcement would never
                show.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Set only an end date to publish immediately. Set both to schedule
              it for later. Either way it disappears on its own at the end date
              — no need to come back and switch it off.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={closeComposer}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => save.mutate('DRAFT')}
              disabled={!canSave}
            >
              Save as draft
            </Button>
            {/* Send now vs Schedule are the same call — the server
                starts it immediately when no start date is given. The
                label just reflects what the admin actually filled in. */}
            <Button
              onClick={() => save.mutate('SCHEDULED')}
              disabled={!canPublish}
              title={
                canPublish
                  ? undefined
                  : datesInverted
                    ? 'The end date must be after the start date'
                    : endsInPast
                      ? 'The end date is in the past'
                      : 'Add a message and an end date to publish'
              }
            >
              {form.startsAt ? 'Schedule' : 'Send now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview — what users will see in the popup ─────────────── */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Announcement</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <p className="font-medium">{preview.message}</p>
              {preview.body && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {preview.body}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatWindow(preview)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AnnouncementManagement
