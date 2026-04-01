import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  getGroupBuyDiscount,
  removeGroupPurchase,
  setupGroupPurchase,
} from '@/services/groupPurchase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'

const QUICK_PICK_SEATS = [5, 10, 15, 20, 30, 40, 50]

interface GroupBuyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: {
    id: number | string
    title: string
  } | null
  existingGroupPurchase?: {
    id: string
    totalSeats: number
    discountPercent: number
    assignedSeats?: number
    phcodes?: string[]
  } | null
  currency?: string
}

const GroupBuyModal = ({
  open,
  onOpenChange,
  book,
  existingGroupPurchase,
  currency,
}: GroupBuyModalProps) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [additionalUsersInput, setAdditionalUsersInput] = useState('1')

  useEffect(() => {
    if (!open) return
    const initialAdditionalUsers = existingGroupPurchase
      ? Math.max((existingGroupPurchase.totalSeats ?? 2) - 1, 1)
      : 1
    setAdditionalUsersInput(String(initialAdditionalUsers))
  }, [open, existingGroupPurchase])

  const closeAndReset = () => {
    onOpenChange(false)
  }

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => removeGroupPurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-cart-summary'] })
      queryClient.invalidateQueries({ queryKey: ['group-purchases'] })
      toast({ title: 'Group buy cancelled' })
      closeAndReset()
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to clear group buy',
        description:
          error?.response?.data?.error || error?.message || 'Please try again.',
      })
    },
  })

  const setupMutation = useMutation({
    mutationFn: async (payload: {
      bookId: number | string
      totalSeats: number
      assignNow: boolean
      currency?: string
    }) => setupGroupPurchase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-cart-summary'] })
      queryClient.invalidateQueries({ queryKey: ['group-purchases'] })
      toast({ title: 'Group buy configured for this book' })
      closeAndReset()
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Unable to save group buy',
        description:
          error?.response?.data?.error || error?.message || 'Please try again.',
      })
    },
  })

  const handleSave = () => {
    if (!book) return
    const parsedAdditionalUsers = Number(additionalUsersInput)

    if (
      !additionalUsersInput.trim() ||
      !Number.isFinite(parsedAdditionalUsers) ||
      !Number.isInteger(parsedAdditionalUsers) ||
      parsedAdditionalUsers < 1
    ) {
      toast({
        variant: 'destructive',
        title: 'Enter a valid number of additional users',
      })
      return
    }

    setupMutation.mutate({
      bookId: book.id,
      totalSeats: parsedAdditionalUsers + 1,
      assignNow: false,
      currency,
    })
  }

  const parsedAdditionalUsers = Number(additionalUsersInput)
  const hasValidAdditionalUsers =
    additionalUsersInput.trim() &&
    Number.isFinite(parsedAdditionalUsers) &&
    Number.isInteger(parsedAdditionalUsers) &&
    parsedAdditionalUsers >= 1
  const discount = getGroupBuyDiscount(
    hasValidAdditionalUsers ? parsedAdditionalUsers + 1 : 1,
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAndReset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existingGroupPurchase ? 'Edit Group Buy' : 'Buy for a Group'}
          </DialogTitle>
          <DialogDescription>
            {book?.title ?? 'Configure group purchase'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="additionalUsers">How many other users?</Label>
            <Input
              id="additionalUsers"
              type="number"
              min={1}
              max={999}
              value={additionalUsersInput}
              onChange={(e) => setAdditionalUsersInput(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_PICK_SEATS.map((seatCount) => {
                const additionalUsers = seatCount - 1
                const isActive = hasValidAdditionalUsers
                  ? parsedAdditionalUsers + 1 === seatCount
                  : false

                return (
                  <Button
                    key={seatCount}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() =>
                      setAdditionalUsersInput(String(additionalUsers))
                    }
                  >
                    {seatCount}
                  </Button>
                )
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              You are automatically included. Set how many additional people you
              want to buy for now, then assign seats later from Manage Group
              Buy.
            </p>
          </div>

          <div className="rounded-md border p-3 text-sm">
            <p>
              Total users:{' '}
              <strong>
                {hasValidAdditionalUsers ? parsedAdditionalUsers + 1 : '--'}
              </strong>{' '}
              (includes you)
            </p>
            <p>
              Discount: <strong>{discount}%</strong>
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (existingGroupPurchase?.id) {
                  cancelMutation.mutate(existingGroupPurchase.id)
                  return
                }
                closeAndReset()
              }}
              disabled={cancelMutation.isPending}
            >
              {existingGroupPurchase
                ? cancelMutation.isPending
                  ? 'Cancelling...'
                  : 'Clear Group Buy'
                : 'Back'}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending
                ? 'Saving...'
                : existingGroupPurchase
                ? 'Update Group Buy'
                : 'Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GroupBuyModal
