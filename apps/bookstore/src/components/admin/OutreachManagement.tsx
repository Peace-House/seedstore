import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MapPin,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  Globe,
  Power,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import OutreachLocationEditDialog from './OutreachLocationEditDialog'
import {
  commitOutreachUpload,
  deactivateAdminOutreachLocation,
  downloadOutreachTemplate,
  listAdminOutreachLocations,
  reactivateAdminOutreachLocation,
  uploadOutreachFile,
  type AdminOutreachFilters,
  type CommitMode,
  type OutreachLocation,
  type OutreachType,
  type PreviewRow,
} from '@/services/outreach'
import { countryName, countryOptions } from '@/utils/countryNames'

type Tab = 'upload' | 'list'

const TYPE_LABEL: Record<OutreachType, string> = {
  office: 'Peace House office',
  class: 'Discipleship class',
}

const COMMIT_MODE_LABEL: Record<CommitMode, string> = {
  append: 'Append (always insert new rows)',
  upsert: 'Upsert by externalId (update existing, insert new)',
  'replace-active':
    'Replace-active (deactivate existing of this type, then insert)',
}

interface AdvancedFilters {
  region: string
  city: string
  privateLocation: '' | 'true' | 'false'
  hasCoords: '' | 'true' | 'false'
  language: string
  dateFrom: string
  dateTo: string
}

const emptyAdvanced: AdvancedFilters = {
  region: '',
  city: '',
  privateLocation: '',
  hasCoords: '',
  language: '',
  dateFrom: '',
  dateTo: '',
}

