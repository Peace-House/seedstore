import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Eye,
  Mail,
  Bell,
  PauseCircle,
  Pencil,
  PlayCircle,
  RefreshCcw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  deleteNewsletterDraft,
  getNewsletterCampaignDetails,
  getNewsletterCampaignFailures,
  getNewsletterCampaigns,
  pauseNewsletterCampaign,
  resendNewsletterCampaignFailures,
  resumeNewsletterCampaign,
  sendNewsletterDraft,
  type NewsletterCampaign,
  type NewsletterCampaignDetails,
  type NewsletterFailureRecipient,
} from '@/services/user'
import {
  cancelPushCampaign,
  deletePushDraft,
  getPushCampaignDetails,
  listPushCampaigns,
  listPushDrafts,
  pausePushCampaign,
  resendPushFailures,
  resumePushCampaign,
  sendPushDraft,
  type PushCampaign,
  type PushCampaignStatus,
} from '@/services/push'
import { getApiErrorMessage, type Channel } from './types'

const PUSH_STATUS_BADGE: Record<PushCampaignStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-800',
  QUEUED: 'bg-blue-200 text-blue-800',
  ACTIVE: 'bg-green-200 text-green-800',
  PAUSED: 'bg-yellow-200 text-yellow-800',
  CANCELED: 'bg-red-200 text-red-800',
  COMPLETED: 'bg-emerald-200 text-emerald-800',
}

