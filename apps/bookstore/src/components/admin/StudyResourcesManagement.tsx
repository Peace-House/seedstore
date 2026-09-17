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
  ChevronDown,
  X,
} from 'lucide-react'
import {
  listStudyResources,
  createStudyResource,
  updateStudyResource,
  deleteStudyResource,
  getStudyResourceMeta,
  uploadStudyResourcePdf,
  uploadStudyResourceThumbnail,
  resourceErrorMessage,
  ALL_STATUSES,
  STATUS_LABEL,
  SUGGESTED_PROGRAM_TYPES,
  FALLBACK_MATERIAL_TYPES,
  OTHER_MATERIAL_TYPE,
  MATERIAL_FORMATS,
  MAX_PDF_BYTES,
  formatBytes,
  type StudyResource,
  type StudyResourceStatus,
  type MaterialFormatKey,
} from '@/services/studyResources'

/**
 * Study Resources admin.
 *
 * The domain is three levels deep:
 *
 *   Programme ("SAYCO 2026")
 *     └── Material ("Issues Paper", "Bible Study", …)
 *           └── up to three format PDFs: Mobile, Tablet, Booklet
 *
 * So the composer is a programme form with a repeating list of
 * materials, each carrying its own three upload slots. A programme can
 * hold as many materials as it needs; every format is optional, but a
 * material with no file at all is rejected — it would show the reader a
 * heading with nothing under it.
 *
 * Layout mirrors Announcements: the page is a read-only table, and
 * editing happens in a modal, so the list stays scannable.
 */

/** Rows per page — matches the other admin tables. */
const PAGE_SIZE = 20

function StatusBadge({ status }: { status: StudyResourceStatus }) {
  // Published uses the brand colour rather than a hardcoded green, so
  // the screen stays on palette with the rest of the admin.
  if (status === 'PUBLISHED')
    return <Badge className="bg-primary text-white">Published</Badge>
  if (status === 'DRAFT') return <Badge variant="outline">Draft</Badge>
  return <Badge variant="secondary">Archived</Badge>
}

/** A material as the form holds it. Strings throughout — it's a form. */
interface MaterialDraft {
  type: string
  /** Free text when `type` is "Other"; ignored otherwise. */
  customType: string
  title: string
  mobileUrl: string
  tabletUrl: string
  bookletUrl: string
}

function emptyMaterial(): MaterialDraft {
  return {
    type: '',
    customType: '',
    title: '',
    mobileUrl: '',
    tabletUrl: '',
    bookletUrl: '',
  }
}

/** Resolve what actually gets saved as the material's type. */
function resolvedType(m: MaterialDraft): string {
  return (m.type === OTHER_MATERIAL_TYPE ? m.customType : m.type).trim()
}

function materialHasFile(m: MaterialDraft): boolean {
  return Boolean(
    m.mobileUrl.trim() || m.tabletUrl.trim() || m.bookletUrl.trim(),
  )
}

function materialCardLabel(m: MaterialDraft, index: number): string {
  const type = resolvedType(m) || `Material ${index + 1}`
  const title = m.title.trim()
  return title ? `${type} - ${title}` : type
}

const emptyForm = {
  id: null as string | null,
  theme: '',
  programType: '',
  year: String(new Date().getFullYear()),
  description: '',
  thumbnailUrl: '',
  /** Comma-separated in the form; split on save. */
  tags: '',
  status: 'PUBLISHED' as StudyResourceStatus,
  materials: [emptyMaterial()] as MaterialDraft[],
}

type FormState = typeof emptyForm

/**
 * Upload slots are keyed per material AND per format, so two uploads in
 * flight at once each show their own progress bar.
 */
type UploadKey = `${number}:${MaterialFormatKey}` | 'thumbnail'

