import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  listPaystackTransactions,
  PaystackTransaction,
  PaystackTransactionsResponse,
} from '@/services/payment'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { CreditCard, RefreshCw, Filter, X, Search, Calendar } from 'lucide-react'

// Format amount from kobo to currency
const formatAmount = (amount: number, currency: string) => {
  const symbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }
  const symbol = symbols[currency] || currency + ' '
  return `${symbol}${(amount / 100).toLocaleString()}`
}

// Get status badge style
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'success':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Success</Badge>
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>
    case 'abandoned':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Abandoned</Badge>
    case 'pending':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pending</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>
  }
}

// Get channel badge
const getChannelBadge = (channel: string) => {
  const channelLabels: Record<string, string> = {
    card: 'Card',
    bank: 'Bank',
    ussd: 'USSD',
    qr: 'QR',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    apple_pay: 'Apple Pay',
  }
  return channelLabels[channel] || channel
}

const TransactionManagement = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (statusFilter) count++
    if (fromDate) count++
    if (toDate) count++
    if (channelFilter) count++
    return count
  }, [statusFilter, fromDate, toDate, channelFilter])

  const {
    data: transactionsData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PaystackTransactionsResponse>({
    queryKey: ['paystack-transactions', page, pageSize, statusFilter, fromDate, toDate],
    queryFn: () =>
      listPaystackTransactions({
        page,
        perPage: pageSize,
        status: statusFilter as 'success' | 'failed' | 'abandoned' | undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  })

  // Client-side filtering for search query, reference, customer, and channel
  const filteredTransactions = useMemo(() => {
    let transactions = transactionsData?.data || []
    
    // Filter by search query (reference or customer email)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      transactions = transactions.filter(
        (txn) =>
          txn.reference.toLowerCase().includes(query) ||
          txn.customer.email.toLowerCase().includes(query) ||
          (txn.customer.first_name?.toLowerCase().includes(query)) ||
          (txn.customer.last_name?.toLowerCase().includes(query))
      )
    }

    // Filter by channel
    if (channelFilter) {
      transactions = transactions.filter((txn) => txn.channel === channelFilter)
    }

    return transactions
  }, [transactionsData?.data, searchQuery, channelFilter])

  const meta = transactionsData?.meta

  const clearFilters = () => {
    setStatusFilter('')
    setFromDate('')
    setToDate('')
    setSearchQuery('')
    setChannelFilter('')
    setPage(1)
  }

  return (
    <Card className="rounded">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Paystack Transactions
              {meta && (
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {meta.total.toLocaleString()} total
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-3">
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filters</h4>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-auto p-1 text-xs text-muted-foreground"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={statusFilter || 'all'}
                        onValueChange={(value) => {
                          setStatusFilter(value === 'all' ? '' : value)
                          setPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="abandoned">Abandoned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Channel Filter */}
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select
                        value={channelFilter || 'all'}
                        onValueChange={(value) => {
                          setChannelFilter(value === 'all' ? '' : value)
                          setPage(1)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All channels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All channels</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="ussd">USSD</SelectItem>
                          <SelectItem value="qr">QR</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="apple_pay">Apple Pay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date Range
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">From</Label>
                          <Input
                            type="date"
                            value={fromDate}
                            onChange={(e) => {
                              setFromDate(e.target.value)
                              setPage(1)
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">To</Label>
                          <Input
                            type="date"
                            value={toDate}
                            onChange={(e) => {
                              setToDate(e.target.value)
                              setPage(1)
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference, customer email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(activeFilterCount > 0 || searchQuery) && (
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <button onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {channelFilter && (
                <Badge variant="secondary" className="gap-1">
                  Channel: {getChannelBadge(channelFilter)}
                  <button onClick={() => setChannelFilter('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {fromDate && (
                <Badge variant="secondary" className="gap-1">
                  From: {fromDate}
                  <button onClick={() => setFromDate('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {toDate && (
                <Badge variant="secondary" className="gap-1">
                  To: {toDate}
                  <button onClick={() => setToDate('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || channelFilter
              ? 'No transactions match your search criteria.'
              : 'No transactions found.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Paid At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((txn: PaystackTransaction) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{txn.reference}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {txn.customer.first_name || txn.customer.last_name
                              ? `${txn.customer.first_name || ''} ${txn.customer.last_name || ''}`.trim()
                              : '-'}
                          </p>
                          <p className="text-xs text-muted-foreground">{txn.customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatAmount(txn.amount, txn.currency)}
                        </span>
                        {txn.fees && (
                          <p className="text-xs text-muted-foreground">
                            Fee: {formatAmount(txn.fees, txn.currency)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm">{getChannelBadge(txn.channel)}</span>
                        {txn.authorization && (
                          <p className="text-xs text-muted-foreground">
                            {txn.authorization.brand} •••• {txn.authorization.last4}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(txn.created_at), 'MMM d, yyyy')}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.created_at), 'h:mm a')}
                        </p>
                      </TableCell>
                      <TableCell>
                        {txn.paid_at ? (
                          <>
                            {format(new Date(txn.paid_at), 'MMM d, yyyy')}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(txn.paid_at), 'h:mm a')}
                            </p>
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {(searchQuery || channelFilter) ? (
                    <>Showing {filteredTransactions.length} filtered results</>
                  ) : (
                    <>
                      Showing {((page - 1) * pageSize) + 1} to{' '}
                      {Math.min(page * pageSize, meta?.total || 0)} of {meta?.total || 0} transactions
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {meta?.pageCount || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (meta?.pageCount || 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TransactionManagement
