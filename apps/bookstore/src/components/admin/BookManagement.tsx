import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBooks,
  getBookFilterOptions,
  deleteBook,
  updateBook,
  Book,
} from '@/services/book'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Edit, MoreVertical, Search, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import BookUpload from './BookUpload'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { truncate } from '@/lib/utils'
import { PageLoader } from '../Loader'
import AdminTable from './AdminTable'
import { Card, CardContent } from '../ui/card'

const BookManagement = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState<Book | null>(null)

  // Search & filter state. `query` is the live input value, kept
  // separate from `debouncedQuery` (the value actually sent to the
  // server) so typing doesn't fire a request per keystroke.
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [author, setAuthor] = useState<string>('')
  const [groupId, setGroupId] = useState<string>('')
  const [categoryIds, setCategoryIds] = useState<number[]>([])

  // 300ms debounce — short enough to feel responsive, long enough
  // that mid-word typing doesn't spam the server.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset to page 1 whenever a filter or the debounced query changes,
  // otherwise the user could land on page 5 of an empty result set.
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, author, groupId, categoryIds])

  // Filter dropdown options — long staleTime since these change
  // rarely (admins add categories / groups infrequently).
  const filterOptionsQuery = useQuery({
    queryKey: ['admin-books-filter-options'],
    queryFn: getBookFilterOptions,
    staleTime: 5 * 60 * 1000,
  })
  const authorOptions = filterOptionsQuery.data?.authors ?? []
  const groupOptions = filterOptionsQuery.data?.groups ?? []
  const categoryOptions = filterOptionsQuery.data?.categories ?? []

  const hasActiveFilters = useMemo(
    () =>
      Boolean(query) ||
      Boolean(author) ||
      Boolean(groupId) ||
      categoryIds.length > 0,
    [query, author, groupId, categoryIds],
  )

  const clearFilters = () => {
    setQuery('')
    setAuthor('')
    setGroupId('')
    setCategoryIds([])
  }

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<'delete' | null>(null)
  const [selectedBook, setSelectedBook] = useState<{
    id: number
    title: string
  } | null>(null)

  // Lightweight toggle for the per-row Featured checkbox. Separate
  // from the heavyweight `updateMutation` below so we can do an
  // optimistic UI update (the cache flips immediately) and keep the
  // toast quiet — clicking 10 books shouldn't fire 10 "queued" toasts.
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({
      id,
      featured,
    }: {
      id: number
      featured: boolean
    }) => {
      // FormData rather than JSON to match the queue processor's
      // existing parsing path — it accepts string "true"/"false".
      const fd = new FormData()
      fd.append('featured', featured ? 'true' : 'false')
      return await updateBook(id, fd)
    },
    onMutate: async ({ id, featured }) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic value.
      await queryClient.cancelQueries({ queryKey: ['admin-books'] })

      // Snapshot all matching cache entries so we can roll back on error.
      const snapshots = queryClient.getQueriesData<{
        books: Book[]
        total: number
      }>({ queryKey: ['admin-books'] })

      // Flip `featured` in every cached admin-books page that contains this book.
      queryClient.setQueriesData<{ books: Book[]; total: number }>(
        { queryKey: ['admin-books'] },
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            books: prev.books.map((b) =>
              b.id === id ? { ...b, featured } : b,
            ),
          }
        },
      )

      return { snapshots }
    },
    onError: (error: Error, _vars, ctx) => {
      // Roll back to the snapshot we took in onMutate.
      ctx?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      toast({
        variant: 'destructive',
        title: 'Could not update featured status',
        description: error.message,
      })
    },
    onSuccess: () => {
      // Book update is queued — invalidate after the queue has had a
      // chance to run so the server-side value comes back to confirm.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-books'] })
        queryClient.invalidateQueries({ queryKey: ['featured-books'] })
      }, 2500)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: Partial<Book> | FormData
    }) => {
      return await updateBook(id, data)
    },
    onSuccess: () => {
      // Book update is processed via job queue, so we need to delay the refresh
      toast({
        title: 'Book update queued',
        description:
          'Your changes are being processed. The list will refresh shortly.',
      })
      setEditing(null)

      // Refetch after delays to allow job to complete
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-books'] })
        queryClient.invalidateQueries({ queryKey: ['all-books'] })
        queryClient.invalidateQueries({ queryKey: ['featured-books'] })
        queryClient.invalidateQueries({ queryKey: ['books'] })
      }, 2000) // First refresh after 2 seconds

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-books'] })
        queryClient.invalidateQueries({ queryKey: ['all-books'] })
        queryClient.invalidateQueries({ queryKey: ['featured-books'] })
        queryClient.invalidateQueries({ queryKey: ['books'] })
      }, 5000) // Second refresh after 5 seconds (in case job took longer)
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message,
      })
    },
  })
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'admin-books',
      page,
      pageSize,
      debouncedQuery,
      author,
      groupId,
      categoryIds,
    ],
    queryFn: async () => {
      return getBooks({
        page,
        pageSize,
        q: debouncedQuery,
        author: author || undefined,
        groupId: groupId || undefined,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      })
    },
    // Keep the previous page's data visible while a new query is
    // in flight — prevents the table from blanking on every keystroke
    // / filter change. Visible-but-dimmed state below uses
    // `isFetching` to convey "we're refreshing this."
    placeholderData: (prev) => prev,
  })
  const books = data?.books || []
  const total = data?.total || 0

  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      await deleteBook(bookId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
      queryClient.invalidateQueries({ queryKey: ['all-books'] })
      queryClient.invalidateQueries({ queryKey: ['featured-books'] })
      toast({
        title: 'Book deleted',
        description: 'The book has been removed from the store',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      })
    },
  })

  if (isLoading) {
    return <PageLoader />
  }

  // Custom columns for books
  const bookColumns = [
    {
      label: 'Cover',
      render: (book: Book) => (
        <img
          src={book.coverImage}
          alt={book.title}
          className="h-16 w-12 rounded object-cover"
        />
      ),
    },
    {
      label: 'Title',
      sortKey: 'title',
      render: (book: Book) => (
        <span className="line-clamp-2 max-w-[200px] font-semibold">
          {book.title}
        </span>
      ),
    },
    { label: 'Author', sortKey: 'author', render: (book: Book) => book.author },
    {
      label: 'Categories',
      sortKey: 'categoryList',
      render: (book: Book) => {
        // Show multiple categories if available, fallback to single category
        const categories =
          book.categoryList || (book.category ? [book.category] : [])
        return categories.length > 0
          ? categories.map((c) => c.name).join(', ')
          : '-'
      },
    },
    {
      label: 'Group',
      sortKey: 'group',
      render: (book: Book) => (
        <span className="text-sm">
          {book.groupBookId ? (
            <span className="bg-muted rounded px-1.5 py-0.5 font-mono">
              {book.groupBookId}
            </span>
          ) : (
            '-'
          )}
        </span>
      ),
    },
    {
      label: 'Featured',
      sortKey: 'featured',
      render: (book: Book) => {
        const id = book.id as number
        const isPending =
          toggleFeaturedMutation.isPending &&
          toggleFeaturedMutation.variables?.id === id
        return (
          // The wrapper stops the click from bubbling up to the row —
          // some parent rows could attach onClick handlers later and
          // we don't want a featured-toggle to also open the row.
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={!!book.featured}
              disabled={isPending}
              onCheckedChange={(checked) => {
                toggleFeaturedMutation.mutate({
                  id,
                  featured: checked === true,
                })
              }}
              aria-label={`Mark ${book.title} as featured`}
            />
          </div>
        )
      },
    },
  ]

  const renderActions = (book: Book) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setEditing(book)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setDialogOpen(true)
            setDialogAction('delete')
            setSelectedBook({ id: book.id as number, title: book.title })
          }}
          className="text-red-600 focus:bg-red-100"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <Card className="rounded">
      <CardContent className="px-0 pt-4">
        <div className="px-4 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Books
            <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-sm font-normal">
              {total.toLocaleString()}
            </span>
            {isFetching && !isLoading && (
              <span className="text-muted-foreground text-xs font-normal">
                Refreshing…
              </span>
            )}
          </h2>
        </div>

        {/* Filter row — debounced title search on the left,
            dropdown filters on the right. Filters compose: server
            applies them via AND, so e.g. picking author "John" and
            category "Teaching" returns books that match both.
            "Clear" resets all four filters and the table refetches
            page 1. */}
        <div className="flex flex-col gap-3 px-4 pb-3 md:flex-row md:flex-wrap md:items-center">
          <div className="relative min-w-[220px] max-w-md flex-1">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select
            value={author || 'all'}
            onValueChange={(v) => setAuthor(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Author" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All authors</SelectItem>
              {authorOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={groupId || 'all'}
            onValueChange={(v) => setGroupId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All groups</SelectItem>
              {groupOptions.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category is multi-select — implemented as a single
              "Categories" select that toggles selection on each
              click. Could swap for a proper Combobox/Popover with
              checkboxes later; this works without a new dependency. */}
          <Select
            value="__placeholder"
            onValueChange={(v) => {
              if (v === '__placeholder') return
              const id = Number(v)
              setCategoryIds((prev) =>
                prev.includes(id)
                  ? prev.filter((x) => x !== id)
                  : [...prev, id],
              )
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue
                placeholder={
                  categoryIds.length > 0
                    ? `${categoryIds.length} categor${
                        categoryIds.length === 1 ? 'y' : 'ies'
                      }`
                    : 'Categories'
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__placeholder" disabled>
                Categories
              </SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {categoryIds.includes(c.id) ? '✓ ' : ''}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        <AdminTable
          admins={books}
          loading={isLoading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          columns={bookColumns}
          renderActions={(row) => renderActions(row as unknown as Book)}
          stickyHeader
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogAction === 'delete' ? 'Delete Book' : 'Action'}
              </DialogTitle>
              <DialogDescription>
                {dialogAction === 'delete'
                  ? `Are you sure you want to delete ${selectedBook?.title?.toUpperCase()}? This book will no longer be available to buyers.`
                  : `What do you want to do`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={dialogAction === 'delete' ? 'destructive' : 'default'}
                onClick={() => {
                  if (dialogAction === 'delete' && selectedBook.id) {
                    deleteMutation.mutate(selectedBook.id as number)
                  } else {
                    alert('No action to perform')
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {dialogAction === 'delete'
                  ? deleteMutation.isPending
                    ? 'Deleting...'
                    : 'Delete'
                  : 'Continue'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Edit Dialog — use Radix Dialog so the close icon is part of
            the floating dialog chrome (sticky, always reachable) and
            the inner content scrolls inside a bounded container
            instead of pushing the close button off-screen. */}
        <Dialog
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
        >
          {editing && (
            <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-hidden p-0">
              {/* Sticky header keeps the title + Radix close icon
                  pinned at the top while the form scrolls. */}
              <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 pt-5 pb-3">
                <DialogTitle>Edit book</DialogTitle>
              </DialogHeader>
              <div className="max-h-[calc(90vh-64px)] overflow-y-auto px-6 pb-6 pt-3">
              <BookUpload
                isUpdate
                initialValues={{
                  title: editing.title,
                  author: editing.author,
                  description: editing.description,
                  // Support multiple categories - use categoryList if available, fallback to single category
                  categoryIds:
                    editing.categoryList?.map((cat) => String(cat.id)) ||
                    (editing.category?.id ? [String(editing.category.id)] : []),
                  groupId: editing.group?.id ? String(editing.group.id) : '',
                  isbn: editing.ISBN || '',
                  publishedDate: editing.publishedDate
                    ? new Date(editing.publishedDate)
                        .toISOString()
                        .split('T')[0]
                    : '',
                  isFeatured: !!editing.featured,
                  isNewRelease: !!editing.isNewRelease,
                  coverImage: editing.coverImage,
                  isLendable: !!editing.isLendable,
                  lendDurationDays: editing.lendDurationDays || 7,
                  maxConcurrentBorrows: editing.maxConcurrentBorrows || 5,
                  quotaLimit: editing.quotaLimit || 3,
                  quotaPeriodDays: editing.quotaPeriodDays || 30,
                  // Author free-copy distribution. Free copies total is
                  // shown as read-only here — actual changes go through
                  // the 2FA-gated Book Author Access page, NOT this
                  // dialog. authorPhcodes IS editable inline so admin
                  // can correct authorship without an OTP dance.
                  authorPhcodes: (editing as any).authorPhcodes ?? [],
                  freeCopies:
                    (editing as any).freeCopiesTotal ?? 5000,
                }}
                submitLabel="Save Changes"
                onSubmitOverride={async (data, coverFile, bookFile) => {
                  // Use FormData if files are present, else send JSON
                  if (coverFile || bookFile) {
                    const formData = new FormData()
                    formData.append('title', data.title)
                    formData.append('author', data.author)
                    formData.append('description', data.description || '')
                    // Send multiple category IDs
                    if (data.categoryIds && data.categoryIds.length > 0) {
                      formData.append('categoryIds', data.categoryIds.join(','))
                    }
                    if (data.groupId) formData.append('groupId', data.groupId)
                    formData.append('genre', 'N/A')
                    formData.append('ISBN', data.isbn || '')
                    formData.append('publishedDate', data.publishedDate || '')
                    formData.append(
                      'featured',
                      data.isFeatured ? 'true' : 'false',
                    )
                    formData.append(
                      'isNewRelease',
                      data.isNewRelease ? 'true' : 'false',
                    )
                    formData.append(
                      'isLendable',
                      data.isLendable ? 'true' : 'false',
                    )
                    formData.append(
                      'lendDurationDays',
                      String(data.lendDurationDays),
                    )
                    formData.append(
                      'maxConcurrentBorrows',
                      String(data.maxConcurrentBorrows),
                    )
                    formData.append('quotaLimit', String(data.quotaLimit))
                    formData.append(
                      'quotaPeriodDays',
                      String(data.quotaPeriodDays),
                    )
                    // authorPhcodes is editable inline. freeCopiesTotal
                    // is intentionally NOT sent — backend ignores it on
                    // update; the OTP-gated flow is the only path.
                    formData.append(
                      'authorPhcodes',
                      JSON.stringify(data.authorPhcodes ?? []),
                    )
                    if (coverFile) formData.append('coverImage', coverFile)
                    if (bookFile) formData.append('file', bookFile)
                    updateMutation.mutate({
                      id: editing.id as number,
                      data: formData,
                    })
                  } else {
                    // No files, send JSON with categoryIds
                    const formData = new FormData()
                    formData.append('title', data.title)
                    formData.append('author', data.author)
                    formData.append('description', data.description || '')
                    if (data.categoryIds && data.categoryIds.length > 0) {
                      formData.append('categoryIds', data.categoryIds.join(','))
                    }
                    if (data.groupId) formData.append('groupId', data.groupId)
                    formData.append('genre', 'N/A')
                    formData.append('ISBN', data.isbn || '')
                    formData.append('publishedDate', data.publishedDate || '')
                    formData.append(
                      'featured',
                      data.isFeatured ? 'true' : 'false',
                    )
                    formData.append(
                      'isNewRelease',
                      data.isNewRelease ? 'true' : 'false',
                    )
                    formData.append(
                      'isLendable',
                      data.isLendable ? 'true' : 'false',
                    )
                    formData.append(
                      'lendDurationDays',
                      String(data.lendDurationDays),
                    )
                    formData.append(
                      'maxConcurrentBorrows',
                      String(data.maxConcurrentBorrows),
                    )
                    formData.append('quotaLimit', String(data.quotaLimit))
                    formData.append(
                      'quotaPeriodDays',
                      String(data.quotaPeriodDays),
                    )
                    formData.append(
                      'authorPhcodes',
                      JSON.stringify(data.authorPhcodes ?? []),
                    )
                    updateMutation.mutate({
                      id: editing.id as number,
                      data: formData,
                    })
                  }
                }}
              />
              </div>
            </DialogContent>
          )}
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default BookManagement