/** One format slot: upload a PDF, or paste a URL if already hosted. */
function FormatSlot({
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
  const hasValue = Boolean(value.trim())

  return (
    <div
      className={`bg-background space-y-2 rounded-lg border ${
        hasValue ? 'border-primary' : ''
      } p-3 `}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">{label}</Label>
          <p className="text-muted-foreground mt-0.5 text-[11px]">{hint}</p>
        </div>
        <Badge variant={hasValue ? 'secondary' : 'outline'}>
          {hasValue ? 'Uploaded' : progress !== null ? 'Uploading...' : null}
        </Badge>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="hover:bg-muted/40 flex w-full items-center justify-between rounded-md border border-dashed px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <Upload className="text-primary h-4 w-4" />
          <span className="text-[11px] font-medium">
            {hasValue ? 'Replace PDF' : 'Upload PDF'}
          </span>
        </div>
        <span className="text-muted-foreground text-[11px]">Choose file</span>
      </button>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste a PDF link"
        disabled={disabled}
        className="h-8 text-xs placeholder:text-xs"
      />

      <div className="flex justify-end gap-1.5">
        <Button
          type="button"
          variant="destructive"
          className="h-8 w-full shrink-0 rounded-full"
          title="Clear"
          disabled={disabled || !hasValue}
          onClick={() => onChange('')}
        >
          Clear
        </Button>
      </div>

      {/* These run to several MB, so a bare spinner would look stalled. */}
      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-muted-foreground text-[11px]">
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
  const [openMaterialIndex, setOpenMaterialIndex] = useState(0)

  /**
   * Status filter. 'ALL' is a UI-only value — the API omits the param
   * entirely to mean "any status", and a Select can't hold undefined.
   */
  const [statusFilter, setStatusFilter] = useState<StudyResourceStatus | 'ALL'>(
    'ALL',
  )

  /** Upload progress per slot; null when idle. */
  const [uploads, setUploads] = useState<
    Partial<Record<UploadKey, number | null>>
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

  // Material-type suggestions come from the API so the dropdown can
  // never drift from what the server considers standard.
  const { data: meta } = useQuery({
    queryKey: ['study-resources-meta'],
    queryFn: getStudyResourceMeta,
  })
  const materialTypeOptions = meta?.suggestedMaterialTypes?.length
    ? meta.suggestedMaterialTypes
    : FALLBACK_MATERIAL_TYPES

  const resources = data?.resources ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const editing = Boolean(form.id)
  const uploading = Object.values(uploads).some((v) => v != null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['study-resources'] })
    queryClient.invalidateQueries({ queryKey: ['study-resources-meta'] })
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

  const setMaterial = (index: number, patch: Partial<MaterialDraft>) =>
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.map((m, i) =>
        i === index ? { ...m, ...patch } : m,
      ),
    }))

  const addMaterial = () =>
    setForm((prev) => {
      const next = [...prev.materials, emptyMaterial()]
      setOpenMaterialIndex(next.length - 1)
      return {
        ...prev,
        materials: next,
      }
    })

  const removeMaterial = (index: number) =>
    setForm((prev) => {
      // Always leave one row: an empty repeater gives the admin nothing
      // to click, and a programme needs a material anyway.
      const next =
        prev.materials.length === 1
          ? [emptyMaterial()]
          : prev.materials.filter((_, i) => i !== index)

      setOpenMaterialIndex((current) => {
        if (next.length === 0) return 0
        if (current > index) return current - 1
        if (current === index) return Math.max(0, index - 1)
        return Math.min(current, next.length - 1)
      })

      return {
        ...prev,
        materials: next,
      }
    })

  const openNew = () => {
    setForm({ ...emptyForm, materials: [emptyMaterial()] })
    setOpenMaterialIndex(0)
    setUploads({})
    setComposerOpen(true)
  }

  const openEdit = (r: StudyResource) => {
    setForm({
      id: r.id,
      theme: r.theme,
      programType: r.programType,
      year: String(r.year),
      description: r.description,
      thumbnailUrl: r.thumbnailUrl,
      tags: r.tags.join(', '),
      status: r.status,
      materials:
        r.materials.length > 0
          ? r.materials.map((m) => ({
              // A stored type that isn't one of the suggestions was
              // typed by hand, so reopen it in the "Other" slot rather
              // than silently losing it to an unmatched dropdown.
              type: materialTypeOptions.includes(m.type)
                ? m.type
                : OTHER_MATERIAL_TYPE,
              customType: materialTypeOptions.includes(m.type) ? '' : m.type,
              title: m.title,
              mobileUrl: m.mobileUrl,
              tabletUrl: m.tabletUrl,
              bookletUrl: m.bookletUrl,
            }))
          : [emptyMaterial()],
    })
    setOpenMaterialIndex(0)
    setUploads({})
    setComposerOpen(true)
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setForm({ ...emptyForm, materials: [emptyMaterial()] })
    setOpenMaterialIndex(0)
    setUploads({})
  }

  const handleError = (err: unknown) => toast.error(resourceErrorMessage(err))

  /** Upload into one material's format slot. */
  const uploadFormat = async (
    index: number,
    slot: MaterialFormatKey,
    file: File,
  ) => {
    const key: UploadKey = `${index}:${slot}`
    setUploads((prev) => ({ ...prev, [key]: 0 }))
    try {
      const url = await uploadStudyResourcePdf(file, (percent) =>
        setUploads((prev) => ({ ...prev, [key]: percent })),
      )
      setMaterial(index, { [slot]: url } as Partial<MaterialDraft>)
      toast.success('Uploaded')
    } catch (err) {
      handleError(err)
    } finally {
      setUploads((prev) => ({ ...prev, [key]: null }))
    }
  }

  const uploadThumbnail = async (file: File) => {
    setUploads((prev) => ({ ...prev, thumbnail: 0 }))
    try {
      const url = await uploadStudyResourceThumbnail(file)
      set('thumbnailUrl', url)
      toast.success('Uploaded')
    } catch (err) {
      handleError(err)
    } finally {
      setUploads((prev) => ({ ...prev, thumbnail: null }))
    }
  }

  const save = useMutation({
    mutationFn: async (status: StudyResourceStatus) => {
      const payload = {
        theme: form.theme.trim(),
        programType: form.programType.trim(),
        year: Number(form.year),
        description: form.description.trim() || null,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        status,
        // Drop rows the admin added but never filled in, so an
        // accidental "Add material" click doesn't block saving.
        materials: form.materials
          .filter((m) => resolvedType(m) && materialHasFile(m))
          .map((m, i) => ({
            type: resolvedType(m),
            title: m.title.trim() || null,
            mobileUrl: m.mobileUrl.trim() || null,
            tabletUrl: m.tabletUrl.trim() || null,
            bookletUrl: m.bookletUrl.trim() || null,
            sortOrder: i,
          })),
      }
      return form.id
        ? updateStudyResource(form.id, payload)
        : createStudyResource(payload)
    },
    onSuccess: (_resource, status) => {
      toast.success(
        status === 'PUBLISHED'
          ? 'Programme published — it will appear in the app'
          : 'Draft saved',
      )
      closeComposer()
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
   * Client-side guard for mistakes the admin can see coming. The server
   * validates the same things authoritatively — this just avoids a
   * pointless round trip and keeps the error next to the field.
   */
  const validationError = (status: StudyResourceStatus): string | null => {
    if (!form.theme.trim()) return 'Give the programme a title'
    if (!form.programType.trim()) return 'Pick or type a program type'

    const year = Number(form.year)
    const thisYear = new Date().getFullYear()
    if (!Number.isInteger(year) || year < 1900) return 'Enter a valid year'
    // A programme cannot have run in a year that hasn't happened yet.
    if (year > thisYear) return `Year cannot be later than ${thisYear}`

    // Rows that are entirely blank are dropped on save, so only
    // half-filled ones are worth complaining about.
    for (const [i, m] of form.materials.entries()) {
      const type = resolvedType(m)
      const hasFile = materialHasFile(m)
      if (!type && hasFile) {
        return `Material ${i + 1} has a file but no type — pick one`
      }
      if (type && !hasFile) {
        return `"${type}" has no file — add a Mobile, Tablet or Booklet PDF`
      }
    }

    if (status === 'PUBLISHED') {
      const usable = form.materials.filter(
        (m) => resolvedType(m) && materialHasFile(m),
      )
      if (usable.length === 0) {
        return 'A published programme needs at least one material with a file — add one, or save it as a draft'
      }
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Study Resources
              <span className="text-muted-foreground ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-sm">
                {total}
              </span>
            </CardTitle>
          </div>
          <Button
            className="rounded-full"
            variant="default"
            disabled={busy}
            onClick={openNew}
          >
            New programme
            <Plus className="mr-2 h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="mt-4 space-y-4">
          <div className="flex items-center justify-end gap-3">
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
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title / Theme</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-10 text-center"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && resources.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-10 text-center"
                    >
                      {statusFilter === 'ALL'
                        ? 'No programmes yet. Add the first one to make the feature live in the app.'
                        : `No ${STATUS_LABEL[
                            statusFilter
                          ].toLowerCase()} programmes.`}
                    </TableCell>
                  </TableRow>
                )}

                {resources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{r.theme}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.programType}</Badge>
                    </TableCell>
                    <TableCell>{r.year}</TableCell>
                    <TableCell>
                      {/* What's inside the programme, at a glance —
                          type plus how many formats each has. */}
                      {r.materials.length === 0 ? (
                        <span className="text-muted-foreground text-xs">
                          none
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.materials.map((m) => {
                            const count = MATERIAL_FORMATS.filter(
                              (f) => m[f.key],
                            ).length
                            return (
                              <Badge
                                key={m.id ?? m.type}
                                variant="secondary"
                                title={MATERIAL_FORMATS.filter((f) => m[f.key])
                                  .map((f) => f.label)
                                  .join(', ')}
                              >
                                {m.type} · {count}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
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
                              // Hard delete is unrecoverable, removes
                              // every material with it, and sits next
                              // to Archive — so confirm first.
                              if (
                                window.confirm(
                                  `Permanently delete "${r.theme}" and its ${r.materials.length} material(s)? Archiving keeps it for later instead.`,
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit programme' : 'New programme'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sr-program">Program type</Label>
                <Input
                  id="sr-program"
                  value={form.programType}
                  onChange={(e) => set('programType', e.target.value)}
                  placeholder="SAYCO"
                  list="sr-program-types"
                />
                {/* A datalist, not a Select: the taxonomy is open —
                    server-side it's free text and the app derives its
                    filter chips from what's published — so a new
                    programme must be typeable without a code change. */}
                <datalist id="sr-program-types">
                  {(meta?.programTypes?.length
                    ? Array.from(
                        new Set([
                          ...meta.programTypes,
                          ...SUGGESTED_PROGRAM_TYPES,
                        ]),
                      )
                    : SUGGESTED_PROGRAM_TYPES
                  ).map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sr-year">Year</Label>
                <Input
                  id="sr-year"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={form.year}
                  onChange={(e) => set('year', e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Cannot be later than {new Date().getFullYear()}.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sr-theme">Title/Theme</Label>
              <Input
                id="sr-theme"
                value={form.theme}
                onChange={(e) => set('theme', e.target.value)}
                placeholder="SAYCO 2026 Discipleship Seminar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sr-description">Description</Label>
              <Textarea
                id="sr-description"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What the programme covers."
              />
            </div>

            {/* ── Materials ─────────────────────────────────────── */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Materials</Label>
                  <p className="text-muted-foreground text-xs">
                    Each material is one document, in up to three formats. Every
                    format is optional — max {formatBytes(MAX_PDF_BYTES)} per
                    file.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={addMaterial}
                  disabled={busy}
                  className="rounded-full"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add material
                </Button>
              </div>

              {form.materials.map((m, index) => {
                const isOpen = openMaterialIndex === index
                const fileCount = MATERIAL_FORMATS.filter((f) =>
                  Boolean(m[f.key].trim()),
                ).length

                return (
                  <div
                    key={index}
                    className="bg-muted/40 rounded-md border p-3"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() => setOpenMaterialIndex(index)}
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {materialCardLabel(m, index)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={fileCount > 0 ? 'secondary' : 'outline'}
                        >
                          {fileCount} {fileCount === 1 ? 'file' : 'files'}
                        </Badge>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mt-3 space-y-3 border-t pt-3">
                        <div className="flex items-end gap-2">
                          <div className="w-52 space-y-1.5">
                            <Label className="text-xs font-semibold">
                              Type
                            </Label>
                            <Select
                              value={m.type}
                              onValueChange={(v) =>
                                setMaterial(index, { type: v })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Pick a type" />
                              </SelectTrigger>
                              <SelectContent>
                                {materialTypeOptions.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                                <SelectItem value={OTHER_MATERIAL_TYPE}>
                                  {OTHER_MATERIAL_TYPE}…
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {m.type === OTHER_MATERIAL_TYPE && (
                            <div className="flex-1 space-y-1.5">
                              <Label className="text-xs font-semibold">
                                Type name
                              </Label>
                              <Input
                                value={m.customType}
                                onChange={(e) =>
                                  setMaterial(index, {
                                    customType: e.target.value,
                                  })
                                }
                                placeholder="e.g. Workbook"
                                className="h-8 text-xs"
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-1.5">
                            <Label className="text-xs font-semibold">
                              Title
                            </Label>
                            <Input
                              value={m.title}
                              onChange={(e) =>
                                setMaterial(index, { title: e.target.value })
                              }
                              placeholder="e.g. Day 1"
                              className="h-8 text-xs"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-8 w-8 shrink-0"
                            title="Remove this material"
                            disabled={busy}
                            onClick={() => removeMaterial(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          {MATERIAL_FORMATS.map((f) => (
                            <FormatSlot
                              key={f.key}
                              label={f.label}
                              hint={f.hint}
                              value={m[f.key]}
                              onChange={(v) =>
                                setMaterial(index, {
                                  [f.key]: v,
                                } as Partial<MaterialDraft>)
                              }
                              onUpload={(file) =>
                                uploadFormat(index, f.key, file)
                              }
                              progress={uploads[`${index}:${f.key}`] ?? null}
                              disabled={busy}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cover image</Label>
                <p className="text-muted-foreground text-xs">
                  Shown on the browse cards in the app. Optional.
                </p>
                <div className="bg-background space-y-2 rounded-lg border p-3">
                  <button
                    type="button"
                    className="hover:bg-muted/40 flex w-full items-center justify-between rounded-md border border-dashed px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
                    title="Upload cover image"
                    disabled={busy}
                    onClick={() => thumbInputRef.current?.click()}
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="text-primary h-4 w-4" />
                      <span className="text-xs font-medium">
                        {form.thumbnailUrl ? 'Replace image' : 'Upload image'}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[11px]">
                      JPEG, PNG, WEBP
                    </span>
                  </button>

                  <Input
                    value={form.thumbnailUrl}
                    onChange={(e) => set('thumbnailUrl', e.target.value)}
                    placeholder="Or paste an image URL"
                    disabled={busy}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {form.thumbnailUrl ? (
                        <img
                          src={form.thumbnailUrl}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded">
                          <Upload className="h-4 w-4" />
                        </div>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {form.thumbnailUrl
                          ? 'Image ready for this programme'
                          : 'No cover image uploaded yet'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || !form.thumbnailUrl}
                      onClick={() => set('thumbnailUrl', '')}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                {uploads.thumbnail != null && (
                  <div className="space-y-1">
                    <Progress value={uploads.thumbnail} />
                    <p className="text-muted-foreground text-[11px]">
                      Uploading image… {uploads.thumbnail}%
                    </p>
                  </div>
                )}
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadThumbnail(file)
                    e.target.value = ''
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sr-tags">Tags</Label>
                <p className="text-muted-foreground text-xs">
                  Comma-separated. Readers search on these.
                </p>
                <Input
                  id="sr-tags"
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="discipleship, youth, seminar"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              className="rounded-full"
              variant="destructive"
              onClick={closeComposer}
              disabled={busy}
            >
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
              className="rounded-full"
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