const OutreachManagement = () => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('upload')
  const [type, setType] = useState<OutreachType>('office')

  // ── Upload state ─────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [commitMode, setCommitMode] = useState<CommitMode>('upsert')

  // ── List state ───────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [showInactive, setShowInactive] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced, setAdvanced] = useState<AdvancedFilters>(emptyAdvanced)

  // ── Dialog state ─────────────────────────────────────────────
  const [editing, setEditing] = useState<OutreachLocation | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmHardDelete, setConfirmHardDelete] =
    useState<OutreachLocation | null>(null)

  const downloadTemplate = useMutation({
    mutationFn: downloadOutreachTemplate,
    onSuccess: (blob, t) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `outreach-${t}-template.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onError: () => toast.error('Could not download template'),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, t }: { file: File; t: OutreachType }) =>
      uploadOutreachFile(file, t),
    onSuccess: (res) => {
      setPreview(res.rows)
      const ok = res.rows.filter((r) => r.status !== 'error').length
      const errors = res.rows.length - ok
      if (errors > 0) {
        toast.warning(`${ok} rows ready, ${errors} need fixing`)
      } else {
        toast.success(`${ok} rows ready to commit`)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Upload failed')
      setPreview([])
    },
  })

  const commitMutation = useMutation({
    mutationFn: commitOutreachUpload,
    onSuccess: (res) => {
      toast.success(
        `Committed ${res.inserted} new, ${res.updated} updated${
          res.deactivated > 0 ? `, ${res.deactivated} deactivated` : ''
        }`,
      )
      setPreview([])
      queryClient.invalidateQueries({
        queryKey: ['admin', 'outreach', 'locations'],
      })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Commit failed'),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => deactivateAdminOutreachLocation(id),
    onSuccess: () => {
      toast.success('Deactivated')
      queryClient.invalidateQueries({
        queryKey: ['admin', 'outreach', 'locations'],
      })
    },
  })

  const reactivate = useMutation({
    mutationFn: reactivateAdminOutreachLocation,
    onSuccess: () => {
      toast.success('Reactivated')
      queryClient.invalidateQueries({
        queryKey: ['admin', 'outreach', 'locations'],
      })
    },
  })

  const hardDelete = useMutation({
    mutationFn: (id: number) =>
      deactivateAdminOutreachLocation(id, { hard: true }),
    onSuccess: () => {
      toast.success('Permanently deleted')
      setConfirmHardDelete(null)
      queryClient.invalidateQueries({
        queryKey: ['admin', 'outreach', 'locations'],
      })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Delete failed'),
  })

  // Compose query params from basic + advanced filters.
  const queryFilters = useMemo<AdminOutreachFilters>(
    () => ({
      type,
      country: filterCountry || undefined,
      q: search || undefined,
      active: showInactive ? undefined : true,
      region: advanced.region || undefined,
      city: advanced.city || undefined,
      privateLocation:
        advanced.privateLocation === ''
          ? undefined
          : advanced.privateLocation === 'true',
      hasCoords:
        advanced.hasCoords === '' ? undefined : advanced.hasCoords === 'true',
      language: advanced.language || undefined,
      dateFrom: advanced.dateFrom || undefined,
      dateTo: advanced.dateTo || undefined,
      page: 1,
      pageSize: 100,
    }),
    [type, filterCountry, search, showInactive, advanced],
  )

  const locationsQuery = useQuery({
    queryKey: ['admin', 'outreach', 'locations', queryFilters],
    queryFn: () => listAdminOutreachLocations(queryFilters),
  })

  const handleFile = (file: File | null | undefined) => {
    if (!file) return
    setPreview([])
    uploadMutation.mutate({ file, t: type })
  }

  const onCommit = () => {
    const validRows = preview.filter((r) => r.status !== 'error')
    if (validRows.length === 0) {
      toast.error('No valid rows to commit')
      return
    }
    commitMutation.mutate({
      type,
      mode: commitMode,
      rows: validRows.map((r) => r.data),
    })
  }

  const errorCount = preview.filter((r) => r.status === 'error').length
  const geocodedCount = preview.filter((r) => r.status === 'geocoded').length

  const countriesInList = useMemo(() => {
    const set = new Set<string>()
    for (const row of locationsQuery.data?.locations || []) {
      if (row.country) set.add(row.country)
    }
    return Array.from(set).sort()
  }, [locationsQuery.data])

  const advancedActiveCount = useMemo(
    () => Object.values(advanced).filter((v) => v !== '').length,
    [advanced],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="text-primary h-6 w-6" />
          <h2 className="text-2xl font-semibold">Outreach Locations</h2>
        </div>
        <Button
          liquidGlass={false}
          onClick={() => setCreating(true)}
          className="gap-2 rounded-full"
        >
          <Plus className="h-4 w-4" />
          New location
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {(
          [
            { v: 'upload', label: 'Upload' },
            { v: 'list', label: 'List & manage' },
          ] as { v: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.v
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Type pill is shared between tabs so admins don't lose context. */}
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground text-sm">Working with:</Label>
        <Select value={type} onValueChange={(v) => setType(v as OutreachType)}>
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="office">{TYPE_LABEL.office}</SelectItem>
            <SelectItem value="class">{TYPE_LABEL.class}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Upload ──────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Bulk upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadTemplate.mutate(type)}
                  disabled={downloadTemplate.isPending}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download template (.xlsx)
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                  disabled={uploadMutation.isPending}
                >
                  <Upload className="h-4 w-4" />
                  {uploadMutation.isPending ? 'Parsing…' : 'Choose .xlsx file'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Template includes a README sheet explaining each column.
                Coordinates are computed server-side — leave latitude /
                longitude out of the template.
              </p>

              {preview.length > 0 && (
                <>
                  <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                    <Badge variant="outline">
                      {preview.length} rows parsed
                    </Badge>
                    <Badge className="bg-green-200 text-green-800">
                      {preview.length - errorCount} valid
                    </Badge>
                    {geocodedCount > 0 && (
                      <Badge className="bg-blue-200 text-blue-800">
                        {geocodedCount} geocoded
                      </Badge>
                    )}
                    {errorCount > 0 && (
                      <Badge className="bg-red-200 text-red-800">
                        {errorCount} errors
                      </Badge>
                    )}
                  </div>

                  <div className="max-h-96 overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 sticky top-0 text-xs">
                        <tr className="text-left">
                          <th className="px-2 py-1">Row</th>
                          <th className="px-2 py-1">Status</th>
                          <th className="px-2 py-1">Name</th>
                          <th className="px-2 py-1">City</th>
                          <th className="px-2 py-1">Region</th>
                          <th className="px-2 py-1">Country</th>
                          <th className="px-2 py-1">Coords</th>
                          <th className="px-2 py-1">Notes / errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((r) => (
                          <tr key={r.rowNumber} className="border-t">
                            <td className="px-2 py-1">{r.rowNumber}</td>
                            <td className="px-2 py-1">
                              {r.status === 'error' ? (
                                <span className="inline-flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-3 w-3" /> error
                                </span>
                              ) : r.status === 'geocoded' ? (
                                <span className="inline-flex items-center gap-1 text-blue-600">
                                  <CheckCircle2 className="h-3 w-3" /> geocoded
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" /> ok
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1">{r.data.name || '—'}</td>
                            <td className="px-2 py-1">{r.data.city || '—'}</td>
                            <td className="px-2 py-1">
                              {r.data.region || '—'}
                            </td>
                            <td className="px-2 py-1">
                              {r.data.country
                                ? countryName(r.data.country)
                                : '—'}
                            </td>
                            <td className="text-muted-foreground px-2 py-1 text-xs">
                              {r.data.latitude && r.data.longitude
                                ? `${r.data.latitude.toFixed(
                                    4,
                                  )}, ${r.data.longitude.toFixed(4)}`
                                : '—'}
                            </td>
                            <td className="px-2 py-1 text-xs">
                              {r.error ? (
                                <span className="text-red-600">{r.error}</span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {r.data.geocodingNote || ''}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[260px] flex-1">
                      <Label>Commit mode</Label>
                      <Select
                        value={commitMode}
                        onValueChange={(v) => setCommitMode(v as CommitMode)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(COMMIT_MODE_LABEL) as CommitMode[]).map(
                            (m) => (
                              <SelectItem key={m} value={m}>
                                {COMMIT_MODE_LABEL[m]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={onCommit}
                      disabled={commitMutation.isPending}
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {commitMutation.isPending
                        ? 'Committing…'
                        : 'Commit valid rows'}
                    </Button>
                    {commitMode === 'replace-active' && (
                      <p className="w-full text-xs text-amber-700">
                        Replace-active deactivates ALL existing{' '}
                        <strong>{TYPE_LABEL[type]}</strong> rows before
                        inserting. Use upsert when in doubt.
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── List & manage ──────────────────────────────────────── */}
      {tab === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, city, contact, phone"
                  className="w-[260px] pl-8"
                />
              </div>
              <div className="relative">
                <Globe className="text-muted-foreground pointer-events-none absolute left-2 top-2.5 z-10 h-4 w-4" />
                <Select
                  value={filterCountry || 'ALL'}
                  onValueChange={(v) =>
                    setFilterCountry(v === 'ALL' ? '' : v)
                  }
                >
                  <SelectTrigger className="w-[200px] pl-8">
                    <SelectValue placeholder="Any country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="ALL">Any country</SelectItem>
                    {countryOptions().map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Show inactive
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Advanced filters
                {advancedActiveCount > 0 && (
                  <Badge className="bg-primary/20 text-primary">
                    {advancedActiveCount}
                  </Badge>
                )}
              </Button>
              {advancedActiveCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdvanced(emptyAdvanced)}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
              {countriesInList.length > 0 && (
                <div className="text-muted-foreground text-xs">
                  {countriesInList.length} countries in result:{' '}
                  {countriesInList.slice(0, 8).join(', ')}
                  {countriesInList.length > 8 ? '…' : ''}
                </div>
              )}
            </div>

            {advancedOpen && (
              <div className="bg-muted/20 rounded-md border p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <Label>Region / State</Label>
                    <Input
                      value={advanced.region}
                      onChange={(e) =>
                        setAdvanced((a) => ({ ...a, region: e.target.value }))
                      }
                      placeholder="e.g. Lagos"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={advanced.city}
                      onChange={(e) =>
                        setAdvanced((a) => ({ ...a, city: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Language (ISO-2)</Label>
                    <Input
                      value={advanced.language}
                      onChange={(e) =>
                        setAdvanced((a) => ({
                          ...a,
                          language: e.target.value.toLowerCase(),
                        }))
                      }
                      placeholder="en, yo, fr…"
                    />
                  </div>
                  <div>
                    <Label>Privacy</Label>
                    <Select
                      value={advanced.privateLocation || 'any'}
                      onValueChange={(v) =>
                        setAdvanced((a) => ({
                          ...a,
                          privateLocation:
                            v === 'any' ? '' : (v as 'true' | 'false'),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Private only</SelectItem>
                        <SelectItem value="false">Public only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Coordinates</Label>
                    <Select
                      value={advanced.hasCoords || 'any'}
                      onValueChange={(v) =>
                        setAdvanced((a) => ({
                          ...a,
                          hasCoords: v === 'any' ? '' : (v as 'true' | 'false'),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Geocoded only</SelectItem>
                        <SelectItem value="false">Missing coords</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Created between</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={advanced.dateFrom}
                        onChange={(e) =>
                          setAdvanced((a) => ({
                            ...a,
                            dateFrom: e.target.value,
                          }))
                        }
                      />
                      <Input
                        type="date"
                        value={advanced.dateTo}
                        onChange={(e) =>
                          setAdvanced((a) => ({
                            ...a,
                            dateTo: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {locationsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : locationsQuery.data?.locations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No locations match.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="pb-2 pr-2">Name</th>
                      <th className="pb-2 pr-2">City</th>
                      <th className="pb-2 pr-2">Region</th>
                      <th className="pb-2 pr-2">Country</th>
                      <th className="pb-2 pr-2">Contact</th>
                      <th className="pb-2 pr-2">Phone</th>
                      <th className="pb-2 pr-2">Private</th>
                      <th className="pb-2 pr-2">Active</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationsQuery.data?.locations.map((l) => (
                      <tr key={l.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-2 font-medium">{l.name}</td>
                        <td className="py-2 pr-2">{l.city}</td>
                        <td className="text-muted-foreground py-2 pr-2">
                          {l.region || '—'}
                        </td>
                        <td className="py-2 pr-2">
                          {countryName(l.country)}
                        </td>
                        <td className="text-muted-foreground py-2 pr-2">
                          {l.contactName || '—'}
                        </td>
                        <td className="text-muted-foreground py-2 pr-2">
                          {l.phone || '—'}
                        </td>
                        <td className="py-2 pr-2">
                          {l.privateLocation ? (
                            <Badge className="bg-amber-200 text-amber-800">
                              private
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          {l.active ? (
                            <Badge className="bg-green-200 text-green-800">
                              active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-200 text-gray-700">
                              inactive
                            </Badge>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Edit"
                              onClick={() => setEditing(l)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {l.active ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Deactivate"
                                onClick={() => deactivate.mutate(l.id)}
                              >
                                <Power className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Reactivate"
                                onClick={() => reactivate.mutate(l.id)}
                                className="text-green-700 hover:text-green-800"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Delete permanently"
                              onClick={() => setConfirmHardDelete(l)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
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
        </Card>
      )}

      {/* Edit / create dialog */}
      <OutreachLocationEditDialog
        open={!!editing || creating}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null)
            setCreating(false)
          }
        }}
        location={editing}
        defaultType={type}
      />

      {/* Hard-delete confirmation */}
      <AlertDialog
        open={!!confirmHardDelete}
        onOpenChange={(o) => !o && setConfirmHardDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmHardDelete?.name}" will be removed from the database.
              This cannot be undone. For most cases, deactivating is safer — the
              row stays in history and can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                confirmHardDelete && hardDelete.mutate(confirmHardDelete.id)
              }
            >
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OutreachManagement
