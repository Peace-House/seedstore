import { forwardRef, useImperativeHandle, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Eye, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  estimatePushAudienceByFilters,
  getPushDraft,
  getPushHealth,
  savePushDraft,
  sendPushNow,
  updatePushDraft,
  type ComposerPayload,
} from '@/services/push'
import type { NewsletterPreviewFilters } from '@/services/user'
import ImageInput from './ImageInput'
import type { TargetingFilters } from './useTargetingFilters'
import type { RecipientPreview } from './RecipientPreview'
import { getApiErrorMessage, type ComposerHandle } from './types'

const SURFACE_OPTIONS = ['lockscreen', 'banner', 'inbox'] as const
const DEVICE_PLATFORMS: { value: string; label: string }[] = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'windows', label: 'Windows' },
]

interface Props {
  tf: TargetingFilters
  rp: RecipientPreview
  onSent: () => void
}

const PushComposer = forwardRef<ComposerHandle, Props>(
  ({ tf, rp, onSent }, ref) => {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [deepLink, setDeepLink] = useState('')
    const [surfaces, setSurfaces] = useState<string[]>(['lockscreen', 'banner'])
    const [platforms, setPlatforms] = useState<string[]>([])
    const [translationsRaw, setTranslationsRaw] = useState('')
    const [showTranslations, setShowTranslations] = useState(false)
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [isSavingDraft, setIsSavingDraft] = useState(false)

    const healthQuery = useQuery({
      queryKey: ['admin', 'push', 'health'],
      queryFn: getPushHealth,
      staleTime: 30_000,
    })

    const filtersSnapshot = tf.buildFilters()
    const audienceQuery = useQuery({
      queryKey: [
        'admin',
        'push',
        'audience',
        JSON.stringify(filtersSnapshot),
        platforms.join(','),
      ],
      queryFn: () => estimatePushAudienceByFilters(filtersSnapshot, platforms),
      staleTime: 5_000,
    })

    const reset = () => {
      setTitle('')
      setBody('')
      setImageUrl('')
      setDeepLink('')
      setSurfaces(['lockscreen', 'banner'])
      setPlatforms([])
      setTranslationsRaw('')
      setShowTranslations(false)
      setEditingDraftId(null)
      tf.resetFilters()
      rp.resetPreview()
    }

    const loadDraft = async (draftId: string) => {
      const { draft } = await getPushDraft(draftId)
      setTitle(draft.title)
      setBody(draft.body)
      setImageUrl(draft.imageUrl || '')
      setDeepLink(draft.deepLink || '')
      setSurfaces(draft.surfaces?.length ? draft.surfaces : ['lockscreen', 'banner'])
      setPlatforms(draft.platforms || [])
      setTranslationsRaw(
        draft.translations ? JSON.stringify(draft.translations, null, 2) : '',
      )
      setShowTranslations(!!draft.translations)
      tf.applyFilters((draft.filters || {}) as NewsletterPreviewFilters)
      setEditingDraftId(draftId)
      toast.success('Draft loaded into editor')
    }

    useImperativeHandle(ref, () => ({ loadDraft, reset }))

    const toggleSurface = (s: string) =>
      setSurfaces((prev) =>
        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
      )

    const togglePlatform = (p: string) =>
      setPlatforms((prev) =>
        prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
      )

    const buildPayload = (): { payload?: ComposerPayload; error?: string } => {
      const t = title.trim()
      const b = body.trim()
      if (!t) return { error: 'Title is required' }
      if (!b) return { error: 'Body is required' }

      let translations: ComposerPayload['translations'] = null
      if (translationsRaw.trim()) {
        try {
          const parsed = JSON.parse(translationsRaw)
          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { error: 'Translations must be a JSON object' }
          }
          translations = parsed
        } catch {
          return { error: 'Translations: invalid JSON' }
        }
      }

      return {
        payload: {
          title: t,
          body: b,
          imageUrl: imageUrl.trim() || null,
          deepLink: deepLink.trim() || null,
          surfaces,
          platforms,
          translations,
          filters: tf.buildFilters(),
        },
      }
    }

    const handleSend = async () => {
      const { payload, error } = buildPayload()
      if (error) return toast.error(error)
      try {
        setIsSending(true)
        const res = await sendPushNow(payload!)
        toast.success(`Queued ${res.queuedCount} deliveries`)
        reset()
        onSent()
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to send'))
      } finally {
        setIsSending(false)
      }
    }

    const handleSaveDraft = async () => {
      const { payload, error } = buildPayload()
      if (error) return toast.error(error)
      try {
        setIsSavingDraft(true)
        if (editingDraftId) {
          await updatePushDraft(editingDraftId, payload!)
          toast.success('Draft updated')
        } else {
          const { draft } = await savePushDraft(payload!)
          setEditingDraftId(draft.id)
          toast.success('Draft saved')
        }
        onSent()
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to save draft'))
      } finally {
        setIsSavingDraft(false)
      }
    }

    return (
      <div className="space-y-4">
        {healthQuery.data && !healthQuery.data.ok && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex items-center gap-2 p-4 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <div className="text-sm">
                <strong>Firebase Admin not configured.</strong>{' '}
                {healthQuery.data.error ||
                  'Set FIREBASE_SERVICE_ACCOUNT on the server.'}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 xl:grid-cols-8">
          <Card className="xl:col-span-5">
            <CardHeader>
              <CardTitle className="text-lg">Push Composer</CardTitle>
              {editingDraftId && (
                <p className="text-muted-foreground text-sm">
                  Editing draft: <span className="font-medium">{editingDraftId}</span>
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short, punchy"
                  maxLength={100}
                />
                <p className="text-muted-foreground text-xs">
                  {title.length}/100 — keep under 50 for lockscreen.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Body shown under the title"
                  maxLength={240}
                />
                <p className="text-muted-foreground text-xs">{body.length}/240</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image (optional)</Label>
                  <ImageInput value={imageUrl} onChange={setImageUrl} />
                </div>
                <div className="space-y-2">
                  <Label>Deep link (optional)</Label>
                  <Input
                    value={deepLink}
                    onChange={(e) => setDeepLink(e.target.value)}
                    placeholder="livingseed://book/123 or https://…"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Surfaces</Label>
                <div className="flex gap-2">
                  {SURFACE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSurface(s)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        surfaces.includes(s)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Device platform</Label>
                <div className="flex gap-2">
                  {DEVICE_PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePlatform(p.value)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        platforms.includes(p.value)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">
                  None selected = all devices. Windows has no registered devices
                  yet.
                </p>
              </div>

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
                      value={translationsRaw}
                      onChange={(e) => setTranslationsRaw(e.target.value)}
                      placeholder={`{\n  "fr": { "title": "…", "body": "…" },\n  "es": { "title": "…", "body": "…" }\n}`}
                      className="font-mono text-xs"
                    />
                    <p className="text-muted-foreground mt-1 text-xs">
                      English (default) is taken from the title and body above.
                      Recipients with unsupported locales fall back to English.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Button
                  style={{ border: '1px solid green' }}
                  onClick={rp.openPreview}
                  disabled={rp.isPreviewing}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {rp.isPreviewing ? 'Preparing preview...' : 'Preview Recipients'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={reset}
                  className="!bg-slate-300 hover:!bg-slate-300/80 hover:!text-black"
                >
                  {editingDraftId ? 'Cancel Editing' : 'Discard'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="!bg-black !text-white hover:!bg-black/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingDraft
                    ? 'Saving...'
                    : editingDraftId
                    ? 'Update Draft'
                    : 'Save Draft'}
                </Button>
              </div>
              <div>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleSend}
                  disabled={isSending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? 'Queueing…' : 'Send Push Notification'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-xl border p-3">
                  <div className="flex items-start gap-2">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).style.display = 'none')
                        }
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {title || 'Title preview'}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {body || 'Body preview…'}
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
                  <div className="text-muted-foreground text-sm">Estimating…</div>
                ) : audienceQuery.data ? (
                  <div>
                    <div className="text-3xl font-semibold">
                      {audienceQuery.data.deliveries}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      device tokens across {audienceQuery.data.users} matched
                      user(s)
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Adjust the targeting filters to estimate reach
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  },
)

PushComposer.displayName = 'PushComposer'

export default PushComposer
