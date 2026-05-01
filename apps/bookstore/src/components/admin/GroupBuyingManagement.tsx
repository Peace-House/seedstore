import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  getAppFeatureSettings,
  updateAppFeatureSettings,
} from '@/services/admin'
import {
  getGroupBuyBooks,
  updateGroupBuySettings,
  type GroupBuyBookSetting,
} from '@/services/groupPurchase'
import AdminTable from './AdminTable'

const GroupBuyingManagement = () => {
  const { toast } = useToast()

  const [loadingFeature, setLoadingFeature] = useState(true)
  const [savingFeature, setSavingFeature] = useState(false)
  const [groupBuyingEnabled, setGroupBuyingEnabled] = useState(true)
  const [initialGroupBuyingEnabled, setInitialGroupBuyingEnabled] =
    useState(true)
  const [discount25Plus, setDiscount25Plus] = useState(5)
  const [discount50Plus, setDiscount50Plus] = useState(10)
  const [discount25PlusCopies, setDiscount25PlusCopies] = useState(25)
  const [discount50PlusCopies, setDiscount50PlusCopies] = useState(50)
  const [initialDiscount25Plus, setInitialDiscount25Plus] = useState(5)
  const [initialDiscount50Plus, setInitialDiscount50Plus] = useState(10)
  const [initialDiscount25PlusCopies, setInitialDiscount25PlusCopies] =
    useState(25)
  const [initialDiscount50PlusCopies, setInitialDiscount50PlusCopies] =
    useState(50)

  const [books, setBooks] = useState<GroupBuyBookSetting[]>([])
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [savingBooks, setSavingBooks] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [modified, setModified] = useState<Record<string, boolean>>({})

  const hasFeatureChanges = groupBuyingEnabled !== initialGroupBuyingEnabled
  const hasDiscountChanges =
    discount25PlusCopies !== initialDiscount25PlusCopies ||
    discount50PlusCopies !== initialDiscount50PlusCopies ||
    discount25Plus !== initialDiscount25Plus ||
    discount50Plus !== initialDiscount50Plus

  const hasBookChanges = useMemo(
    () => Object.keys(modified).length > 0,
    [modified],
  )

  const loadFeature = async () => {
    setLoadingFeature(true)
    try {
      const settings = await getAppFeatureSettings()
      const enabled = settings.group_buying_enabled ?? true
      setGroupBuyingEnabled(enabled)
      setInitialGroupBuyingEnabled(enabled)
      const discount25 = settings.group_buying_discount_25_plus ?? 5
      const discount50 = settings.group_buying_discount_50_plus ?? 10
      const discount25Copies =
        settings.group_buying_discount_25_plus_copies ?? 25
      const discount50Copies =
        settings.group_buying_discount_50_plus_copies ?? 50
      setDiscount25Plus(discount25)
      setDiscount50Plus(discount50)
      setDiscount25PlusCopies(discount25Copies)
      setDiscount50PlusCopies(discount50Copies)
      setInitialDiscount25Plus(discount25)
      setInitialDiscount50Plus(discount50)
      setInitialDiscount25PlusCopies(discount25Copies)
      setInitialDiscount50PlusCopies(discount50Copies)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load group buying feature setting.',
      })
    } finally {
      setLoadingFeature(false)
    }
  }

  const loadBooks = async () => {
    setLoadingBooks(true)
    try {
      const data = await getGroupBuyBooks(page, pageSize)
      setBooks(data.books)
      setTotal(data.total)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch group-buy book settings.',
      })
    } finally {
      setLoadingBooks(false)
    }
  }

  useEffect(() => {
    loadFeature()
  }, [])

  useEffect(() => {
    if (groupBuyingEnabled) {
      loadBooks()
    }
  }, [groupBuyingEnabled, page])

  const saveFeature = async () => {
    setSavingFeature(true)
    try {
      const updated = await updateAppFeatureSettings({
        group_buying_enabled: groupBuyingEnabled,
      })
      const enabled = updated.group_buying_enabled ?? true
      setGroupBuyingEnabled(enabled)
      setInitialGroupBuyingEnabled(enabled)
      toast({
        title: 'Saved',
        description: 'Group buying feature toggle updated.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update group buying feature setting.',
      })
    } finally {
      setSavingFeature(false)
    }
  }

  const saveDiscounts = async () => {
    setSavingFeature(true)
    try {
      const updated = await updateAppFeatureSettings({
        group_buying_discount_25_plus_copies: discount25PlusCopies,
        group_buying_discount_25_plus: discount25Plus,
        group_buying_discount_50_plus_copies: discount50PlusCopies,
        group_buying_discount_50_plus: discount50Plus,
      })
      const discount25 = updated.group_buying_discount_25_plus ?? 5
      const discount50 = updated.group_buying_discount_50_plus ?? 10
      const discount25Copies =
        updated.group_buying_discount_25_plus_copies ?? 25
      const discount50Copies =
        updated.group_buying_discount_50_plus_copies ?? 50
      setDiscount25Plus(discount25)
      setDiscount50Plus(discount50)
      setDiscount25PlusCopies(discount25Copies)
      setDiscount50PlusCopies(discount50Copies)
      setInitialDiscount25Plus(discount25)
      setInitialDiscount50Plus(discount50)
      setInitialDiscount25PlusCopies(discount25Copies)
      setInitialDiscount50PlusCopies(discount50Copies)
      toast({
        title: 'Saved',
        description: 'Group buying discount settings updated.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update group buying discounts.',
      })
    } finally {
      setSavingFeature(false)
    }
  }

  const handleBookToggle = (bookId: string | number, value: boolean) => {
    setModified((prev) => ({ ...prev, [String(bookId)]: value }))
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, allowGroupBuy: value } : b)),
    )
  }

  const saveBookSettings = async () => {
    const updates = Object.entries(modified).map(([id, allowGroupBuy]) => ({
      id,
      allowGroupBuy,
    }))

    if (updates.length === 0) {
      toast({
        title: 'No changes',
        description: "You haven't modified any book settings.",
      })
      return
    }

    setSavingBooks(true)
    try {
      await updateGroupBuySettings(updates)
      toast({
        title: 'Saved',
        description: 'Book-level group-buy settings updated.',
      })
      setModified({})
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update book-level settings.',
      })
    } finally {
      setSavingBooks(false)
    }
  }

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>Group Buying</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        <div className="px-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Group buying feature</p>
              <p className="text-muted-foreground text-sm">
                Enable or disable the group-buy flow platform-wide.
              </p>
            </div>
            <Switch
              checked={groupBuyingEnabled}
              onCheckedChange={setGroupBuyingEnabled}
              disabled={loadingFeature || savingFeature}
            />
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              onClick={saveFeature}
              disabled={loadingFeature || savingFeature || !hasFeatureChanges}
            >
              {savingFeature ? 'Saving...' : 'Save Feature Toggle'}
            </Button>
          </div>
        </div>

        {groupBuyingEnabled && (
          <div className="px-4">
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <p className="font-medium">Discount</p>
                <p className="text-muted-foreground text-sm">
                  Configure discount percentages applied to group purchases.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    First discount threshold (copies)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={discount25PlusCopies}
                    onChange={(e) =>
                      setDiscount25PlusCopies(Number(e.target.value || 1))
                    }
                    disabled={loadingFeature || savingFeature}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    First discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={discount25Plus}
                    onChange={(e) =>
                      setDiscount25Plus(Number(e.target.value || 0))
                    }
                    disabled={loadingFeature || savingFeature}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Second discount threshold (copies)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={discount50PlusCopies}
                    onChange={(e) =>
                      setDiscount50PlusCopies(Number(e.target.value || 1))
                    }
                    disabled={loadingFeature || savingFeature}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Second discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={discount50Plus}
                    onChange={(e) =>
                      setDiscount50Plus(Number(e.target.value || 0))
                    }
                    disabled={loadingFeature || savingFeature}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveDiscounts}
                  disabled={
                    loadingFeature ||
                    savingFeature ||
                    !hasDiscountChanges ||
                    discount25PlusCopies < 1 ||
                    discount50PlusCopies < 1 ||
                    discount50PlusCopies <= discount25PlusCopies ||
                    discount25Plus < 0 ||
                    discount50Plus < 0 ||
                    discount25Plus > 100 ||
                    discount50Plus > 100
                  }
                >
                  {savingFeature ? 'Saving...' : 'Save Discounts'}
                </Button>
              </div>

              <p className="text-muted-foreground text-xs">
                The second discount threshold must be greater than the first.
              </p>
            </div>
          </div>
        )}

        {groupBuyingEnabled && (
          <>
            <div className="flex items-center justify-between px-4">
              <h3 className="text-sm font-semibold">
                Group buying - Book-level settings
              </h3>
              <Button
                size="sm"
                onClick={saveBookSettings}
                disabled={savingBooks || !hasBookChanges}
              >
                {savingBooks ? 'Saving...' : 'Save Book Changes'}
              </Button>
            </div>

            <AdminTable
              admins={books}
              loading={loadingBooks}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
              columns={[
                {
                  label: 'Title',
                  render: (book: GroupBuyBookSetting) => (
                    <div className="min-w-[200px]">
                      <p className="line-clamp-1 font-semibold">{book.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {book.author || 'No Author'}
                      </p>
                    </div>
                  ),
                  sortKey: 'title',
                },
                {
                  label: 'Allow Group Buy',
                  render: (book: GroupBuyBookSetting) => (
                    <Switch
                      checked={book.allowGroupBuy}
                      onCheckedChange={(checked) =>
                        handleBookToggle(book.id, checked)
                      }
                    />
                  ),
                },
              ]}
              renderActions={undefined}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default GroupBuyingManagement
