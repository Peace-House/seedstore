import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  listPaystackTransactions,
  PaystackTransaction,
  PaystackTransactionsResponse,
} from '@/services/payment'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { format } from 'date-fns'
import { CreditCard, RefreshCw } from 'lucide-react'

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

  const {
    data: transactionsData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PaystackTransactionsResponse>({
    queryKey: ['paystack-transactions', page, pageSize, statusFilter],
    queryFn: () =>
      listPaystackTransactions({
        page,
        perPage: pageSize,
        status: statusFilter as 'success' | 'failed' | 'abandoned' | undefined,
      }),
  })

  const transactions = transactionsData?.data || []
  const meta = transactionsData?.meta

  return (
    <Card className="rounded">
      <CardHeader>
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
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found.
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
                  {transactions.map((txn: PaystackTransaction) => (
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
                  Showing {((page - 1) * pageSize) + 1} to{' '}
                  {Math.min(page * pageSize, meta?.total || 0)} of {meta?.total || 0} transactions
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
