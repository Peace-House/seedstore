import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlertTriangle,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Link2,
  Eye,
  Send,
  Mail,
  Users,
  Filter,
  History,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Save,
  Trash2,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getNewsletterBooks,
  getNewsletterCountries,
  getNewsletterCampaignDetails,
  getNewsletterCampaigns,
  getNewsletterCampaignFailures,
  getUsers,
  pauseNewsletterCampaign,
  previewNewsletterRecipients,
  resendNewsletterCampaignFailures,
  resumeNewsletterCampaign,
  sendNewsletter,
  saveNewsletterDraft,
  updateNewsletterDraft,
  sendNewsletterDraft,
  deleteNewsletterDraft,
  type NewsletterCampaign,
  type NewsletterCampaignDetails,
  type NewsletterFailureRecipient,
  type NewsletterBookReadingStatus,
  type NewsletterCountryOption,
  type NewsletterPreviewFilters,
  type NewsletterPreviewResponse,
  type NewsletterReaderLevel,
  type NewsletterTargetMode,
} from '@/services/user'

const TOOLBAR_BUTTON_CLASS =
  'rounded-md border px-2 py-1 text-sm transition-colors hover:bg-muted'
const DEFAULT_NEWSLETTER_HTML =
  '<p>Dear Valued User,</p><p></p><p>We trust you are well.</p><p></p><p>Warm regards,<br/>The Livingseed Team</p>'

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { data?: { error?: string } } }).response?.data
      ?.error
  ) {
    return (error as { response?: { data?: { error?: string } } }).response
      ?.data?.error as string
  }

  return fallback
}

