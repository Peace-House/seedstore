import api from './apiService'

export interface BookPrice {
  id?: number
  currency: string
  country?: string | null
  soft_copy_price: number
  hard_copy_price: number
}

export interface BookGroup {
  id: number
  name: string
  shortcode: string
  nextNumber?: number
  _count?: {
    books: number
  }
}

export interface Book {
  id: number | string
  orderId?: string
  format?: string
  title: string
  author: string
  authorPhcode?: string | null
  coAuthor?: string | null
  coAuthorPhcode?: string | null
  price: number // Deprecated: use prices array instead
  prices?: BookPrice[]
  coverImage?: string
  category?: {
    id: number
    name: string
  }
  categoryList?: {
    id: number
    name: string
  }[] // Multiple categories
  group?: BookGroup
  groupBookId?: string // e.g., "MBA-001"
  description?: string
  fileUrl?: string
  publishedDate?: string
  pages?: number
  ISBN?: string
  featured?: boolean
  isNewRelease?: boolean
  // Lending fields
  isLendable?: boolean
  lendDurationDays?: number
  maxBorrowsPerUser?: number
  maxConcurrentBorrows?: number
  quotaPeriodDays?: number
  quotaLimit?: number
  isBorrowed?: boolean
  expiresAt?: string
  lenderName?: string
  borrowingSource?: 'BORROW' | 'PEER'
  // Group buy
  allowGroupBuy?: boolean
  // Reading progress — populated by the /library endpoint, used by the
  // Library page's "Continue reading" overlay. Optional because most
  // catalogue endpoints don't include them.
  percentage?: number
  cfi?: string | null
  lastReadAt?: string | null
}

export interface PaginatedBooks {
  books: Book[]
  total: number
  page: number
  pageSize: number
}

// Get all books (paginated, filterable).
//
// `q`           — title-only search (admin Books page typeahead)
// `author`      — exact author dropdown value
// `groupId`     — exact match
// `categoryIds` — array of selected category IDs (sent CSV-encoded)
//
// Empty/undefined params are silently dropped by axios so the URL
// stays clean.
export interface GetBooksParams {
  page?: number
  pageSize?: number
  q?: string
  author?: string
  groupId?: number | string
  categoryIds?: number[]
  /** Restrict to featured (or non-featured) books. Backed by the
   *  `featured=true|false` query string on /books. */
  featured?: boolean
}

export const getBooks = async (
  params: GetBooksParams | number = {},
  pageSize = 10,
): Promise<PaginatedBooks> => {
  // Backwards compat: old call sites pass `(page, pageSize)`.
  // Detect that shape and translate.
  const opts: GetBooksParams =
    typeof params === 'number' ? { page: params, pageSize } : params

  const queryParams: Record<string, string | number> = {
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 10,
  }
  if (opts.q && opts.q.trim()) queryParams.q = opts.q.trim()
  if (opts.author) queryParams.author = opts.author
  if (opts.groupId !== undefined && opts.groupId !== '') {
    queryParams.groupId = opts.groupId
  }
  if (opts.categoryIds && opts.categoryIds.length > 0) {
    queryParams.categoryIds = opts.categoryIds.join(',')
  }
  if (opts.featured !== undefined) {
    // Backend reads "true"/"false" strings — send the literal so it
    // round-trips cleanly through axios + Express query parsing.
    queryParams.featured = opts.featured ? 'true' : 'false'
  }
  const res = await api.get('/books', { params: queryParams })
  return res.data
}

export interface BookFilterOptions {
  authors: string[]
  groups: { id: number; name: string }[]
  categories: { id: number; name: string }[]
}

// Filter dropdown values for the admin Books page. Cheap; cache via
// React Query with a long staleTime since these change rarely.
export const getBookFilterOptions = async (): Promise<BookFilterOptions> => {
  const res = await api.get('/books/filter-options')
  return res.data
}

// Get book by ID
export const getBookById = async (id: string): Promise<Book> => {
  const res = await api.get(`/books/${id}`)
  return res.data
}

// Create a new book (with file and cover image upload)
export const createBook = async (formData: FormData): Promise<Book> => {
  const res = await api.post('/books', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

// Update a book
export const updateBook = async (
  id: string | number,
  data: Partial<Book> | FormData,
): Promise<Book> => {
  let config = {}
  const payload = data
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    config = { headers: { 'Content-Type': 'multipart/form-data' } }
  }
  const res = await api.put(`/books/${id}`, payload, config)
  return res.data
}

// Delete a book
export const deleteBook = async (
  id: string | number,
): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`/books/${id}`)
    return res.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // If backend returns an error, surface the backend error message
    if (err.response && err.response.data && err.response.data.error) {
      throw new Error(err.response.data.error)
    }
    throw err
  }
}

// Bulk update prices for all books
export const updateBooksPrices = async (
  books: {
    bookId: number | string
    prices: {
      currency: string
      country: string
      soft_copy_price: number
      hard_copy_price: number
    }[]
  }[],
): Promise<{ message: string }> => {
  const res = await api.put('/pricing', { books })
  return res.data
}

// Update prices for a specific book
export const updateBookPrices = async (
  bookId: number | string,
  prices: {
    country: string
    soft_copy_price: number
    hard_copy_price: number
    currency: string
  }[],
): Promise<{ message: string }> => {
  const res = await api.put(`/pricing/${bookId}`, { prices })
  return res.data
}

// ============================================
// BOOK GROUPS
// ============================================

// Get all book groups
export const getBookGroups = async (): Promise<BookGroup[]> => {
  const res = await api.get('/book-groups')
  return res.data
}

// Get a single book group by ID
export const getBookGroupById = async (
  id: number | string,
): Promise<BookGroup & { books: Book[] }> => {
  const res = await api.get(`/book-groups/${id}`)
  return res.data
}

// Create a new book group (admin only)
export const createBookGroup = async (data: {
  name: string
  shortcode: string
}): Promise<BookGroup> => {
  const res = await api.post('/book-groups', data)
  return res.data
}

// Update a book group (admin only)
export const updateBookGroup = async (
  id: number | string,
  data: { name?: string; shortcode?: string },
): Promise<BookGroup> => {
  const res = await api.put(`/book-groups/${id}`, data)
  return res.data
}

// Delete a book group (admin only)
export const deleteBookGroup = async (
  id: number | string,
): Promise<{ message: string }> => {
  const res = await api.delete(`/book-groups/${id}`)
  return res.data
}

// Seed default book groups (admin only)
export const seedBookGroups = async (): Promise<{
  message: string
  groups: BookGroup[]
}> => {
  const res = await api.post('/book-groups/seed')
  return res.data
}
