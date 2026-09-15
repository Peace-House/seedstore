import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Upload,
  ExternalLink,
  Eye,
  Download,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  listStudyResources,
  createStudyResource,
  updateStudyResource,
  deleteStudyResource,
  uploadStudyResourcePdf,
  uploadStudyResourceThumbnail,
  resourceErrorMessage,
  ALL_STATUSES,
  STATUS_LABEL,
  SUGGESTED_MEETING_TYPES,
  MAX_PDF_BYTES,
  formatBytes,
  type StudyResource,
  type StudyResourceStatus,
} from '@/services/studyResources'

/**
 * Study Resources — meeting outlines, seminar handouts and workshop
 * material published as PDFs to the mobile app's Study Resources
 * browser.
 *
 * Layout mirrors Announcements: the page itself is a read-only table of
 * what exists, and editing happens in a modal, so the list stays
 * scannable and a form that's used occasionally doesn't permanently
 * occupy the screen.
 *
 * Each resource carries up to TWO PDFs of the same material — a
 * single-page layout for reading on a phone and a two-on-one layout for
 * printing. Both are optional (much of the back catalogue exists in
 * only one) but a PUBLISHED resource needs at least one, which the
 * server enforces and this form pre-empts.
 */

/** Rows per page — matches the other admin tables. */
const PAGE_SIZE = 20

/** `2026-01-15` → `15 Jan 2026`. Em dash when only the year is known. */
function formatDate(date: string): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: StudyResourceStatus }) {
  // Published uses the brand colour rather than a hardcoded green, so
  // the screen stays on palette with the rest of the admin.
  if (status === 'PUBLISHED')
    return <Badge className="bg-primary text-white">Published</Badge>
  if (status === 'DRAFT') return <Badge variant="outline">Draft</Badge>
  return <Badge variant="secondary">Archived</Badge>
}

/** The composer's state. Strings throughout — it's a form. */
const emptyForm = {
  id: null as string | null,
  theme: '',
  meetingType: '',
  year: String(new Date().getFullYear()),
  date: '',
  description: '',
  singlePageUrl: '',
  twoOnOnePageUrl: '',
  thumbnailUrl: '',
  /** Comma-separated in the form; split on save. */
  tags: '',
  speakers: '',
  status: 'PUBLISHED' as StudyResourceStatus,
}

type FormState = typeof emptyForm

/** Which upload slot is in flight, so only that row shows a bar. */
type UploadSlot = 'singlePageUrl' | 'twoOnOnePageUrl' | 'thumbnailUrl'

/**
 * One PDF slot: upload a file, or paste a URL if the material is
 * already hosted. The field stays editable after an upload so a wrong
 * file can be corrected without reopening the dialog.
 */
function PdfField({
  label,
  hint,
  value,
  onChange,
  onUpload,
  progress,
  disabled,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  onUpload: (file: File) => void
  progress: number | null
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-muted-foreground text-xs">{hint}</p>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Upload a PDF, or paste a URL"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={`Upload ${label}`}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
        </Button>
        {value && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Open in a new tab"
              asChild
            >
              <a href={value} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Clear"
              disabled={disabled}
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {/* These run to several MB, so a bare spinner would look stalled. */}
      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs">
            Uploading… {progress}%
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          // Reset so picking the same file twice still fires onChange.
          e.target.value = ''
        }}
      />
    </div>
  )
}