const NewsletterManagement = () => {
  const queryClient = useQueryClient()
  const [targetMode, setTargetMode] = useState<NewsletterTargetMode>('all')
  const [emailsPerMinute, setEmailsPerMinute] = useState('20')
  const [subject, setSubject] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeInDays, setActiveInDays] = useState('')
  const [inactiveInDays, setInactiveInDays] = useState('')
  const [readerLevel, setReaderLevel] = useState<NewsletterReaderLevel | ''>('')
  const [recentBuyerDays, setRecentBuyerDays] = useState('')
  const [minSpending, setMinSpending] = useState('')
  const [cartAbandonersOnly, setCartAbandonersOnly] = useState(false)
  const [multiBuyersOnly, setMultiBuyersOnly] = useState(false)
  const [freeContentOnly, setFreeContentOnly] = useState(false)
  const [bookId, setBookId] = useState('')
  const [bookReadingStatus, setBookReadingStatus] = useState<
    NewsletterBookReadingStatus | ''
  >('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [multiGenreOnly, setMultiGenreOnly] = useState(false)
  const [peerLenderOnly, setPeerLenderOnly] = useState(false)
  const [peerBorrowerOnly, setPeerBorrowerOnly] = useState(false)
  const [groupBuyerOnly, setGroupBuyerOnly] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [platform, setPlatform] = useState<'web' | 'mobile' | 'all'>('all')
  const [emailVerified, setEmailVerified] = useState<'all' | 'true' | 'false'>(
    'all',
  )
  const [promotionOptedIn, setPromotionOptedIn] = useState<
    'all' | 'true' | 'false'
  >('all')
  const [hasPhcode, setHasPhcode] = useState<'all' | 'true' | 'false'>('all')
  const [pastedEmailsInput, setPastedEmailsInput] = useState('')
  const [manualSearch, setManualSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)
  const [previewData, setPreviewData] =
    useState<NewsletterPreviewResponse | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [failedDialogOpen, setFailedDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] =
    useState<NewsletterCampaign | null>(null)
  const [failedRecipients, setFailedRecipients] = useState<
    NewsletterFailureRecipient[]
  >([])
  const [failedRecipientsTotal, setFailedRecipientsTotal] = useState(0)
  const [selectedFailedRecipientIds, setSelectedFailedRecipientIds] = useState<
    string[]
  >([])
  const [isLoadingFailures, setIsLoadingFailures] = useState(false)
  const [isResendingFailures, setIsResendingFailures] = useState(false)
  const [campaignActionId, setCampaignActionId] = useState<string | null>(null)
  const [campaignDetailsOpen, setCampaignDetailsOpen] = useState(false)
  const [campaignDetailsLoading, setCampaignDetailsLoading] = useState(false)
  const [selectedCampaignDetails, setSelectedCampaignDetails] =
    useState<NewsletterCampaignDetails | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: DEFAULT_NEWSLETTER_HTML,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[320px] rounded-b-md border border-t-0 px-4 py-3 focus:outline-none',
      },
    },
  })

  const { data: books = [] } = useQuery({
    queryKey: ['newsletter-books'],
    queryFn: getNewsletterBooks,
  })

  const { data: countriesWithUsers = [] } = useQuery({
    queryKey: ['newsletter-countries-with-users'],
    queryFn: getNewsletterCountries,
  })

  const { data: usersPage } = useQuery({
    queryKey: ['newsletter-users'],
    queryFn: async () => getUsers(1, 250),
    enabled: targetMode === 'manual',
  })

  const { data: campaignsData, refetch: refetchCampaigns } = useQuery({
    queryKey: ['newsletter-campaigns'],
    queryFn: async () => getNewsletterCampaigns(1, 20),
  })

  const campaigns = campaignsData?.campaigns || []

  const users = useMemo(() => usersPage?.users || [], [usersPage?.users])
  const genreOptions = useMemo(() => {
    return Array.from(
      new Set(
        books
          .map((book) => book.genre?.trim())
          .filter((genre): genre is string => Boolean(genre)),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [books])

  const countryOptions = useMemo(() => {
    return countriesWithUsers
      .map((country: NewsletterCountryOption) => ({
        id: country.id,
        name: country.name,
        userCount: country.userCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [countriesWithUsers])

  const filteredCountryOptions = useMemo(() => {
    const search = countrySearch.trim().toLowerCase()
    if (!search) return countryOptions

    return countryOptions.filter((country) => {
      return (
        country.name.toLowerCase().includes(search) ||
        country.id.toLowerCase().includes(search)
      )
    })
  }, [countryOptions, countrySearch])

  const filteredUsers = useMemo(() => {
    const search = manualSearch.trim().toLowerCase()
    if (!search) return users
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
      return (
        user.email.toLowerCase().includes(search) ||
        fullName.includes(search) ||
        String(user.id).includes(search)
      )
    })
  }, [users, manualSearch])

  const pastedEmails = useMemo(
    () =>
      pastedEmailsInput
        .split(/[\n,;\s]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    [pastedEmailsInput],
  )

  const editorHtml = editor?.getHTML() || '<p></p>'

  const previewRecipientCount = previewData?.total || 0

  const buildFilters = (
    extra?: Partial<NewsletterPreviewFilters>,
  ): NewsletterPreviewFilters => {
    const filters: NewsletterPreviewFilters = {
      targetMode,
      emailsPerMinute: emailsPerMinute ? Number(emailsPerMinute) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      activeInDays: activeInDays ? Number(activeInDays) : undefined,
      inactiveInDays: inactiveInDays ? Number(inactiveInDays) : undefined,
      readerLevel: readerLevel || undefined,
      recentBuyerDays: recentBuyerDays ? Number(recentBuyerDays) : undefined,
      minSpending: minSpending ? Number(minSpending) : undefined,
      cartAbandonersOnly,
      multiBuyersOnly,
      freeContentOnly,
      bookId: bookId ? Number(bookId) : undefined,
      bookReadingStatus: bookReadingStatus || undefined,
      genres: selectedGenres,
      multiGenreOnly,
      peerLenderOnly,
      peerBorrowerOnly,
      groupBuyerOnly,
      countries: selectedCountries,
      platform,
      emailVerified:
        emailVerified === 'all' ? undefined : emailVerified === 'true',
      promotionOptedIn:
        promotionOptedIn === 'all' ? undefined : promotionOptedIn === 'true',
      hasPhcode: hasPhcode === 'all' ? undefined : hasPhcode === 'true',
      userIds: targetMode === 'manual' ? selectedUserIds : undefined,
      pastedEmails: targetMode === 'pasted-emails' ? pastedEmails : undefined,
      ...extra,
    }

    return filters
  }

  const populateFormFromDraft = (
    campaign: NewsletterCampaignDetails,
    filters: NewsletterPreviewFilters,
  ) => {
    setTargetMode(filters.targetMode ?? 'all')
    setEmailsPerMinute(
      String(filters.emailsPerMinute ?? campaign.emailsPerMinute ?? 20),
    )
    setSubject(campaign.subject || '')
    setDateFrom(filters.dateFrom || '')
    setDateTo(filters.dateTo || '')
    setActiveInDays(
      filters.activeInDays !== undefined ? String(filters.activeInDays) : '',
    )
    setInactiveInDays(
      filters.inactiveInDays !== undefined
        ? String(filters.inactiveInDays)
        : '',
    )
    setReaderLevel(filters.readerLevel || '')
    setRecentBuyerDays(
      filters.recentBuyerDays !== undefined
        ? String(filters.recentBuyerDays)
        : '',
    )
    setMinSpending(
      filters.minSpending !== undefined ? String(filters.minSpending) : '',
    )
    setCartAbandonersOnly(filters.cartAbandonersOnly === true)
    setMultiBuyersOnly(filters.multiBuyersOnly === true)
    setFreeContentOnly(filters.freeContentOnly === true)
    setBookId(filters.bookId !== undefined ? String(filters.bookId) : '')
    setBookReadingStatus(filters.bookReadingStatus || '')
    setSelectedGenres(filters.genres || [])
    setMultiGenreOnly(filters.multiGenreOnly === true)
    setPeerLenderOnly(filters.peerLenderOnly === true)
    setPeerBorrowerOnly(filters.peerBorrowerOnly === true)
    setGroupBuyerOnly(filters.groupBuyerOnly === true)
    setSelectedCountries(filters.countries || [])
    setPlatform(filters.platform || 'all')
    setEmailVerified(
      filters.emailVerified === undefined
        ? 'all'
        : filters.emailVerified
          ? 'true'
          : 'false',
    )
    setPromotionOptedIn(
      filters.promotionOptedIn === undefined
        ? 'all'
        : filters.promotionOptedIn
          ? 'true'
          : 'false',
    )
    setHasPhcode(
      filters.hasPhcode === undefined ? 'all' : filters.hasPhcode ? 'true' : 'false',
    )
    setSelectedUserIds(filters.userIds || [])
    setPastedEmailsInput((filters.pastedEmails || []).join('\n'))
    setManualSearch('')
    setPreviewData(null)
    editor?.commands.setContent(campaign.html || '<p></p>')
  }

  const resetComposerAndFilters = () => {
    setTargetMode('all')
    setEmailsPerMinute('20')
    setSubject('')
    setDateFrom('')
    setDateTo('')
    setActiveInDays('')
    setInactiveInDays('')
    setReaderLevel('')
    setRecentBuyerDays('')
    setMinSpending('')
    setCartAbandonersOnly(false)
    setMultiBuyersOnly(false)
    setFreeContentOnly(false)
    setBookId('')
    setBookReadingStatus('')
    setSelectedGenres([])
    setMultiGenreOnly(false)
    setPeerLenderOnly(false)
    setPeerBorrowerOnly(false)
    setGroupBuyerOnly(false)
    setSelectedCountries([])
    setCountrySearch('')
    setIsCountryDropdownOpen(false)
    setPlatform('all')
    setEmailVerified('all')
    setPromotionOptedIn('all')
    setHasPhcode('all')
    setPastedEmailsInput('')
    setManualSearch('')
    setSelectedUserIds([])
    setPreviewData(null)
    setPreviewOpen(false)
    setEditingDraftId(null)
    editor?.commands.setContent(DEFAULT_NEWSLETTER_HTML)
  }

  const handlePreviewRecipients = async () => {
    try {
      setIsPreviewing(true)
      const data = await previewNewsletterRecipients(
        buildFilters({ page: 1, pageSize: 50 }),
      )
      setPreviewData(data)
      setPreviewOpen(true)
    } catch (error) {
      toast.error('Failed to preview recipients')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleSendNewsletter = async () => {
    if (!subject.trim()) {
      toast.error('Please enter an email subject')
      return
    }

    if (!editor || editor.isEmpty) {
      toast.error('Please add email content before sending')
      return
    }

    const configuredRate = Number(emailsPerMinute)
    if (
      !Number.isInteger(configuredRate) ||
      configuredRate < 1 ||
      configuredRate > 30
    ) {
      toast.error('Emails per minute must be an integer between 1 and 30')
      return
    }

    try {
      setIsSending(true)
      const response = await sendNewsletter({
        ...buildFilters(),
        subject: subject.trim(),
        html: editor.getHTML(),
      })

      toast.success(`Newsletter queued for ${response.queuedCount} recipients`)
      setSendConfirmOpen(false)
      await handlePreviewRecipients()
      await refetchCampaigns()
    } catch (error) {
      toast.error('Failed to queue newsletter')
    } finally {
      setIsSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      toast.error('Please enter an email subject')
      return
    }

    if (!editor || editor.isEmpty) {
      toast.error('Please add email content before saving')
      return
    }

    const configuredRate = Number(emailsPerMinute)
    if (
      !Number.isInteger(configuredRate) ||
      configuredRate < 1 ||
      configuredRate > 30
    ) {
      toast.error('Emails per minute must be an integer between 1 and 30')
      return
    }

    try {
      setIsSavingDraft(true)
      const payload = {
        ...buildFilters(),
        subject: subject.trim(),
        html: editor.getHTML(),
      }

      if (editingDraftId) {
        await updateNewsletterDraft(editingDraftId, payload)
        toast.success('Draft updated')
      } else {
        const response = await saveNewsletterDraft(payload)
        setEditingDraftId(response.campaignId)
        toast.success('Draft saved')
      }

      await refetchCampaigns()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save draft'))
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleSendDraft = async (campaignId: string) => {
    try {
      setCampaignActionId(campaignId)
      const response = await sendNewsletterDraft(campaignId)
      toast.success(
        `Draft sent — queued for ${response.queuedCount} recipients`,
      )
      if (editingDraftId === campaignId) {
        setEditingDraftId(null)
      }
      await refetchCampaigns()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to send draft'))
    } finally {
      setCampaignActionId(null)
    }
  }

  const handleDeleteDraft = async (campaignId: string) => {
    try {
      setCampaignActionId(campaignId)
      await deleteNewsletterDraft(campaignId)
      toast.success('Draft deleted')
      if (editingDraftId === campaignId) {
        setEditingDraftId(null)
      }
      await refetchCampaigns()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete draft'))
    } finally {
      setCampaignActionId(null)
    }
  }

  const toggleGenre = (genre: string, checked: boolean) => {
    setSelectedGenres((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, genre]))
      }
      return prev.filter((value) => value !== genre)
    })
  }

  const toggleCountry = (country: string, checked: boolean) => {
    setSelectedCountries((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, country]))
      }
      return prev.filter((value) => value !== country)
    })
  }

  const handleToggleUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, userId])))
      return
    }
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId))
  }

  const applyLink = () => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previousUrl || 'https://')

    if (url === null) return

    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url.trim() })
      .run()
  }

  const handleEditDraft = async (campaignId: string) => {
    try {
      setCampaignActionId(campaignId)
      const { campaign } = await getNewsletterCampaignDetails(campaignId)

      if (campaign.status !== 'DRAFT') {
        toast.error('Only drafts can be edited')
        return
      }

      const filters = (campaign.filters || {}) as NewsletterPreviewFilters
      populateFormFromDraft(campaign, filters)
      setEditingDraftId(campaignId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast.success('Draft loaded into editor')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load draft'))
    } finally {
      setCampaignActionId(null)
    }
  }

  const openFailedRecipients = async (campaign: NewsletterCampaign) => {
    try {
      setIsLoadingFailures(true)
      setSelectedCampaign(campaign)
      const data = await getNewsletterCampaignFailures(campaign.id, 1, 100)
      setFailedRecipients(data.recipients)
      setFailedRecipientsTotal(data.total)
      setSelectedFailedRecipientIds([])
      setFailedDialogOpen(true)
    } catch (error) {
      toast.error('Failed to load campaign failures')
    } finally {
      setIsLoadingFailures(false)
    }
  }

  const toggleFailedRecipientSelection = (
    deliveryId: string,
    checked: boolean,
  ) => {
    if (checked) {
      setSelectedFailedRecipientIds((prev) =>
        Array.from(new Set([...prev, deliveryId])),
      )
      return
    }
    setSelectedFailedRecipientIds((prev) =>
      prev.filter((id) => id !== deliveryId),
    )
  }

  const handleResendFailed = async (selectedOnly: boolean) => {
    if (!selectedCampaign) return

    try {
      setIsResendingFailures(true)
      const response = await resendNewsletterCampaignFailures(
        selectedCampaign.id,
        selectedOnly ? selectedFailedRecipientIds : undefined,
      )

      toast.success(`Re-queued ${response.queuedCount} failed recipients`)

      const [failuresData] = await Promise.all([
        getNewsletterCampaignFailures(selectedCampaign.id, 1, 100),
        refetchCampaigns(),
        queryClient.invalidateQueries({ queryKey: ['newsletter-campaigns'] }),
      ])

      setFailedRecipients(failuresData.recipients)
      setFailedRecipientsTotal(failuresData.total)
      setSelectedFailedRecipientIds([])
    } catch (error) {
      toast.error('Failed to resend failed recipients')
    } finally {
      setIsResendingFailures(false)
    }
  }

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      setCampaignActionId(campaignId)
      await pauseNewsletterCampaign(campaignId)
      toast.success('Campaign paused')
      await queryClient.invalidateQueries({
        queryKey: ['newsletter-campaigns'],
      })
      await refetchCampaigns()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to pause campaign'))
    } finally {
      setCampaignActionId(null)
    }
  }

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      setCampaignActionId(campaignId)
      await resumeNewsletterCampaign(campaignId)
      toast.success('Campaign resumed')
      await queryClient.invalidateQueries({
        queryKey: ['newsletter-campaigns'],
      })
      await refetchCampaigns()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to resume campaign'))
    } finally {
      setCampaignActionId(null)
    }
  }

  const handleOpenCampaignDetails = async (campaignId: string) => {
    try {
      setCampaignDetailsLoading(true)
      setCampaignDetailsOpen(true)
      const data = await getNewsletterCampaignDetails(campaignId)
      setSelectedCampaignDetails(data.campaign)
    } catch (error) {
      setCampaignDetailsOpen(false)
      toast.error(getApiErrorMessage(error, 'Failed to load campaign details'))
    } finally {
      setCampaignDetailsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-slate-50 via-white to-slate-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Mail className="h-6 w-6" />
              Newsletter Center
            </h2>
            <p className="text-muted-foreground text-sm">
              Segment users dynamically and send rich email campaigns from
              admin.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">
              Preview recipients:{' '}
              <span className="text-red-600">{previewRecipientCount}</span>
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Campaign History
          </CardTitle>
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
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-bold text-black underline-offset-2 hover:underline"
                        onClick={() => handleOpenCampaignDetails(campaign.id)}
                      >
                        {campaign.subject}
                      </button>
                      {campaign.smtpRateLimitWarning && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          SMTP throttled
                        </span>
                      )}
                      {campaign.smtpRateLimitWarningMessage && (
                        <p className="mt-1 text-xs text-amber-700">
                          {campaign.smtpRateLimitWarningMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {campaign.emailsPerMinute}/min
                    </td>
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
                              disabled={campaignActionId === campaign.id}
                              onClick={() => handleEditDraft(campaign.id)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={campaignActionId === campaign.id}
                              onClick={() => handleSendDraft(campaign.id)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={campaignActionId === campaign.id}
                              onClick={() => handleDeleteDraft(campaign.id)}
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
                              disabled={campaignActionId === campaign.id}
                              onClick={() =>
                                campaign.status === 'PAUSED'
                                  ? handleResumeCampaign(campaign.id)
                                  : handlePauseCampaign(campaign.id)
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
                                isLoadingFailures ||
                                campaignActionId === campaign.id
                              }
                              onClick={() => openFailedRecipients(campaign)}
                            >
                              View failed
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td
                      className="text-muted-foreground px-3 py-6 text-center"
                      colSpan={8}
                    >
                      No campaigns yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Targeting Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Target mode</Label>
              <Select
                value={targetMode}
                onValueChange={(value) =>
                  setTargetMode(value as NewsletterTargetMode)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="manual">Specific users</SelectItem>
                  <SelectItem value="pasted-emails">
                    Pasted emails only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date from</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date to</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Active in days</Label>
                <Input
                  placeholder="e.g. 30"
                  value={activeInDays}
                  onChange={(e) => setActiveInDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Inactive in days</Label>
                <Input
                  placeholder="e.g. 180"
                  value={inactiveInDays}
                  onChange={(e) => setInactiveInDays(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reader level</Label>
              <Select
                value={readerLevel || 'all'}
                onValueChange={(value) =>
                  setReaderLevel(
                    value === 'all' ? '' : (value as NewsletterReaderLevel),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="active">Active readers</SelectItem>
                  <SelectItem value="heavy">Heavy readers</SelectItem>
                  <SelectItem value="reviewers">Reviewers</SelectItem>
                  <SelectItem value="annotators">Annotators</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Recent buyer days</Label>
                <Input
                  placeholder="e.g. 90"
                  value={recentBuyerDays}
                  onChange={(e) => setRecentBuyerDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum spend</Label>
                <Input
                  placeholder="e.g. 50000"
                  value={minSpending}
                  onChange={(e) => setMinSpending(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Book</Label>
              <Select
                value={bookId || 'all'}
                onValueChange={(value) =>
                  setBookId(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All books" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All books</SelectItem>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={String(book.id)}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Book reading status</Label>
              <Select
                value={bookReadingStatus || 'all'}
                onValueChange={(value) =>
                  setBookReadingStatus(
                    value === 'all'
                      ? ''
                      : (value as NewsletterBookReadingStatus),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="reading">Reading selected book</SelectItem>
                  <SelectItem value="purchased-not-reading">
                    Bought but not reading
                  </SelectItem>
                  <SelectItem value="finished">
                    Finished selected book
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Genres</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedGenres.length > 0
                      ? `${selectedGenres.length} selected`
                      : 'All genres'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 w-72 overflow-y-auto" align="start">
                  {genreOptions.length > 0 ? (
                    genreOptions.map((genre) => (
                      <DropdownMenuCheckboxItem
                        key={genre}
                        checked={selectedGenres.includes(genre)}
                        onCheckedChange={(checked) =>
                          toggleGenre(genre, checked === true)
                        }
                      >
                        {genre}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No genres available
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label>Countries</Label>
              <DropdownMenu
                open={isCountryDropdownOpen}
                onOpenChange={(open) => {
                  setIsCountryDropdownOpen(open)
                  if (!open) {
                    setCountrySearch('')
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedCountries.length > 0
                      ? `${selectedCountries.length} selected`
                      : 'All countries'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 w-72 overflow-y-auto" align="start">
                  <div className="p-2">
                    <Input
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Search countries..."
                    />
                  </div>
                  {filteredCountryOptions.length > 0 ? (
                    filteredCountryOptions.map((country) => (
                      <DropdownMenuCheckboxItem
                        key={country.id}
                        checked={selectedCountries.includes(country.id)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) =>
                          toggleCountry(country.id, checked === true)
                        }
                      >
                        {country.name} ({country.userCount})
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No countries match your search
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={platform}
                  onValueChange={(value) =>
                    setPlatform(value as 'web' | 'mobile' | 'all')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email verified</Label>
                <Select
                  value={emailVerified}
                  onValueChange={(value) =>
                    setEmailVerified(value as 'all' | 'true' | 'false')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Verified only</SelectItem>
                    <SelectItem value="false">Unverified only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Promotions preference</Label>
              <Select
                value={promotionOptedIn}
                onValueChange={(value) =>
                  setPromotionOptedIn(value as 'all' | 'true' | 'false')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Promotion opted-in</SelectItem>
                  <SelectItem value="false">Promotion opted-out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>PHCode status</Label>
              <Select
                value={hasPhcode}
                onValueChange={(value) =>
                  setHasPhcode(value as 'all' | 'true' | 'false')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">With PHCode</SelectItem>
                  <SelectItem value="false">Without PHCode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={cartAbandonersOnly}
                  onCheckedChange={(checked) =>
                    setCartAbandonersOnly(checked === true)
                  }
                />
                Cart abandoners
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={multiBuyersOnly}
                  onCheckedChange={(checked) =>
                    setMultiBuyersOnly(checked === true)
                  }
                />
                Multi-buyers
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={freeContentOnly}
                  onCheckedChange={(checked) =>
                    setFreeContentOnly(checked === true)
                  }
                />
                Free-only buyers
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={multiGenreOnly}
                  onCheckedChange={(checked) =>
                    setMultiGenreOnly(checked === true)
                  }
                />
                Multi-genre readers
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={peerLenderOnly}
                  onCheckedChange={(checked) =>
                    setPeerLenderOnly(checked === true)
                  }
                />
                Peer lenders
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={peerBorrowerOnly}
                  onCheckedChange={(checked) =>
                    setPeerBorrowerOnly(checked === true)
                  }
                />
                Peer borrowers
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={groupBuyerOnly}
                  onCheckedChange={(checked) =>
                    setGroupBuyerOnly(checked === true)
                  }
                />
                Group buyers
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="text-lg">Email Composer</CardTitle>
            {editingDraftId && (
              <p className="text-muted-foreground text-sm">
                Editing draft campaign: <span className="font-medium">{editingDraftId}</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter newsletter subject"
              />
            </div>

            <div className="space-y-2">
              <Label>Emails per minute</Label>
              <Input
                type="number"
                min={1}
                max={30}
                step={1}
                value={emailsPerMinute}
                onChange={(e) => setEmailsPerMinute(e.target.value)}
                placeholder="20"
              />
              <p className="text-muted-foreground text-xs">
                Recommended: 20 to 30 emails per minute. Maximum allowed: 30.
              </p>
            </div>

            {targetMode === 'manual' && (
              <div className="space-y-3 rounded-lg border p-3">
                <Label>Select specific users</Label>
                <Input
                  placeholder="Search by name, email, or ID"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                />
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) =>
                          handleToggleUser(user.id, checked === true)
                        }
                      />
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-muted-foreground">
                        ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
                <Badge variant="secondary">
                  Selected: {selectedUserIds.length}
                </Badge>
              </div>
            )}

            {targetMode === 'pasted-emails' && (
              <div className="space-y-2">
                <Label>
                  Pasted emails (newline, comma, or semicolon separated)
                </Label>
                <Textarea
                  value={pastedEmailsInput}
                  onChange={(e) => setPastedEmailsInput(e.target.value)}
                  rows={6}
                  placeholder="person1@email.com\nperson2@email.com"
                />
                <Badge variant="secondary">
                  Parsed emails: {pastedEmails.length}
                </Badge>
              </div>
            )}

            <div className="rounded-md border">
              <div className="bg-muted/40 flex flex-wrap gap-2 border-b p-2">
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  type="button"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  type="button"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() =>
                    editor?.chain().focus().toggleUnderline().run()
                  }
                  type="button"
                >
                  <UnderlineIcon className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  type="button"
                >
                  <Strikethrough className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                  type="button"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                  type="button"
                >
                  <ListOrdered className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() =>
                    editor?.chain().focus().toggleBlockquote().run()
                  }
                  type="button"
                >
                  <Quote className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={applyLink}
                  type="button"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().undo().run()}
                  type="button"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().redo().run()}
                  type="button"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
              <EditorContent editor={editor} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePreviewRecipients} disabled={isPreviewing}>
                <Eye className="mr-2 h-4 w-4" />
                {isPreviewing ? 'Preparing preview...' : 'Preview Recipients'}
              </Button>
              {editingDraftId && (
                <Button variant="ghost" onClick={resetComposerAndFilters}>
                  Cancel Editing
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingDraft
                  ? 'Saving...'
                  : editingDraftId
                    ? 'Update Draft'
                    : 'Save Draft'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setSendConfirmOpen(true)}
                disabled={isSending}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Newsletter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Live Email Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 rounded-lg border p-3 text-sm">
              <p>
                <span className="font-semibold">To:</span>{' '}
                <span className="font-semibold text-red-600">
                  {previewRecipientCount || 'Not previewed'}
                </span>
              </p>
              <p>
                <span className="font-semibold">Subject:</span>{' '}
                {subject || 'No subject yet'}
              </p>
            </div>

            <div className="max-h-[420px] overflow-y-auto rounded-lg border bg-white p-4">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: editorHtml }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Recipient Preview</DialogTitle>
            <DialogDescription>
              Matching recipients for your current filters:{' '}
              {previewData?.total || 0}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Source</th>
                </tr>
              </thead>
              <tbody>
                {(previewData?.recipients || []).map((recipient, index) => (
                  <tr key={`${recipient.email}-${index}`} className="border-t">
                    <td className="px-3 py-2">{recipient.email}</td>
                    <td className="px-3 py-2">
                      {recipient.firstName || recipient.lastName
                        ? `${recipient.firstName || ''} ${
                            recipient.lastName || ''
                          }`.trim()
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{recipient.source}</Badge>
                    </td>
                  </tr>
                ))}
                {!previewData?.recipients?.length && (
                  <tr>
                    <td
                      className="text-muted-foreground px-3 py-6 text-center"
                      colSpan={3}
                    >
                      No recipients found with current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Newsletter</DialogTitle>
            <DialogDescription>
              You are about to queue this email for{' '}
              <span className="font-semibold text-red-600">
                {previewRecipientCount || 'un-previewed recipients'}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 space-y-2 rounded-md border p-3 text-sm">
            <p>
              <span className="font-semibold">Subject:</span>{' '}
              {subject || 'No subject'}
            </p>
            <p>
              <span className="font-semibold">Target mode:</span> {targetMode}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSendNewsletter}
              disabled={isSending}
            >
              {isSending ? 'Queueing...' : 'Confirm Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={campaignDetailsOpen}
        onOpenChange={(open) => {
          setCampaignDetailsOpen(open)
          if (!open) {
            setSelectedCampaignDetails(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCampaignDetails?.subject || 'Campaign details'}
            </DialogTitle>
            <DialogDescription>
              {selectedCampaignDetails
                ? `Created ${new Date(
                    selectedCampaignDetails.createdAt,
                  ).toLocaleString()} • ${
                    selectedCampaignDetails.totalRecipients
                  } recipients`
                : 'Loading campaign details'}
            </DialogDescription>
          </DialogHeader>

          {campaignDetailsLoading ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              Loading campaign message...
            </div>
          ) : selectedCampaignDetails ? (
            <div className="space-y-3">
              <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
                <p>
                  <span className="font-semibold">Rate:</span>{' '}
                  {selectedCampaignDetails.emailsPerMinute}/min
                </p>
                <p>
                  <span className="font-semibold">Status:</span>{' '}
                  {selectedCampaignDetails.status}
                </p>
                <p>
                  <span className="font-semibold">Sent:</span>{' '}
                  {selectedCampaignDetails.sentCount}
                </p>
                <p>
                  <span className="font-semibold">Failed:</span>{' '}
                  {selectedCampaignDetails.failedCount}
                </p>
              </div>
              <div className="max-h-[420px] overflow-y-auto rounded-md border bg-white p-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      selectedCampaignDetails.html ||
                      '<p>No message content.</p>',
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

      <Dialog open={failedDialogOpen} onOpenChange={setFailedDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Failed Recipients</DialogTitle>
            <DialogDescription>
              Campaign: {selectedCampaign?.subject || '-'} | Failed:{' '}
              {failedRecipientsTotal}
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
                        checked={selectedFailedRecipientIds.includes(
                          recipient.id,
                        )}
                        onCheckedChange={(checked) =>
                          toggleFailedRecipientSelection(
                            recipient.id,
                            checked === true,
                          )
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
              onClick={() => handleResendFailed(false)}
              disabled={failedRecipients.length === 0 || isResendingFailures}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Resend all failed
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResendFailed(true)}
              disabled={
                selectedFailedRecipientIds.length === 0 || isResendingFailures
              }
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

export default NewsletterManagement
