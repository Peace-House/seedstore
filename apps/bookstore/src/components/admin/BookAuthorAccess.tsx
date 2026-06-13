import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowUpCircle, Gift, History } from 'lucide-react'
import AdminTable, { TableColumn } from './AdminTable'
import UpdateFreeCopiesDialog, {
  AllocationTarget,
} from './free-copies/UpdateFreeCopiesDialog'
import CreateUserAllocationDialog from './free-copies/CreateUserAllocationDialog'
import UserGivingHistoryDialog from './free-copies/UserGivingHistoryDialog'
import { useAuthorsFreeCopies, useUsersFreeCopies } from '@/hooks/useFreeCopies'
import { AuthorBookRow, UserBookAgg } from '@/services/adminFreeCopies'

/**
 * Book Author Access — two tabs:
 *   • Authors: each book's authors and their per-author free-copy quota
 *     (default 100). Admin can only INCREASE a quota (2FA OTP). No direct
 *     assignment — authors give copies out themselves from the app.
 *   • Users: outreach allocations. Admin gives a user a redistribution quota;
 *     aggregated per book, with giving history + recipient drill-down.
 */
export default function BookAuthorAccess() {
  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>Book Author Access</CardTitle>
        <CardDescription>
          Manage per-author free-copy quotas and outreach giveaways. Authors and
          outreach users distribute copies from the mobile app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="authors">
          <TabsList className="mb-4">
            <TabsTrigger value="authors">Authors' free copies</TabsTrigger>
            <TabsTrigger value="users">Users' free copies</TabsTrigger>
          </TabsList>
          <TabsContent value="authors">
            <AuthorsTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ── Authors tab ───────────────────────────────────────────────
function AuthorsTab() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [q, setQ] = useState('')
  const [otpTarget, setOtpTarget] = useState<{
    allocation: AllocationTarget
    bookTitle: string
  } | null>(null)

  const { data, isLoading, isFetching } = useAuthorsFreeCopies({
    page,
    pageSize,
    q: q.trim() || undefined,
  })
  const rows = data?.books ?? []

  const columns: TableColumn<AuthorBookRow>[] = [
    {
      label: 'Book',
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.title}</div>
          <div className="text-muted-foreground truncate text-xs">
            {r.author}
            {r.coAuthor ? ` & ${r.coAuthor}` : ''}
          </div>
        </div>
      ),
    },
    {
      label: 'Authors & free copies',
      render: (r) =>
        r?.authorAllocations?.length === 0 ? (
          <span className="text-muted-foreground text-xs italic">
            No authors set
          </span>
        ) : (
          <div className="space-y-1.5">
            {r.authorAllocations.map((a) => (
              <div
                key={a.allocationId}
                className="flex items-center gap-3 text-sm"
              >
                <span className="min-w-[140px]">
                  {a.holderName || (
                    <span className="font-mono">{a.holderPhcode}</span>
                  )}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {a.used}/{a.total} used · {a.remaining} left
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() =>
                    setOtpTarget({ allocation: a, bookTitle: r.title })
                  }
                >
                  <ArrowUpCircle className="mr-1 h-3.5 w-3.5" />
                  Increase
                </Button>
              </div>
            ))}
          </div>
        ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Input
          placeholder="Search title or author"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className="w-60"
        />
      </div>
      <AdminTable
        admins={rows}
        loading={isLoading || isFetching}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(1)
        }}
        columns={columns}
      />
      <UpdateFreeCopiesDialog
        open={!!otpTarget}
        onOpenChange={(o) => !o && setOtpTarget(null)}
        allocation={otpTarget?.allocation ?? null}
        bookTitle={otpTarget?.bookTitle}
      />
    </div>
  )
}

// ── Users (outreach) tab ──────────────────────────────────────
function UsersTab() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [historyBook, setHistoryBook] = useState<{
    bookId: number
    title: string
  } | null>(null)

  const { data, isLoading, isFetching } = useUsersFreeCopies({
    page,
    pageSize,
    q: q.trim() || undefined,
  })
  // AdminTable keys rows by `row.id`; the aggregate has `bookId`, so alias it.
  const rows = (data?.books ?? []).map((b) => ({ ...b, id: b.bookId }))

  const columns: TableColumn<UserBookAgg>[] = [
    {
      label: 'Book',
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.title}</div>
          <div className="text-muted-foreground truncate text-xs">
            {r.author}
          </div>
        </div>
      ),
    },
    {
      label: 'Total given',
      render: (r) => <span className="font-mono text-sm">{r.totalGiven}</span>,
    },
    {
      label: 'Used',
      render: (r) => <span className="font-mono text-sm">{r.used}</span>,
    },
    {
      label: 'Remaining',
      render: (r) => (
        <span
          className={`font-mono text-sm font-semibold ${
            r.remaining > 0 ? 'text-primary' : 'text-destructive'
          }`}
        >
          {r.remaining}
        </span>
      ),
    },
    {
      label: 'Users',
      render: (r) => <span className="font-mono text-sm">{r.userCount}</span>,
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Search title or author"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className="w-60"
        />
        <Button onClick={() => setCreateOpen(true)}>
          <Gift className="mr-2 h-4 w-4" />
          Give free copies to a user
        </Button>
      </div>
      <AdminTable
        admins={rows}
        loading={isLoading || isFetching}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(1)
        }}
        columns={columns}
        renderActions={(row) => {
          const r = row as unknown as UserBookAgg
          return (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setHistoryBook({ bookId: r.bookId, title: r.title })
                }
              >
                <History className="mr-1 h-4 w-4" />
                History
              </Button>
            </div>
          )
        }}
      />
      <CreateUserAllocationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <UserGivingHistoryDialog
        open={!!historyBook}
        onOpenChange={(o) => !o && setHistoryBook(null)}
        book={historyBook}
      />
    </div>
  )
}
