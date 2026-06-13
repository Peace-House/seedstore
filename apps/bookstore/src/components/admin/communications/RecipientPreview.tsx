import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  previewNewsletterRecipients,
  type NewsletterPreviewFilters,
  type NewsletterPreviewResponse,
} from '@/services/user'

/**
 * Shared "Preview recipients" mechanism for both channels. Resolves the
 * current targeting filters to a paginated, searchable recipient list, and
 * lets the admin exclude individuals before sending. Push uses the same user
 * list (it reaches those users' devices).
 */
export function useRecipientPreview(
  buildFilters: (extra?: Partial<NewsletterPreviewFilters>) => NewsletterPreviewFilters,
  onExcludeEmail: (email: string) => void,
) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] =
    useState<NewsletterPreviewResponse | null>(null)
  const [previewPage, setPreviewPage] = useState(1)
  const [previewPageSize, setPreviewPageSize] = useState(25)
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewSearchInput, setPreviewSearchInput] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)

  const previewRecipientCount = previewData?.total || 0
  const totalPreviewPages = Math.max(
    1,
    Math.ceil(previewRecipientCount / (previewData?.pageSize || previewPageSize)),
  )

  const previewPageNumbers = useMemo(() => {
    const start = Math.max(1, previewPage - 2)
    const end = Math.min(totalPreviewPages, start + 4)
    const adjustedStart = Math.max(1, end - 4)
    return Array.from(
      { length: end - adjustedStart + 1 },
      (_, i) => adjustedStart + i,
    )
  }, [previewPage, totalPreviewPages])

  const fetchPreviewRecipients = async (
    page: number,
    pageSize: number,
    searchTerm: string,
  ) => {
    try {
      setIsPreviewing(true)
      const data = await previewNewsletterRecipients(
        buildFilters({
          page,
          pageSize,
          searchTerm: searchTerm.trim() || undefined,
        }),
      )
      setPreviewData(data)
      setPreviewPage(data.page)
      setPreviewPageSize(data.pageSize)
      setPreviewSearch(searchTerm)
      setPreviewOpen(true)
    } catch {
      toast.error('Failed to preview recipients')
    } finally {
      setIsPreviewing(false)
    }
  }

  const openPreview = () =>
    fetchPreviewRecipients(1, previewPageSize, previewSearch)
  const submitSearch = () =>
    fetchPreviewRecipients(1, previewPageSize, previewSearchInput)
  const changePage = (nextPage: number) =>
    fetchPreviewRecipients(
      Math.min(Math.max(1, nextPage), totalPreviewPages),
      previewPageSize,
      previewSearch,
    )
  const changePageSize = (size: number) =>
    fetchPreviewRecipients(1, size, previewSearch)

  const removeRecipient = (email: string) => {
    const normalized = email.trim().toLowerCase()
    if (!normalized) return
    onExcludeEmail(normalized)
    setPreviewData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        total: Math.max(0, prev.total - 1),
        recipients: prev.recipients.filter(
          (recipient) => recipient.email.toLowerCase() !== normalized,
        ),
      }
    })
  }

  const resetPreview = () => {
    setPreviewData(null)
    setPreviewOpen(false)
    setPreviewPage(1)
    setPreviewPageSize(25)
    setPreviewSearch('')
    setPreviewSearchInput('')
  }

  return {
    previewOpen, setPreviewOpen,
    previewData,
    previewPage, previewPageSize,
    previewSearchInput, setPreviewSearchInput,
    isPreviewing,
    previewRecipientCount,
    totalPreviewPages,
    previewPageNumbers,
    openPreview, submitSearch, changePage, changePageSize, removeRecipient,
    resetPreview,
  }
}

export type RecipientPreview = ReturnType<typeof useRecipientPreview>

export const RecipientPreviewDialog = ({ rp }: { rp: RecipientPreview }) => {
  return (
    <Dialog open={rp.previewOpen} onOpenChange={rp.setPreviewOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Recipient Preview</DialogTitle>
          <DialogDescription>
            Matching recipients for your current filters:{' '}
            {rp.previewData?.total || 0}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-md">
            <Label>Search recipients</Label>
            <div className="mt-1 flex gap-2">
              <Input
                className="rounded-full"
                value={rp.previewSearchInput}
                onChange={(e) => rp.setPreviewSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    rp.submitSearch()
                  }
                }}
                placeholder="Search by email, name, or ID"
              />
              <Button
                variant="default"
                onClick={rp.submitSearch}
                disabled={rp.isPreviewing}
                className="rounded-full"
              >
                Search
              </Button>
            </div>
          </div>

          <div className="w-full md:w-52">
            <Label>Items per page</Label>
            <Select
              value={String(rp.previewPageSize)}
              onValueChange={(value) => rp.changePageSize(Number(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 200, 300, 400, 500, 1000].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/80 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">S/N</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {(rp.previewData?.recipients || []).map((recipient, index) => (
                <tr key={`${recipient.email}-${index}`} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {(rp.previewPage - 1) * rp.previewPageSize + index + 1}
                  </td>
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
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => rp.removeRecipient(recipient.email)}
                      className="z-0 rounded-full text-xs text-red-600 hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {!rp.previewData?.recipients?.length && (
                <tr>
                  <td
                    className="text-muted-foreground px-3 py-6 text-center"
                    colSpan={5}
                  >
                    No recipients found with current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Page {rp.previewPage} of {rp.totalPreviewPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => rp.changePage(1)}
              disabled={rp.isPreviewing || rp.previewPage <= 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rp.changePage(rp.previewPage - 1)}
              disabled={rp.isPreviewing || rp.previewPage <= 1}
            >
              Previous
            </Button>
            {rp.previewPageNumbers.map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === rp.previewPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => rp.changePage(pageNumber)}
                disabled={rp.isPreviewing}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => rp.changePage(rp.previewPage + 1)}
              disabled={rp.isPreviewing || rp.previewPage >= rp.totalPreviewPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rp.changePage(rp.totalPreviewPages)}
              disabled={rp.isPreviewing || rp.previewPage >= rp.totalPreviewPages}
            >
              Last
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