const CommunicationsHistory = ({
  defaultChannel,
  onEditEmailDraft,
  onEditPushDraft,
}: {
  defaultChannel: Channel
  onEditEmailDraft: (id: string) => void
  onEditPushDraft: (id: string) => void
}) => {
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<Channel>(defaultChannel)
  const [actionId, setActionId] = useState<string | null>(null)

  // Newsletter
  const { data: nlData } = useQuery({
    queryKey: ['communications', 'newsletter-campaigns'],
    queryFn: async () => getNewsletterCampaigns(1, 20),
  })
  const newsletterCampaigns = nlData?.campaigns || []
  const [nlDetailsOpen, setNlDetailsOpen] = useState(false)
  const [nlDetailsLoading, setNlDetailsLoading] = useState(false)
  const [nlDetails, setNlDetails] = useState<NewsletterCampaignDetails | null>(
    null,
  )

  // Push
  const { data: pushCampaignsData } = useQuery({
    queryKey: ['communications', 'push-campaigns'],
    queryFn: () => listPushCampaigns({ page: 1, pageSize: 50 }),
    refetchInterval: 5_000,
  })
  const { data: pushDraftsData } = useQuery({
    queryKey: ['communications', 'push-drafts'],
    queryFn: () => listPushDrafts({ page: 1, pageSize: 50 }),
  })
  const [pushDetails, setPushDetails] = useState<PushCampaign | null>(null)
  // The list endpoint trims its select (no surfaces/userIds/translations), so
  // lazy-load the full campaign for the details dialog.
  const pushDetailsQuery = useQuery({
    queryKey: ['communications', 'push-campaign', pushDetails?.id],
    queryFn: () => getPushCampaignDetails(pushDetails!.id),
    enabled: !!pushDetails?.id,
    staleTime: 10_000,
  })
  const pushDetailsFull = pushDetailsQuery.data?.campaign ?? pushDetails

  // Newsletter failed-recipients dialog
  const [failedOpen, setFailedOpen] = useState(false)
  const [failedCampaign, setFailedCampaign] =
    useState<NewsletterCampaign | null>(null)
  const [failedRecipients, setFailedRecipients] = useState<
    NewsletterFailureRecipient[]
  >([])
  const [failedTotal, setFailedTotal] = useState(0)
  const [selectedFailedIds, setSelectedFailedIds] = useState<string[]>([])
  const [loadingFailed, setLoadingFailed] = useState(false)
  const [resendingFailed, setResendingFailed] = useState(false)

  const openFailed = async (campaign: NewsletterCampaign) => {
    try {
      setLoadingFailed(true)
      setFailedCampaign(campaign)
      const data = await getNewsletterCampaignFailures(campaign.id, 1, 100)
      setFailedRecipients(data.recipients)
      setFailedTotal(data.total)
      setSelectedFailedIds([])
      setFailedOpen(true)
    } catch {
      toast.error('Failed to load campaign failures')
    } finally {
      setLoadingFailed(false)
    }
  }

  const toggleFailed = (deliveryId: string, checked: boolean) =>
    setSelectedFailedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, deliveryId]))
        : prev.filter((id) => id !== deliveryId),
    )

  const resendFailed = async (selectedOnly: boolean) => {
    if (!failedCampaign) return
    try {
      setResendingFailed(true)
      const response = await resendNewsletterCampaignFailures(
        failedCampaign.id,
        selectedOnly ? selectedFailedIds : undefined,
      )
      toast.success(`Re-queued ${response.queuedCount} failed recipients`)
      const data = await getNewsletterCampaignFailures(failedCampaign.id, 1, 100)
      setFailedRecipients(data.recipients)
      setFailedTotal(data.total)
      setSelectedFailedIds([])
      await invalidateNewsletter()
    } catch {
      toast.error('Failed to resend failed recipients')
    } finally {
      setResendingFailed(false)
    }
  }

  const invalidateNewsletter = () =>
    queryClient.invalidateQueries({
      queryKey: ['communications', 'newsletter-campaigns'],
    })
  const invalidatePush = () => {
    queryClient.invalidateQueries({
      queryKey: ['communications', 'push-campaigns'],
    })
    queryClient.invalidateQueries({
      queryKey: ['communications', 'push-drafts'],
    })
  }

  // ── Newsletter actions ───────────────────────────────────────────
  const openNlDetails = async (campaignId: string) => {
    try {
      setNlDetailsLoading(true)
      setNlDetailsOpen(true)
      const data = await getNewsletterCampaignDetails(campaignId)
      setNlDetails(data.campaign)
    } catch (error) {
      setNlDetailsOpen(false)
      toast.error(getApiErrorMessage(error, 'Failed to load campaign details'))
    } finally {
      setNlDetailsLoading(false)
    }
  }

  const runNl = async (
    id: string,
    fn: () => Promise<unknown>,
    ok: string,
    fail: string,
  ) => {
    try {
      setActionId(id)
      await fn()
      toast.success(ok)
      await invalidateNewsletter()
    } catch (error) {
      toast.error(getApiErrorMessage(error, fail))
    } finally {
      setActionId(null)
    }
  }

  // ── Push actions ─────────────────────────────────────────────────
  const runPush = async (
    id: string,
    fn: () => Promise<unknown>,
    ok: string,
    fail: string,
  ) => {
    try {
      setActionId(id)
      await fn()
      toast.success(ok)
      invalidatePush()
    } catch (error) {
      toast.error(getApiErrorMessage(error, fail))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {(
          [
            { v: 'email', label: 'Newsletter', icon: <Mail className="h-4 w-4" /> },
            { v: 'push', label: 'Push', icon: <Bell className="h-4 w-4" /> },
          ] as { v: Channel; label: string; icon: JSX.Element }[]
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setChannel(t.v)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
              channel === t.v
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {channel === 'email' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Newsletter Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/80">
                  <tr>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-left">Rate</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Total</th>
                    <th className="px-3 py-2 text-left">Sent</th>
                    <th className="px-3 py-2 text-left">Failed</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {newsletterCampaigns.map((campaign: NewsletterCampaign) => (
                    <tr key={campaign.id} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        <button
                          type="button"
                          className="cursor-pointer text-left font-bold text-black underline-offset-2 hover:underline"
                          onClick={() => openNlDetails(campaign.id)}
                        >
                          {campaign.subject}
                        </button>
                        {campaign.smtpRateLimitWarning && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            SMTP throttled
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{campaign.emailsPerMinute}/min</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            campaign.status === 'PAUSED'
                              ? 'destructive'
                              : campaign.status === 'DRAFT'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{campaign.totalRecipients}</td>
                      <td className="px-3 py-2 text-green-700">
                        {campaign.sentCount}
                      </td>
                      <td className="px-3 py-2 font-medium text-red-600">
                        {campaign.failedCount}
                      </td>
                      <td className="px-3 py-2">
                        {new Date(campaign.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {campaign.status === 'DRAFT' ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionId === campaign.id}
                                onClick={() => onEditEmailDraft(campaign.id)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                disabled={actionId === campaign.id}
                                onClick={() =>
                                  runNl(
                                    campaign.id,
                                    () => sendNewsletterDraft(campaign.id),
                                    'Draft sent',
                                    'Failed to send draft',
                                  )
                                }
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Send
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={actionId === campaign.id}
                                onClick={() =>
                                  runNl(
                                    campaign.id,
                                    () => deleteNewsletterDraft(campaign.id),
                                    'Draft deleted',
                                    'Failed to delete draft',
                                  )
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionId === campaign.id}
                                onClick={() =>
                                  campaign.status === 'PAUSED'
                                    ? runNl(
                                        campaign.id,
                                        () =>
                                          resumeNewsletterCampaign(campaign.id),
                                        'Campaign resumed',
                                        'Failed to resume campaign',
                                      )
                                    : runNl(
                                        campaign.id,
                                        () =>
                                          pauseNewsletterCampaign(campaign.id),
                                        'Campaign paused',
                                        'Failed to pause campaign',
                                      )
                                }
                              >
                                {campaign.status === 'PAUSED' ? (
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                ) : (
                                  <PauseCircle className="mr-2 h-4 w-4" />
                                )}
                                {campaign.status === 'PAUSED'
                                  ? 'Resume'
                                  : 'Pause'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  campaign.failedCount < 1 ||
                                  loadingFailed ||
                                  actionId === campaign.id
                                }
                                onClick={() => openFailed(campaign)}
                              >
                                View failed
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {newsletterCampaigns.length === 0 && (
                    <tr>
                      <td
                        className="text-muted-foreground px-3 py-6 text-center"
                        colSpan={8}
                      >
                        No newsletter campaigns yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {channel === 'push' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Push Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              {pushDraftsData?.drafts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No drafts yet.</p>
              ) : (
                <div className="space-y-2">
                  {pushDraftsData?.drafts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{d.title}</div>
                        <div className="text-muted-foreground line-clamp-1 text-xs">
                          {d.body}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Updated {new Date(d.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditPushDraft(d.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          disabled={actionId === d.id}
                          onClick={() =>
                            runPush(
                              d.id,
                              () => sendPushDraft(d.id),
                              'Draft queued',
                              'Failed to send draft',
                            )
                          }
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionId === d.id}
                          onClick={() =>
                            runPush(
                              d.id,
                              () => deletePushDraft(d.id),
                              'Draft deleted',
                              'Failed to delete draft',
                            )
                          }
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Push Campaigns</span>
                <span className="text-muted-foreground text-xs">
                  Live counters refresh every 5s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="pb-2 pr-2">Title</th>
                      <th className="pb-2 pr-2">Status</th>
                      <th className="pb-2 pr-2">Sent</th>
                      <th className="pb-2 pr-2">Failed</th>
                      <th className="pb-2 pr-2">Total</th>
                      <th className="pb-2 pr-2">Created</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pushCampaignsData?.campaigns.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-2 font-medium">{c.title}</td>
                        <td className="py-2 pr-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PUSH_STATUS_BADGE[c.status]}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2 pr-2">{c.sentCount}</td>
                        <td className="py-2 pr-2">
                          {c.failedCount > 0 ? (
                            <span className="text-red-600">{c.failedCount}</span>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="py-2 pr-2">{c.totalRecipients}</td>
                        <td className="text-muted-foreground py-2 pr-2 text-xs">
                          {new Date(c.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Details"
                              onClick={() => setPushDetails(c)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {c.status === 'ACTIVE' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Pause"
                                onClick={() =>
                                  runPush(
                                    c.id,
                                    () => pausePushCampaign(c.id),
                                    'Campaign paused',
                                    'Failed to pause',
                                  )
                                }
                              >
                                <PauseCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {c.status === 'PAUSED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Resume"
                                onClick={() =>
                                  runPush(
                                    c.id,
                                    () => resumePushCampaign(c.id),
                                    'Campaign resumed',
                                    'Failed to resume',
                                  )
                                }
                              >
                                <PlayCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Cancel"
                                onClick={() =>
                                  runPush(
                                    c.id,
                                    () => cancelPushCampaign(c.id),
                                    'Campaign canceled',
                                    'Failed to cancel',
                                  )
                                }
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {c.failedCount > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Resend failed"
                                onClick={() =>
                                  runPush(
                                    c.id,
                                    () => resendPushFailures(c.id),
                                    'Re-queued failed deliveries',
                                    'Failed to resend',
                                  )
                                }
                              >
                                <RefreshCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pushCampaignsData?.campaigns.length === 0 && (
                      <tr>
                        <td
                          className="text-muted-foreground px-3 py-6 text-center"
                          colSpan={7}
                        >
                          No push campaigns yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Newsletter details dialog */}
      <Dialog
        open={nlDetailsOpen}
        onOpenChange={(open) => {
          setNlDetailsOpen(open)
          if (!open) setNlDetails(null)
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{nlDetails?.subject || 'Campaign details'}</DialogTitle>
            <DialogDescription>
              {nlDetails
                ? `Created ${new Date(nlDetails.createdAt).toLocaleString()} • ${
                    nlDetails.totalRecipients
                  } recipients`
                : 'Loading campaign details'}
            </DialogDescription>
          </DialogHeader>
          {nlDetailsLoading ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              Loading campaign message...
            </div>
          ) : nlDetails ? (
            <div className="space-y-3">
              <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
                <p>
                  <span className="font-semibold">Rate:</span>{' '}
                  {nlDetails.emailsPerMinute}/min
                </p>
                <p>
                  <span className="font-semibold">Status:</span>{' '}
                  {nlDetails.status}
                </p>
                <p>
                  <span className="font-semibold">Sent:</span>{' '}
                  {nlDetails.sentCount}
                </p>
                <p>
                  <span className="font-semibold">Failed:</span>{' '}
                  {nlDetails.failedCount}
                </p>
              </div>
              <div className="max-h-[420px] overflow-y-auto rounded-md border bg-white p-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: nlDetails.html || '<p>No message content.</p>',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground py-10 text-center text-sm">
              Campaign details unavailable.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Push details dialog */}
      <Dialog
        open={!!pushDetails}
        onOpenChange={(o) => !o && setPushDetails(null)}
      >
        <DialogContent className="max-w-2xl">
          {pushDetailsFull && (
            <>
              <DialogHeader>
                <DialogTitle>{pushDetailsFull.title}</DialogTitle>
                <DialogDescription>{pushDetailsFull.body}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {pushDetailsQuery.isLoading && (
                  <div className="text-muted-foreground text-xs">
                    Loading full campaign…
                  </div>
                )}
                <div>
                  <strong>Mode:</strong> {pushDetailsFull.targetMode}
                </div>
                {(pushDetailsFull.topics ?? []).length > 0 && (
                  <div>
                    <strong>Topics:</strong>{' '}
                    {(pushDetailsFull.topics ?? []).join(', ')}
                  </div>
                )}
                {(pushDetailsFull.userIds ?? []).length > 0 && (
                  <div>
                    <strong>User IDs:</strong>{' '}
                    {(pushDetailsFull.userIds ?? []).length} user(s)
                  </div>
                )}
                <div>
                  <strong>Surfaces:</strong>{' '}
                  {(pushDetailsFull.surfaces ?? []).join(', ') || '—'}
                </div>
                <div>
                  <strong>Device platforms:</strong>{' '}
                  {(pushDetailsFull.platforms ?? []).join(', ') || 'all'}
                </div>
                {pushDetailsFull.deepLink && (
                  <div>
                    <strong>Deep link:</strong> {pushDetailsFull.deepLink}
                  </div>
                )}
                <div className="flex gap-4 pt-2 text-sm">
                  <Stat
                    label="Total"
                    value={pushDetailsFull.totalRecipients ?? 0}
                  />
                  <Stat
                    label="Sent"
                    value={pushDetailsFull.sentCount ?? 0}
                    color="text-green-600"
                  />
                  <Stat
                    label="Failed"
                    value={pushDetailsFull.failedCount ?? 0}
                    color="text-red-600"
                  />
                  <Stat
                    label="Queued"
                    value={pushDetailsFull.queuedCount ?? 0}
                    color="text-blue-600"
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Newsletter failed-recipients dialog */}
      <Dialog open={failedOpen} onOpenChange={setFailedOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Failed Recipients</DialogTitle>
            <DialogDescription>
              Campaign: {failedCampaign?.subject || '-'} | Failed: {failedTotal}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Select</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Attempts</th>
                  <th className="px-3 py-2 text-left">Last Error</th>
                  <th className="px-3 py-2 text-left">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {failedRecipients.map((recipient) => (
                  <tr key={recipient.id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedFailedIds.includes(recipient.id)}
                        onCheckedChange={(checked) =>
                          toggleFailed(recipient.id, checked === true)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{recipient.email}</td>
                    <td className="px-3 py-2">{recipient.attempts}</td>
                    <td className="px-3 py-2 text-red-700">
                      {recipient.lastError || 'Unknown error'}
                    </td>
                    <td className="px-3 py-2">
                      {recipient.lastAttemptAt
                        ? new Date(recipient.lastAttemptAt).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
                {failedRecipients.length === 0 && (
                  <tr>
                    <td
                      className="text-muted-foreground px-3 py-6 text-center"
                      colSpan={5}
                    >
                      No failed recipients available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => resendFailed(false)}
              disabled={failedRecipients.length === 0 || resendingFailed}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Resend all failed
            </Button>
            <Button
              variant="destructive"
              onClick={() => resendFailed(true)}
              disabled={selectedFailedIds.length === 0 || resendingFailed}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Resend selected
            </Button>
          </DialogFooter>
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
    <div className="text-muted-foreground text-xs">{label}</div>
  </div>
)

export default CommunicationsHistory