const StudyResourcesManagement = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [composerOpen, setComposerOpen] = useState(false)
  const [page, setPage] = useState(1)

  /**
   * Status filter. 'ALL' is a UI-only value — the API omits the param
   * entirely to mean "any status", and a Select can't hold undefined.
   */
  const [statusFilter, setStatusFilter] = useState<StudyResourceStatus | 'ALL'>(
    'ALL',
  )

  /** Upload progress per slot; null when that slot is idle. */
  const [uploads, setUploads] = useState<
    Partial<Record<UploadSlot, number | null>>
  >({})

  const thumbInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['study-resources', page, statusFilter],
    queryFn: () =>
      listStudyResources({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    // Keep the previous page on screen while the next loads, so paging
    // doesn't flash an empty table.
    placeholderData: (prev) => prev,
  })

  const resources = data?.resources ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const editing = Boolean(form.id)
  const uploading = Object.values(uploads).some(
    (v) => v !== null && v !== undefined,
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['study-resources'] })
  }

  /**
   * After removing a row, step back if that emptied the page —
   * otherwise the admin is left on an empty page 3 with no way back.
   */
  const invalidateAfterRemoval = () => {
    if (resources.length === 1 && page > 1) setPage(page - 1)
    invalidate()
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const openNew = () => {
    setForm({ ...emptyForm })
    setUploads({})
    setComposerOpen(true)
  }

  const openEdit = (r: StudyResource) => {
    setForm({
      id: r.id,
      theme: r.theme,
      meetingType: r.meetingType,
      year: String(r.year),
      date: r.date,
      description: r.description,
      singlePageUrl: r.singlePageUrl,
      twoOnOnePageUrl: r.twoOnOnePageUrl,
      thumbnailUrl: r.thumbnailUrl,
      tags: r.tags.join(', '),
      speakers: r.speakers.join(', '),
      status: r.status,
    })
    setUploads({})
    setComposerOpen(true)
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setForm({ ...emptyForm })
    setUploads({})
  }

  const handleError = (err: unknown) => toast.error(resourceErrorMessage(err))

  /** Upload into one slot and write the returned URL straight into it. */
  const uploadInto = async (slot: UploadSlot, file: File) => {
    setUploads((prev) => ({ ...prev, [slot]: 0 }))
    try {
      const url =
        slot === 'thumbnailUrl'
          ? await uploadStudyResourceThumbnail(file)
          : await uploadStudyResourcePdf(file, (percent) =>
              setUploads((prev) => ({ ...prev, [slot]: percent })),
            )
      set(slot, url)
      toast.success('Uploaded')
    } catch (err) {
      handleError(err)
    } finally {
      setUploads((prev) => ({ ...prev, [slot]: null }))
    }
  }

  const save = useMutation({
    mutationFn: async (status: StudyResourceStatus) => {
      const payload = {
        theme: form.theme.trim(),
        meetingType: form.meetingType.trim(),
        year: Number(form.year),
        date: form.date || null,
        description: form.description.trim() || null,
        singlePageUrl: form.singlePageUrl.trim() || null,
        twoOnOnePageUrl: form.twoOnOnePageUrl.trim() || null,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        // The server accepts a comma-separated string too, but splitting
        // here keeps the wire format the same as the mobile client's.
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        speakers: form.speakers
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        status,
      }
      return form.id
        ? updateStudyResource(form.id, payload)
        : createStudyResource(payload)
    },
    onSuccess: (_resource, status) => {
      toast.success(
        status === 'PUBLISHED'
          ? 'Resource published — it will appear in the app'
          : 'Draft saved',
      )
      closeComposer()
      // Admin listing is newest-created first, so a new row is on page 1.
      if (!editing) setPage(1)
      invalidate()
    },
    onError: handleError,
  })

  const archive = useMutation({
    mutationFn: (id: string) => deleteStudyResource(id, false),
    onSuccess: () => {
      toast.success('Archived — no longer visible in the app')
      invalidate()
    },
    onError: handleError,
  })

  const republish = useMutation({
    mutationFn: (id: string) =>
      updateStudyResource(id, { status: 'PUBLISHED' }),
    onSuccess: () => {
      toast.success('Published again')
      invalidate()
    },
    onError: handleError,
  })

  const hardDelete = useMutation({
    mutationFn: (id: string) => deleteStudyResource(id, true),
    onSuccess: () => {
      toast.success('Deleted')
      invalidateAfterRemoval()
    },
    onError: handleError,
  })

  /**
   * Client-side guard for the mistakes the admin can see coming. The
   * server validates the same things authoritatively — this just avoids
   * a pointless round trip and keeps the error next to the field.
   */
  const validationError = (status: StudyResourceStatus): string | null => {
    if (!form.theme.trim()) return 'Give the resource a title'
    if (!form.meetingType.trim()) return 'Pick or type a meeting type'
    const year = Number(form.year)
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      return 'Enter a valid year'
    }
    if (
      status === 'PUBLISHED' &&
      !form.singlePageUrl.trim() &&
      !form.twoOnOnePageUrl.trim()
    ) {
      return 'A published resource needs at least one PDF — add one, or save it as a draft'
    }
    return null
  }

  const attemptSave = (status: StudyResourceStatus) => {
    const error = validationError(status)
    if (error) {
      toast.error(error)
      return
    }
    save.mutate(status)
  }

  const busy = save.isPending || uploading

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StudyResourceStatus | 'ALL')
                // A narrower filter can have fewer pages than the
                // current one, which would render an empty table.
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground ml-auto text-sm">
              {total} {total === 1 ? 'resource' : 'resources'}
            </span>
          </div>
          <Button className="rounded-full" variant="default" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New resource
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Meeting</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>PDFs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-10 text-center"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && resources.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-10 text-center"
                    >
                      {statusFilter === 'ALL'
                        ? 'No study resources yet. Add the first one to make the feature live in the app.'
                        : `No ${STATUS_LABEL[
                            statusFilter
                          ].toLowerCase()} resources.`}
                    </TableCell>
                  </TableRow>
                )}

                {resources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{r.theme}</div>
                      {r.speakers.length > 0 && (
                        <div className="text-muted-foreground truncate text-xs">
                          {r.speakers.join(', ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.meetingType}</Badge>
                    </TableCell>
                    <TableCell>{r.year}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(r.date)}
                    </TableCell>
                    <TableCell>
                      {/* Which layouts exist, at a glance — a resource
                          with neither can't be published. */}
                      <div className="flex gap-1">
                        {r.singlePageUrl ? (
                          <Badge variant="secondary" title="Single-page PDF">
                            1-up
                          </Badge>
                        ) : null}
                        {r.twoOnOnePageUrl ? (
                          <Badge variant="secondary" title="Two-on-one PDF">
                            2-up
                          </Badge>
                        ) : null}
                        {!r.singlePageUrl && !r.twoOnOnePageUrl && (
                          <span className="text-muted-foreground text-xs">
                            none
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {r.viewCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {r.downloadCount ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {r.singlePageUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={r.singlePageUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open single-page PDF
                              </a>
                            </DropdownMenuItem>
                          )}
                          {r.twoOnOnePageUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={r.twoOnOnePageUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open two-on-one PDF
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {r.status === 'PUBLISHED' ? (
                            <DropdownMenuItem
                              onClick={() => archive.mutate(r.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => republish.mutate(r.id)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              // Hard delete is unrecoverable and the
                              // menu item sits next to Archive, so
                              // confirm before firing.
                              if (
                                window.confirm(
                                  `Permanently delete "${r.theme}"? Archiving keeps it for later instead.`,
                                )
                              ) {
                                hardDelete.mutate(r.id)
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Composer ─────────────────────────────────────────────── */}
      <Dialog
        open={composerOpen}
        onOpenChange={(open) => {
          // Don't let a click-outside discard a half-finished upload.
          if (!open && uploading) return
          if (!open) closeComposer()
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit resource' : 'New study resource'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sr-theme">Title</Label>
              <Input
                id="sr-theme"
                value={form.theme}
                onChange={(e) => set('theme', e.target.value)}
                placeholder="SAYCO 2026 Discipleship Seminar"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="sr-meeting">Meeting type</Label>
                <Input
                  id="sr-meeting"
                  value={form.meetingType}
                  onChange={(e) => set('meetingType', e.target.value)}
                  placeholder="SAYCO"
                  list="sr-meeting-types"
                />
                {/* A datalist, not a Select: the taxonomy is open —
                    server-side it's free text and the app derives its
                    filter chips from whatever is published — so a new
                    programme must be typeable without a code change. */}
                <datalist id="sr-meeting-types">
                  {SUGGESTED_MEETING_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sr-year">Year</Label>
                <Input
                  id="sr-year"
                  type="number"
                  value={form.year}
                  onChange={(e) => set('year', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sr-date">Date</Label>
                <Input
                  id="sr-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Optional — leave blank if only the year is known.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sr-description">Description</Label>
              <Textarea
                id="sr-description"
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What the material covers."
              />
            </div>

            <PdfField
              label="Single-page PDF"
              hint={`One slide per page — what most readers open on their phone. Under ${formatBytes(
                MAX_PDF_BYTES,
              )}.`}
              value={form.singlePageUrl}
              onChange={(v) => set('singlePageUrl', v)}
              onUpload={(file) => uploadInto('singlePageUrl', file)}
              progress={uploads.singlePageUrl ?? null}
              disabled={busy}
            />

            <PdfField
              label="Two-on-one PDF"
              hint={`Two slides per sheet, for printing. Optional. Under ${formatBytes(
                MAX_PDF_BYTES,
              )}.`}
              value={form.twoOnOnePageUrl}
              onChange={(v) => set('twoOnOnePageUrl', v)}
              onUpload={(file) => uploadInto('twoOnOnePageUrl', file)}
              progress={uploads.twoOnOnePageUrl ?? null}
              disabled={busy}
            />

            <div className="space-y-2">
              <Label>Cover image</Label>
              <p className="text-muted-foreground text-xs">
                Shown on the browse cards in the app. Optional.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={form.thumbnailUrl}
                  onChange={(e) => set('thumbnailUrl', e.target.value)}
                  placeholder="Upload an image, or paste a URL"
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Upload cover image"
                  disabled={busy}
                  onClick={() => thumbInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                {form.thumbnailUrl && (
                  <img
                    src={form.thumbnailUrl}
                    alt=""
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
              </div>
              {uploads.thumbnailUrl != null && <Progress value={undefined} />}
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadInto('thumbnailUrl', file)
                  e.target.value = ''
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sr-speakers">Speakers</Label>
                <Input
                  id="sr-speakers"
                  value={form.speakers}
                  onChange={(e) => set('speakers', e.target.value)}
                  placeholder="Pastor John Doe, Rev. Jane Smith"
                />
                <p className="text-muted-foreground text-xs">
                  Comma-separated.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sr-tags">Tags</Label>
                <Input
                  id="sr-tags"
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="discipleship, youth, seminar"
                />
                <p className="text-muted-foreground text-xs">
                  Comma-separated. Readers search on these.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeComposer} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => attemptSave('DRAFT')}
              disabled={busy}
            >
              Save as draft
            </Button>
            <Button
              variant="default"
              onClick={() => attemptSave('PUBLISHED')}
              disabled={busy}
            >
              {save.isPending ? 'Saving…' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StudyResourcesManagement
