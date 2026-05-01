import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Breadcrumb from '@/components/Breadcrumb'
import { PageLoader } from '@/components/Loader'
import {
  getMyPeerLends,
  revokePeerLending,
  type PeerLendingRecord,
} from '@/services/peerLending'
import { useToast } from '@/hooks/use-toast'
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper'

const ManageLentBooks = () => {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: myLends = [], isLoading } = useQuery({
    queryKey: ['peer-lending-my-lends', user?.id],
    queryFn: getMyPeerLends,
    enabled: !!user,
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokePeerLending(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-lending-my-lends'] })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      toast({ title: 'Lending revoked' })
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { message?: string; error?: string } }
      }
      toast({
        variant: 'destructive',
        title: 'Unable to revoke lending',
        description:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Please try again.',
      })
    },
  })

  if (loading || isLoading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const activeLends = myLends.filter((lend) => lend.status === 'ACTIVE')
  const pastLends = myLends.filter((lend) => lend.status !== 'ACTIVE')

  const renderLendCard = (lend: PeerLendingRecord, showAction: boolean) => (
    <LiquidGlassWrapper
      key={lend.id}
      style={{
        border: '0.5px solid green',
      }}
    >
      <CardContent className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center ">
        <div>
          <p className="font-semibold">{lend.book?.title}</p>
          <p className="text-muted-foreground text-sm">
            Shared with {lend.borrower?.firstName} {lend.borrower?.lastName}
          </p>
          <p className="text-muted-foreground text-sm">
            {showAction ? 'Active until' : 'Ended on'}{' '}
            {new Date(lend.endAt).toLocaleDateString()}
          </p>
          <p className="text-muted-foreground text-xs">
            Status: {lend.status === 'REVOKED' ? 'RECALLED' : lend.status}
          </p>
        </div>

        {showAction ? (
          <Button
            variant="default"
            className="rounded-full"
            disabled={revokeMutation.isPending}
            onClick={() => revokeMutation.mutate(lend.id)}
          >
            Take Back
          </Button>
        ) : null}
      </CardContent>
    </LiquidGlassWrapper>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="container py-8">
        <Breadcrumb
          routes={[
            { label: 'Home', path: '/' },
            { label: 'Library', path: '/library' },
            { label: 'Manage Lent Books' },
          ]}
        />
        <br />
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-primary text-4xl font-bold">Manage Lent Books</h1>
        </div>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-primary text-2xl font-bold">Active</h2>
            {activeLends.length === 0 ? (
              <Card className="border border-dashed">
                <CardContent className="text-muted-foreground p-6 text-sm">
                  You do not have any active lent books.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 space-y-3 md:grid-cols-3 lg:grid-cols-4">
                {activeLends.map((lend) => renderLendCard(lend, true))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-primary text-2xl font-bold">History</h2>
            {pastLends.length === 0 ? (
              <Card className="border border-dashed">
                <CardContent className="text-muted-foreground p-6 text-sm">
                  No lending history yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 space-y-3 md:grid-cols-4 lg:grid-cols-6">
                {pastLends.map((lend) => renderLendCard(lend, false))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default ManageLentBooks
