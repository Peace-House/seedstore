import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bell,
  Send,
  Save,
  Trash2,
  Pencil,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Eye,
  Plus,
  X,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  cancelPushCampaign,
  deletePushDraft,
  getPushAudienceEstimate,
  getPushCampaignDetails,
  getPushCampaignFailures,
  getPushHealth,
  listPushCampaigns,
  listPushDrafts,
  pausePushCampaign,
  resendPushFailures,
  resumePushCampaign,
  savePushDraft,
  sendPushDraft,
  sendPushNow,
  updatePushDraft,
  type ComposerPayload,
  type PushCampaign,
  type PushCampaignStatus,
  type PushDraft,
  type PushTargetMode,
} from '@/services/push'

type Tab = 'compose' | 'drafts' | 'campaigns'

const SURFACE_OPTIONS = ['lockscreen', 'banner', 'inbox'] as const

const STATUS_BADGE: Record<PushCampaignStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-800',
  QUEUED: 'bg-blue-200 text-blue-800',
  ACTIVE: 'bg-green-200 text-green-800',
  PAUSED: 'bg-yellow-200 text-yellow-800',
  CANCELED: 'bg-red-200 text-red-800',
  COMPLETED: 'bg-emerald-200 text-emerald-800',
}

const SUGGESTED_TOPICS = [
  'all-users',
  'lang-en',
  'lang-es',
  'lang-fr',
  'lang-pt',
  'platform-ios',
  'platform-android',
]

interface ComposerState {
  title: string
  body: string
  imageUrl: string
  deepLink: string
  surfaces: string[]
  targetMode: PushTargetMode
  topics: string[]
  userIdsRaw: string
  translationsRaw: string
}

const emptyComposer: ComposerState = {
  title: '',
  body: '',
  imageUrl: '',
  deepLink: '',
  surfaces: ['lockscreen', 'banner'],
  targetMode: 'all',
  topics: [],
  userIdsRaw: '',
  translationsRaw: '',
}

function buildPayload(state: ComposerState): {
  payload?: ComposerPayload
  error?: string
} {
  const title = state.title.trim()
  const body = state.body.trim()
  if (!title) return { error: 'Title is required' }
  if (!body) return { error: 'Body is required' }

  let translations: ComposerPayload['translations'] = null
  if (state.translationsRaw.trim()) {
    try {
      const parsed = JSON.parse(state.translationsRaw)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { error: 'Translations must be a JSON object' }
      }
      translations = parsed
    } catch {
      return { error: 'Translations: invalid JSON' }
    }
  }

  const userIds = state.userIdsRaw
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)

  if (state.targetMode === 'topic' && state.topics.length === 0) {
    return { error: 'Select at least one topic' }
  }
  if (state.targetMode === 'manual-user-list' && userIds.length === 0) {
    return { error: 'Provide at least one valid user ID' }
  }

  return {
    payload: {
      title,
      body,
      imageUrl: state.imageUrl.trim() || null,
      deepLink: state.deepLink.trim() || null,
      surfaces: state.surfaces,
      targetMode: state.targetMode,
      topics: state.topics,
      userIds,
      translations,
    },
  }
}

function fromDraft(draft: PushDraft): ComposerState {
  return {
    title: draft.title,
    body: draft.body,
    imageUrl: draft.imageUrl || '',
    deepLink: draft.deepLink || '',
    surfaces: draft.surfaces?.length ? draft.surfaces : ['lockscreen', 'banner'],
    targetMode: (draft.targetMode || 'all') as PushTargetMode,
    topics: draft.topics || [],
    userIdsRaw: (draft.userIds || []).join(', '),
    translationsRaw: draft.translations
      ? JSON.stringify(draft.translations, null, 2)
      : '',
  }
}

