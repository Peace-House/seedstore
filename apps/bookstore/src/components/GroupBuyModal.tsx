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

const QUICK_PICK_COPIES = [5, 10, 15, 20, 30, 40, 50]

interface GroupBuyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: {
    id: number | string
    title: string
  } | null
  buyerOwnsBook?: boolean
  existingGroupPurchase?: {
    id: string
    includesBuyer?: boolean
    totalCopies: number
    discountPercent: number
    assignedCopies?: number
    phcodes?: string[]
  } | null
  currency?: string
  discount25PlusCopies?: number
  discount25Plus?: number
  discount50PlusCopies?: number
  discount50Plus?: number
}

const GroupBuyModal = ({
  open,
  onOpenChange,
  book,
  buyerOwnsBook = false,
  existingGroupPurchase,
  currency,
  discount25PlusCopies = 25,
  discount25Plus = 5,
  discount50PlusCopies = 50,
  discount50Plus = 10,
}: GroupBuyModalProps) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [additionalUsersInput, setAdditionalUsersInput] = useState('1')
  const includesBuyer = existingGroupPurchase?.includesBuyer ?? !buyerOwnsBook
  const buyerOffset = includesBuyer ? 1 : 0

  useEffect(() => {
    if (!open) return
    const minimumTotal = includesBuyer ? 2 : 1
    const initialAdditionalUsers = existingGroupPurchase
      ? Math.max(
          (existingGroupPurchase.totalCopies ?? minimumTotal) - buyerOffset,
          1,
        )
      : 1
    setAdditionalUsersInput(String(initialAdditionalUsers))
  }, [open, existingGroupPurchase, includesBuyer, buyerOffset])

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
      totalCopies: number
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
      totalCopies: parsedAdditionalUsers + buyerOffset,
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
  const totalUsers = hasValidAdditionalUsers
    ? parsedAdditionalUsers + buyerOffset
    : 1
  const discount = getGroupBuyDiscount(
    totalUsers,
    discount25PlusCopies,
    discount25Plus,
    discount50PlusCopies,
    discount50Plus,
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
            <Label htmlFor="additionalUsers">
              {includesBuyer ? 'How many other users?' : 'How many users?'}
            </Label>
            <Input
              id="additionalUsers"
              type="number"
              min={1}
              max={999}
              value={additionalUsersInput}
              onChange={(e) => setAdditionalUsersInput(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_PICK_COPIES.map((copyCount) => {
                const additionalUsers = copyCount - buyerOffset
                const isActive = hasValidAdditionalUsers
                  ? parsedAdditionalUsers + buyerOffset === copyCount
                  : false

                return (
                  <Button
                    key={copyCount}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() =>
                      setAdditionalUsersInput(String(additionalUsers))
                    }
                  >
                    {copyCount}
                  </Button>
                )
              })}
            </div>
            {includesBuyer ? (
              <p className="text-muted-foreground text-xs">
                You are automatically included. Set how many additional people
                you want to buy for now, then assign copies later from Manage
                Group Buy.
              </p>
            ) : (
              <p className="text-xs text-amber-700">
                You already have this book, so your account is excluded from
                this group buy.
              </p>
            )}
          </div>

          <div className="rounded-md border p-3 text-sm">
            <p>
              Total users:{' '}
              <strong>{hasValidAdditionalUsers ? totalUsers : '--'}</strong>{' '}
              {includesBuyer ? '(includes you)' : '(you are excluded)'}
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
