import { useEffect, useState } from 'react'
import {
  getLendingBooks,
  updateLendingSettings,
  getAllBorrows,
  revokeBorrow,
  getLendingFeatureConfig,
  updateLendingFeatureConfig,
  type LendingFeatureConfig,
} from '@/services/lending'
import { Book } from '@/services/book'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import AdminTable from './AdminTable'
import { Card, CardContent } from '../ui/card'
import { useToast } from '@/hooks/use-toast'
import { PageLoader } from '../Loader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

const DEFAULT_FEATURE_CONFIG: LendingFeatureConfig = {
  seedstore_lending_enabled: true,
  peer_lending_enabled: true,
  max_lend_duration_days: 14,
  allow_lender_access_during_lend: true,
  max_books_borrowed_concurrently_per_user: 3,
  max_books_from_same_lender: 2,
  max_lends_per_book: 5,
}

const LendingManagement = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'settings' | 'borrows'>('settings')

  // Settings state
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  // Borrows state
  const [borrows, setBorrows] = useState<any[]>([])
  const [borrowsLoading, setBorrowsLoading] = useState(false)
  const [borrowsPage, setBorrowsPage] = useState(1)
  const [borrowsPageSize, setBorrowsPageSize] = useState(10)
  const [borrowsTotal, setBorrowsTotal] = useState(0)
  const [borrowsStatus, setBorrowsStatus] = useState<string>('ACTIVE')

  const [modifiedSettings, setModifiedSettings] = useState<
    Record<string, Partial<Book>>
  >({})
  const [featureConfig, setFeatureConfig] = useState<LendingFeatureConfig>(
    DEFAULT_FEATURE_CONFIG,
  )
  const [initialFeatureConfig, setInitialFeatureConfig] =
    useState<LendingFeatureConfig>(DEFAULT_FEATURE_CONFIG)
  const [featureConfigLoading, setFeatureConfigLoading] = useState(false)
  const [featureConfigSaving, setFeatureConfigSaving] = useState(false)

  const hasFeatureChanges =
    featureConfig.seedstore_lending_enabled !==
      initialFeatureConfig.seedstore_lending_enabled ||
    featureConfig.peer_lending_enabled !==
      initialFeatureConfig.peer_lending_enabled ||
    featureConfig.max_lend_duration_days !==
      initialFeatureConfig.max_lend_duration_days ||
    featureConfig.allow_lender_access_during_lend !==
      initialFeatureConfig.allow_lender_access_during_lend ||
    featureConfig.max_books_borrowed_concurrently_per_user !==
      initialFeatureConfig.max_books_borrowed_concurrently_per_user ||
    featureConfig.max_books_from_same_lender !==
      initialFeatureConfig.max_books_from_same_lender ||
    featureConfig.max_lends_per_book !== initialFeatureConfig.max_lends_per_book

  const loadFeatureConfig = async () => {
    setFeatureConfigLoading(true)
    try {
      const config = await getLendingFeatureConfig()
      setFeatureConfig(config)
      setInitialFeatureConfig(config)
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load lending feature controls',
      })
    } finally {
      setFeatureConfigLoading(false)
    }
  }

  const fetchBooks = async () => {
    setLoading(true)
    try {
      const data = await getLendingBooks(page, pageSize)
      setBooks(data.books)
      setTotal(data.total)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch books for lending management',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBorrows = async () => {
    setBorrowsLoading(true)
    try {
      const data = await getAllBorrows(
        borrowsPage,
        borrowsPageSize,
        borrowsStatus,
      )
      setBorrows(data.borrows)
      setBorrowsTotal(data.total)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch borrow records',
      })
    } finally {
      setBorrowsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'settings') {
      loadFeatureConfig()
    }

    if (activeTab === 'settings') {
      fetchBooks()
    } else {
      fetchBorrows()
    }
  }, [activeTab, page, pageSize, borrowsPage, borrowsPageSize, borrowsStatus])

  const updateFeature = <K extends keyof LendingFeatureConfig>(
    key: K,
    value: LendingFeatureConfig[K],
  ) => {
    setFeatureConfig((prev) => ({ ...prev, [key]: value }))
  }

  const saveFeatureConfig = async () => {
    setFeatureConfigSaving(true)
    try {
      const payload: Partial<LendingFeatureConfig> = {
        seedstore_lending_enabled: featureConfig.seedstore_lending_enabled,
        peer_lending_enabled: featureConfig.peer_lending_enabled,
        max_lend_duration_days: featureConfig.max_lend_duration_days,
        allow_lender_access_during_lend:
          featureConfig.allow_lender_access_during_lend,
        max_books_borrowed_concurrently_per_user:
          featureConfig.max_books_borrowed_concurrently_per_user,
        max_books_from_same_lender: featureConfig.max_books_from_same_lender,
        max_lends_per_book: featureConfig.max_lends_per_book,
      }
      const updated = await updateLendingFeatureConfig(payload)
      setFeatureConfig(updated)
      setInitialFeatureConfig(updated)
      toast({
        title: 'Saved',
        description: 'Lending feature controls updated successfully.',
      })
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update lending feature controls.',
      })
    } finally {
      setFeatureConfigSaving(false)
    }
  }

  const handleSettingChange = (
    bookId: string | number,
    field: keyof Book,
    value: any,
  ) => {
    setModifiedSettings((prev) => ({
      ...prev,
      [bookId]: {
        ...(prev[bookId] || {}),
        [field]: value,
      },
    }))

    // Update local books state for immediate UI feedback
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, [field]: value } : b)),
    )
  }

  const handleSave = async () => {
    const updates = Object.entries(modifiedSettings).map(([id, settings]) => ({
      id,
      ...settings,
    }))

    if (updates.length === 0) {
      toast({
        title: 'No changes',
        description: "You haven't modified any settings.",
      })
      return
    }

    setSaving(true)
    try {
      await updateLendingSettings(updates as Partial<Book>[])
      toast({
        title: 'Success',
        description: 'Lending settings updated successfully',
      })
      setModifiedSettings({})
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Failed to update lending settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (borrowId: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke this borrow? The user will lose access to the book immediately.',
      )
    ) {
      return
    }

    try {
      await revokeBorrow(borrowId)
      toast({ title: 'Success', description: 'Borrow revoked successfully' })
      fetchBorrows()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to revoke borrow',
      })
    }
  }

  const columns = [
    {
      label: 'Title',
      render: (book: Book) => (
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
      label: 'Lendable',
      render: (book: Book) => (
        <Switch
          checked={!!book.isLendable}
          onCheckedChange={(checked) =>
            handleSettingChange(book.id, 'isLendable', checked)
          }
        />
      ),
      sortKey: 'isLendable',
    },
    {
      label: 'Duration (Days)',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.lendDurationDays || 7}
          onChange={(e) =>
            handleSettingChange(
              book.id,
              'lendDurationDays',
              parseInt(e.target.value),
            )
          }
          className="h-8 w-20"
          disabled={!book.isLendable}
        />
      ),
    },
    {
      label: 'Concurrent',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.maxConcurrentBorrows || 5}
          onChange={(e) =>
            handleSettingChange(
              book.id,
              'maxConcurrentBorrows',
              parseInt(e.target.value),
            )
          }
          className="h-8 w-16"
          disabled={!book.isLendable}
        />
      ),
    },
    {
      label: 'Quota (Limit)',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.quotaLimit || 3}
          onChange={(e) =>
            handleSettingChange(book.id, 'quotaLimit', parseInt(e.target.value))
          }
          className="h-8 w-16"
          disabled={!book.isLendable}
        />
      ),
    },
    {
      label: 'Period (Days)',
      render: (book: Book) => (
        <Input
          type="number"
          min="1"
          value={book.quotaPeriodDays || 30}
          onChange={(e) =>
            handleSettingChange(
              book.id,
              'quotaPeriodDays',
              parseInt(e.target.value),
            )
          }
          className="h-8 w-16"
          disabled={!book.isLendable}
        />
      ),
    },
  ]

  const borrowColumns = [
    {
      label: 'User',
      render: (borrow: any) => (
        <div>
          <p className="font-semibold">
            {borrow.user.firstName} {borrow.user.lastName}
          </p>
          <p className="text-muted-foreground text-xs">{borrow.user.email}</p>
        </div>
      ),
    },
    {
      label: 'Book',
      render: (borrow: any) => (
        <div>
          <p className="line-clamp-1 font-semibold">{borrow.book.title}</p>
          <p className="text-muted-foreground text-xs">ID: {borrow.book.id}</p>
        </div>
      ),
    },
    {
      label: 'Borrowed At',
      render: (borrow: any) =>
        format(new Date(borrow.borrowedAt), 'MMM dd, yyyy'),
    },
    {
      label: 'Expires At',
      render: (borrow: any) => (
        <span
          className={
            new Date(borrow.expiresAt) < new Date()
              ? 'font-bold text-red-500'
              : ''
          }
        >
          {format(new Date(borrow.expiresAt), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      label: 'Status',
      render: (borrow: any) => {
        const colors: Record<string, string> = {
          ACTIVE: 'bg-green-100 text-green-800',
          RETURNED: 'bg-blue-100 text-blue-800',
          EXPIRED: 'bg-orange-100 text-orange-800',
          REVOKED: 'bg-red-100 text-red-800',
        }
        return (
          <Badge className={colors[borrow.status] || ''} variant="outline">
            {borrow.status}
          </Badge>
        )
      },
    },
    {
      label: 'Actions',
      render: (borrow: any) =>
        borrow.status === 'ACTIVE' ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRevoke(borrow.id)}
            className="h-8 py-0"
          >
            Revoke
          </Button>
        ) : null,
    },
  ]

  if (loading && books.length === 0) return <PageLoader />

  return (
    <Card className="rounded">
      <CardContent className="px-0 pt-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full"
        >
          <div className="mb-4 flex items-center justify-between border-b px-4 pb-2">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="settings">Lending Settings</TabsTrigger>
              <TabsTrigger value="borrows">Active Borrows</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="settings" className="mt-0">
            <div className="px-4 pb-2">
              <h2 className="text-muted-foreground mb-4 text-sm">
                Manage Seedstore Lending and Peer-to-Peer Lending separately.
              </h2>

              <div className="mb-6 space-y-4">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Lending from seedstore</p>
                        <p className="text-muted-foreground text-sm">
                          Controls borrowing of lendable books directly from
                          seedstore inventory.
                        </p>
                      </div>
                      <Switch
                        checked={featureConfig.seedstore_lending_enabled}
                        onCheckedChange={(v) =>
                          updateFeature('seedstore_lending_enabled', v)
                        }
                        disabled={featureConfigLoading || featureConfigSaving}
                      />
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Peer-to-peer lending</p>
                          <p className="text-muted-foreground text-sm">
                            Controls user-to-user temporary sharing of purchased
                            books.
                          </p>
                        </div>
                        <Switch
                          checked={featureConfig.peer_lending_enabled}
                          onCheckedChange={(v) =>
                            updateFeature('peer_lending_enabled', v)
                          }
                          disabled={featureConfigLoading || featureConfigSaving}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            How long can a user lend a book? (days)
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={featureConfig.max_lend_duration_days}
                            onChange={(e) =>
                              updateFeature(
                                'max_lend_duration_days',
                                Math.max(1, Number(e.target.value || 1)),
                              )
                            }
                            disabled={
                              featureConfigLoading || featureConfigSaving
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            How many books can a user borrow concurrently?
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={
                              featureConfig.max_books_borrowed_concurrently_per_user
                            }
                            onChange={(e) =>
                              updateFeature(
                                'max_books_borrowed_concurrently_per_user',
                                Math.max(1, Number(e.target.value || 1)),
                              )
                            }
                            disabled={
                              featureConfigLoading || featureConfigSaving
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            How many books can a user borrow from the same
                            lender?
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={featureConfig.max_books_from_same_lender}
                            onChange={(e) =>
                              updateFeature(
                                'max_books_from_same_lender',
                                Math.max(1, Number(e.target.value || 1)),
                              )
                            }
                            disabled={
                              featureConfigLoading || featureConfigSaving
                            }
                          />
                        </div>
                        {/* <div className="space-y-1">
                          <label className="text-sm font-medium">
                            Max lends per book
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={featureConfig.max_lends_per_book}
                            onChange={(e) =>
                              updateFeature(
                                'max_lends_per_book',
                                Math.max(1, Number(e.target.value || 1)),
                              )
                            }
                            disabled={true}
                            // disabled={
                            //   featureConfigLoading || featureConfigSaving
                            // }
                          />
                        </div> */}
                      </div>

                      {/* <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">
                            Allow lender access during lend
                          </p>
                          <p className="text-muted-foreground text-sm">
                            If disabled, lender loses reading access while the
                            lend is active.
                          </p>
                        </div>
                        <Switch
                          checked={
                            featureConfig.allow_lender_access_during_lend
                          }
                          onCheckedChange={(v) =>
                            updateFeature('allow_lender_access_during_lend', v)
                          }
                          disabled={featureConfigLoading || featureConfigSaving}
                        />
                      </div> */}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="default"
                        onClick={saveFeatureConfig}
                        disabled={
                          featureConfigLoading ||
                          featureConfigSaving ||
                          !hasFeatureChanges
                        }
                      >
                        {featureConfigSaving
                          ? 'Saving...'
                          : 'Save Lending Feature Controls'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {initialFeatureConfig.seedstore_lending_enabled === true && (
              <>
                <br />
                <br />
                <h1 className="mb-3 pl-3 text-xl font-semibold">
                  Seedstore book-level lending settings
                </h1>
                <AdminTable
                  admins={books}
                  loading={loading}
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  columns={columns}
                  renderActions={undefined}
                />

                {/* {activeTab === 'settings' && ( */}
                <div className="flex justify-end px-3">
                  <Button
                    onClick={handleSave}
                    variant="default"
                    disabled={
                      saving || Object.keys(modifiedSettings).length === 0
                    }
                    size="sm"
                  >
                    {saving ? 'Saving...' : 'Save All Changes'}
                  </Button>
                </div>
              </>
            )}
            {/* )} */}
          </TabsContent>

          <TabsContent value="borrows" className="mt-0">
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="text-muted-foreground text-sm">
                View and manage current book borrows across all users.
              </h2>
              <div className="flex gap-2">
                {['ACTIVE', 'RETURNED', 'EXPIRED', 'REVOKED', ''].map((s) => (
                  <Button
                    key={s}
                    variant={borrowsStatus === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBorrowsStatus(s)}
                    className="h-7 px-2 text-[10px]"
                  >
                    {s || 'ALL'}
                  </Button>
                ))}
              </div>
            </div>
            <AdminTable
              admins={borrows}
              loading={borrowsLoading}
              page={borrowsPage}
              pageSize={borrowsPageSize}
              total={borrowsTotal}
              onPageChange={setBorrowsPage}
              onPageSizeChange={setBorrowsPageSize}
              columns={borrowColumns}
              renderActions={undefined}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default LendingManagement