const PushNotificationManagement = () => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('compose')
  const [composer, setComposer] = useState<ComposerState>(emptyComposer)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [topicInput, setTopicInput] = useState('')
  const [showTranslations, setShowTranslations] = useState(false)
  const [detailsCampaign, setDetailsCampaign] = useState<PushCampaign | null>(
    null,
  )

  // The list endpoint trims its `select` (no userIds / surfaces / imageUrl /
  // scheduledFor / translations) so the row object alone can't render the
  // details dialog without exploding on `.length` / `.join`. Fetch the full
  // campaign lazily whenever a row is opened.
  const detailsQuery = useQuery({
    queryKey: ['admin', 'push', 'campaign', detailsCampaign?.id],
    queryFn: () => getPushCampaignDetails(detailsCampaign!.id),
    enabled: !!detailsCampaign?.id,
    staleTime: 10_000,
  })
  const detailsFull: PushCampaign | null =
    detailsQuery.data?.campaign ?? detailsCampaign

  // Health probe — surfaces "Firebase not configured" warning at the top.
  const healthQuery = useQuery({
    queryKey: ['admin', 'push', 'health'],
    queryFn: getPushHealth,
    staleTime: 30_000,
  })

  const audienceQuery = useQuery({
    queryKey: [
      'admin',
      'push',
      'audience',
      composer.targetMode,
      composer.topics.join(','),
      composer.userIdsRaw,
    ],
    queryFn: () => {
      const userIds = composer.userIdsRaw
        .split(/[,\s]+/)
        .map((v) => v.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)
      return getPushAudienceEstimate({
        targetMode: composer.targetMode,
        topics: composer.topics,
        userIds,
      })
    },
    staleTime: 5_000,
  })

  const draftsQuery = useQuery({
    queryKey: ['admin', 'push', 'drafts'],
    queryFn: () => listPushDrafts({ page: 1, pageSize: 50 }),
  })

  const campaignsQuery = useQuery({
    queryKey: ['admin', 'push', 'campaigns'],
    queryFn: () => listPushCampaigns({ page: 1, pageSize: 50 }),
    refetchInterval: 5_000, // live counters
  })

  const sendNow = useMutation({
    mutationFn: sendPushNow,
    onSuccess: (res) => {
      toast.success(`Queued ${res.queuedCount} deliveries`)
      setComposer(emptyComposer)
      setEditingDraftId(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'campaigns'] })
      setTab('campaigns')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to send')
    },
  })

  const saveDraft = useMutation({
    mutationFn: (payload: ComposerPayload) =>
      editingDraftId
        ? updatePushDraft(editingDraftId, payload)
        : savePushDraft(payload),
    onSuccess: () => {
      toast.success(editingDraftId ? 'Draft updated' : 'Draft saved')
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'drafts'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to save draft')
    },
  })

  const deleteDraft = useMutation({
    mutationFn: deletePushDraft,
    onSuccess: () => {
      toast.success('Draft deleted')
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'drafts'] })
    },
  })

  const sendDraft = useMutation({
    mutationFn: sendPushDraft,
    onSuccess: (res) => {
      toast.success(`Queued ${res.queuedCount} deliveries`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'campaigns'] })
      // Server now deletes the draft after promoting it to a campaign,
      // so refresh the drafts list as well to drop it from the UI.
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'drafts'] })
      setTab('campaigns')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to send draft')
    },
  })

  const pause = useMutation({
    mutationFn: pausePushCampaign,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'campaigns'] }),
  })
  const resume = useMutation({
    mutationFn: resumePushCampaign,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'campaigns'] }),
  })
  const cancel = useMutation({
    mutationFn: cancelPushCampaign,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'campaigns'] }),
  })
  const resendFailed = useMutation({
    mutationFn: resendPushFailures,
    onSuccess: (res: any) => {
      toast.success(`Re-queued ${res.requeued} failed deliveries`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'push', 'campaigns'] })
    },
  })

  const handleSend = () => {
    const { payload, error } = buildPayload(composer)
    if (error) return toast.error(error)
    sendNow.mutate(payload!)
  }
  const handleSaveDraft = () => {
    const { payload, error } = buildPayload(composer)
    if (error) return toast.error(error)
    saveDraft.mutate(payload!)
  }
  const handleEditDraft = (draft: PushDraft) => {
    setEditingDraftId(draft.id)
    setComposer(fromDraft(draft))
    setShowTranslations(!!draft.translations)
    setTab('compose')
  }

  const addTopic = (topic: string) => {
    const t = topic.trim()
    if (!t) return
    setComposer((s) =>
      s.topics.includes(t) ? s : { ...s, topics: [...s.topics, t] },
    )
    setTopicInput('')
  }
  const removeTopic = (topic: string) => {
    setComposer((s) => ({ ...s, topics: s.topics.filter((t) => t !== topic) }))
  }

  // Keep surfaces array in sync with checkboxes.
  const toggleSurface = (s: string) => {
    setComposer((c) => ({
      ...c,
      surfaces: c.surfaces.includes(s)
        ? c.surfaces.filter((x) => x !== s)
        : [...c.surfaces, s],
    }))
  }

  const previewBody = composer.body || 'Body preview…'
  const previewTitle = composer.title || 'Title preview'

  // Reset composer when switching off the compose tab while editing a
  // draft, so reopening compose shows a fresh form.
  useEffect(() => {
    if (tab !== 'compose' && editingDraftId === null) {
      // intentional — don't clobber an in-flight edit
    }
  }, [tab, editingDraftId])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Push Notifications</h2>
      </div>

      {/* Firebase health banner */}
      {healthQuery.data && !healthQuery.data.ok && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-2 p-4 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            <div className="text-sm">
              <strong>Firebase Admin not configured.</strong>{' '}
              {healthQuery.data.error || 'Set FIREBASE_SERVICE_ACCOUNT on the server.'}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b">
        {(
          [
            { v: 'compose', label: 'Compose' },
            { v: 'drafts', label: 'Drafts' },
            { v: 'campaigns', label: 'Campaigns' },
          ] as { v: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.v
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Compose ─────────────────────────────────────────────── */}
      {tab === 'compose' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingDraftId ? (
                  <>
                    <Pencil className="h-4 w-4" /> Editing draft
                  </>
                ) : (
                  <>New campaign</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={composer.title}
                  onChange={(e) =>
                    setComposer((c) => ({ ...c, title: e.target.value }))
                  }
                  placeholder="Short, punchy"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {composer.title.length}/100 — keep under 50 for lockscreen.
                </p>
              </div>

              <div>
                <Label>Body</Label>
                <Textarea
                  rows={3}
                  value={composer.body}
                  onChange={(e) =>
                    setComposer((c) => ({ ...c, body: e.target.value }))
                  }
                  placeholder="Body shown under the title"
                  maxLength={240}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {composer.body.length}/240
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={composer.imageUrl}
                    onChange={(e) =>
                      setComposer((c) => ({ ...c, imageUrl: e.target.value }))
                    }
                    placeholder="https://res.cloudinary.com/…"
                  />
                </div>
                <div>
                  <Label>Deep link (optional)</Label>
                  <Input
                    value={composer.deepLink}
                    onChange={(e) =>
                      setComposer((c) => ({ ...c, deepLink: e.target.value }))
                    }
                    placeholder="livingseed://book/123 or https://…"
                  />
                </div>
              </div>

              <div>
                <Label>Surfaces</Label>
                <div className="mt-2 flex gap-2">
                  {SURFACE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSurface(s)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        composer.surfaces.includes(s)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Audience</Label>
                <Select
                  value={composer.targetMode}
                  onValueChange={(v) =>
                    setComposer((c) => ({
                      ...c,
                      targetMode: v as PushTargetMode,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users (broadcast)</SelectItem>
                    <SelectItem value="topic">Topic(s)</SelectItem>
                    <SelectItem value="manual-user-list">
                      Specific users
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {composer.targetMode === 'topic' && (
                <div>
                  <Label>Topics</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="Type a topic and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTopic(topicInput)
                        }
                      }}
                    />
                    <Button type="button" onClick={() => addTopic(topicInput)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {composer.topics.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="flex items-center gap-1 pr-1"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTopic(t)}
                          className="ml-1 rounded p-0.5 hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">
                      Suggested:
                    </span>
                    {SUGGESTED_TOPICS.filter(
                      (s) => !composer.topics.includes(s),
                    ).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTopic(s)}
                        className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                      >
                        +{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {composer.targetMode === 'manual-user-list' && (
                <div>
                  <Label>User IDs</Label>
                  <Textarea
                    rows={2}
                    value={composer.userIdsRaw}
                    onChange={(e) =>
                      setComposer((c) => ({
                        ...c,
                        userIdsRaw: e.target.value,
                      }))
                    }
                    placeholder="Comma- or space-separated user IDs (e.g. 1, 2, 3)"
                  />
                </div>
              )}

              <div>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline"
                  onClick={() => setShowTranslations((v) => !v)}
                >
                  {showTranslations ? 'Hide' : 'Add'} translations (optional)
                </button>
                {showTranslations && (
                  <div className="mt-2">
                    <Textarea
                      rows={6}
                      value={composer.translationsRaw}
                      onChange={(e) =>
                        setComposer((c) => ({
                          ...c,
                          translationsRaw: e.target.value,
                        }))
                      }
                      placeholder={`{
  "fr": { "title": "…", "body": "…" },
  "es": { "title": "…", "body": "…" }
}`}
                      className="font-mono text-xs"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      English (default) is taken from the title and body above.
                      Recipients with unsupported locales fall back to English.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={handleSend}
                  disabled={sendNow.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendNow.isPending ? 'Queueing…' : 'Send now'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saveDraft.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingDraftId ? 'Update draft' : 'Save draft'}
                </Button>
                {editingDraftId && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingDraftId(null)
                      setComposer(emptyComposer)
                    }}
                  >
                    Discard changes
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview + audience side-panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    {composer.imageUrl && (
                      <img
                        src={composer.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).style.display = 'none')
                        }
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {previewTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {previewBody}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estimated reach</CardTitle>
              </CardHeader>
              <CardContent>
                {audienceQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Estimating…</div>
                ) : audienceQuery.data ? (
                  <div>
                    <div className="text-3xl font-semibold">
                      {audienceQuery.data.deliveries}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      delivery rows
                    </div>
                    {audienceQuery.data.note && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {audienceQuery.data.note}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Configure audience above
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Drafts ──────────────────────────────────────────────── */}
      {tab === 'drafts' && (
        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            {draftsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : draftsQuery.data?.drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts yet.</p>
            ) : (
              <div className="space-y-2">
                {draftsQuery.data?.drafts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {d.body}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{d.targetMode || '—'}</Badge>
                        Updated {new Date(d.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditDraft(d)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => sendDraft.mutate(d.id)}
                        disabled={sendDraft.isPending}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteDraft.mutate(d.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Campaigns ───────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Campaigns</span>
              <span className="text-xs text-muted-foreground">
                Live counters refresh every 5s
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaignsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : campaignsQuery.data?.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-2">Title</th>
                      <th className="pb-2 pr-2">Mode</th>
                      <th className="pb-2 pr-2">Status</th>
                      <th className="pb-2 pr-2">Sent</th>
                      <th className="pb-2 pr-2">Failed</th>
                      <th className="pb-2 pr-2">Total</th>
                      <th className="pb-2 pr-2">Created</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignsQuery.data?.campaigns.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-2 font-medium">{c.title}</td>
                        <td className="py-2 pr-2">
                          <Badge variant="outline">{c.targetMode}</Badge>
                        </td>
                        <td className="py-2 pr-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2 pr-2">{c.sentCount}</td>
                        <td className="py-2 pr-2">
                          {c.failedCount > 0 ? (
                            <span className="text-red-600">
                              {c.failedCount}
                            </span>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="py-2 pr-2">{c.totalRecipients}</td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Details"
                              onClick={() => setDetailsCampaign(c)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {c.status === 'ACTIVE' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Pause"
                                onClick={() => pause.mutate(c.id)}
                              >
                                <PauseCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {c.status === 'PAUSED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Resume"
                                onClick={() => resume.mutate(c.id)}
                              >
                                <PlayCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {(c.status === 'ACTIVE' ||
                              c.status === 'PAUSED') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Cancel"
                                onClick={() => cancel.mutate(c.id)}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {c.failedCount > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Resend failed"
                                onClick={() => resendFailed.mutate(c.id)}
                              >
                                <RefreshCcw className="h-3 w-3" />
                              </Button>
                            )}
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

      {/* Details modal */}
      <Dialog
        open={!!detailsCampaign}
        onOpenChange={(o) => !o && setDetailsCampaign(null)}
      >
        <DialogContent className="max-w-2xl">
          {detailsFull && (
            <>
              <DialogHeader>
                <DialogTitle>{detailsFull.title}</DialogTitle>
                <DialogDescription>{detailsFull.body}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {detailsQuery.isLoading && (
                  <div className="text-xs text-muted-foreground">
                    Loading full campaign…
                  </div>
                )}
                {detailsQuery.isError && (
                  <div className="text-xs text-red-600">
                    Couldn't load full campaign details — showing summary only.
                  </div>
                )}
                <div>
                  <strong>Mode:</strong> {detailsFull.targetMode}
                </div>
                {(detailsFull.topics ?? []).length > 0 && (
                  <div>
                    <strong>Topics:</strong>{' '}
                    {(detailsFull.topics ?? []).join(', ')}
                  </div>
                )}
                {(detailsFull.userIds ?? []).length > 0 && (
                  <div>
                    <strong>User IDs:</strong>{' '}
                    {(detailsFull.userIds ?? []).join(', ')}
                  </div>
                )}
                <div>
                  <strong>Surfaces:</strong>{' '}
                  {(detailsFull.surfaces ?? []).join(', ') || '—'}
                </div>
                {detailsFull.deepLink && (
                  <div>
                    <strong>Deep link:</strong> {detailsFull.deepLink}
                  </div>
                )}
                <div className="flex gap-4 pt-2 text-sm">
                  <Stat
                    label="Total"
                    value={detailsFull.totalRecipients ?? 0}
                  />
                  <Stat
                    label="Sent"
                    value={detailsFull.sentCount ?? 0}
                    color="text-green-600"
                  />
                  <Stat
                    label="Failed"
                    value={detailsFull.failedCount ?? 0}
                    color="text-red-600"
                  />
                  <Stat
                    label="Queued"
                    value={detailsFull.queuedCount ?? 0}
                    color="text-blue-600"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDetailsCampaign(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const Stat = ({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) => (
  <div>
    <div className={`text-2xl font-semibold ${color || ''}`}>{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
)

export default PushNotificationManagement
