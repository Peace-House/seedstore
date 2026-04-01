import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Plus, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  checkPHCodes,
  getGroupBuyDiscount,
  removeGroupPurchase,
  setupGroupPurchase,
} from '@/services/groupPurchase'

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

type FlowStep = 'choice' | 'assign-now' | 'assign-later' | 'manage'

const GroupBuyModal = ({
  open,
  onOpenChange,
  book,
  existingGroupPurchase,
  currency,
}: GroupBuyModalProps) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<FlowStep>('choice')
  const [phcodes, setPhcodes] = useState<string[]>([''])
  const [checkResults, setCheckResults] = useState<Record<string, boolean>>({})
  const [additionalUsers, setAdditionalUsers] = useState<number>(1)

  const totalSeatsAssignNow = useMemo(
    () => phcodes.map((p) => p.trim()).filter(Boolean).length + 1,
    [phcodes],
  )

  const totalSeatsAssignLater = additionalUsers + 1

  // When the modal opens, jump straight to the correct step based on existing data
  useEffect(() => {
    if (!open) return
    if (existingGroupPurchase) {
      const existingCodes =
        existingGroupPurchase.phcodes?.filter((p) => p.trim().length > 0) ?? []
      if (
        existingCodes.length > 0 ||
        (existingGroupPurchase.assignedSeats ?? 0) > 0
      ) {
        setPhcodes(existingCodes.length > 0 ? existingCodes : [''])
        setStep('assign-now')
      } else {
        setAdditionalUsers(
          Math.max((existingGroupPurchase.totalSeats ?? 2) - 1, 1),
        )
        setStep('assign-later')
      }
    } else {
      setStep('choice')
      setPhcodes([''])
      setAdditionalUsers(1)
    }
    setCheckResults({})
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
        title: 'Unable to cancel group buy',
        description:
          error?.response?.data?.error || error?.message || 'Please try again.',
      })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async (codes: string[]) => checkPHCodes(codes),
    onSuccess: (data) => {
      const mapped: Record<string, boolean> = {}
      data.results.forEach((r) => {
        mapped[r.phcode.trim()] = r.exists
      })
      setCheckResults(mapped)

      const invalidCount = data.results.filter((r) => !r.exists).length
      if (invalidCount === 0) {
        toast({ title: 'All PH-Codes verified' })
      } else {
        toast({
          variant: 'destructive',
          title: 'Some PH-Codes are invalid',
          description: 'Please edit invalid PH-Codes before saving.',
        })
      }
    },
  })

  const setupMutation = useMutation({
    mutationFn: async (payload: {
      bookId: number | string
      totalSeats: number
      assignNow: boolean
      phcodes?: string[]
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

  const handleVerifyAndSaveAssignNow = async () => {
    if (!book) return
    const cleaned = phcodes.map((p) => p.trim()).filter(Boolean)
    if (cleaned.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Add at least one PH-Code',
      })
      return
    }

    const result = await verifyMutation.mutateAsync(cleaned)
    const invalid = result.results.filter((r) => !r.exists)
    if (invalid.length > 0) return

    setupMutation.mutate({
      bookId: book.id,
      totalSeats: cleaned.length + 1,
      assignNow: true,
      phcodes: cleaned,
      currency,
    })
  }

  const handleSaveAssignLater = () => {
    if (!book) return
    if (additionalUsers < 1) {
      toast({
        variant: 'destructive',
        title: 'Enter at least 1 additional user',
      })
      return
    }

    setupMutation.mutate({
      bookId: book.id,
      totalSeats: additionalUsers + 1,
      assignNow: false,
      currency,
    })
  }

  const renderManage = () => (
    <div className="space-y-4">
      <DialogDescription>
        Group buy already configured for this book. What would you like to do?
      </DialogDescription>
      <div className="rounded-md border p-3 text-sm">
        <p>
          Total users: <strong>{existingGroupPurchase?.totalSeats ?? 0}</strong>{' '}
          (includes you)
        </p>
        <p>
          Assigned seats:{' '}
          <strong>{existingGroupPurchase?.assignedSeats ?? 0}</strong>
        </p>
        <p>
          Discount:{' '}
          <strong>{existingGroupPurchase?.discountPercent ?? 0}%</strong>
        </p>
      </div>
      <div className="grid gap-2">
        <Button
          type="button"
          onClick={() => {
            const existingCodes =
              existingGroupPurchase?.phcodes?.filter(
                (p) => p.trim().length > 0,
              ) ?? []
            setPhcodes(existingCodes.length > 0 ? existingCodes : [''])
            setCheckResults({})
            setStep('assign-now')
          }}
        >
          Manage PH-Code List
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('assign-later')}
        >
          Change Seat Count
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            if (!existingGroupPurchase?.id) return
            cancelMutation.mutate(existingGroupPurchase.id)
          }}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Group Buy'}
        </Button>
      </div>
    </div>
  )

  const renderChoice = () => (
    <div className="space-y-3">
      <DialogDescription>
        Do you want to assign this group purchase to users now, or after
        payment?
      </DialogDescription>
      <div className="grid gap-3">
        <Button type="button" onClick={() => setStep('assign-now')}>
          Assign Immediately
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('assign-later')}
        >
          Assign Later
        </Button>
      </div>
    </div>
  )

  const renderAssignNow = () => {
    const discount = getGroupBuyDiscount(totalSeatsAssignNow)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Enter PH-Codes of other users
          </p>
          <Button
            type="button"
            size="sm"
            liquidGlass={false}
            className="rounded-full"
            variant="outline"
            onClick={() => setPhcodes((prev) => [...prev, ''])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {phcodes.map((code, idx) => {
            const trimmed = code.trim()
            const hasResult =
              trimmed.length > 0 && checkResults[trimmed] !== undefined
            const exists = hasResult ? checkResults[trimmed] : false

            return (
              <div key={`${idx}-${code}`} className="flex items-center gap-2">
                <Input
                  placeholder={`PH-Code ${idx + 1}`}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value
                    setPhcodes((prev) =>
                      prev.map((p, i) => (i === idx ? val : p)),
                    )
                  }}
                />
                {hasResult ? (
                  exists ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setPhcodes((prev) => prev.filter((_, i) => i !== idx))
                  }
                  disabled={phcodes.length <= 1}
                >
                  x
                </Button>
              </div>
            )
          })}
        </div>

        <div className="rounded-md border p-3 text-sm">
          <p>
            Total users: <strong>{totalSeatsAssignNow}</strong> (includes you)
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
              setStep('choice')
            }}
            disabled={cancelMutation.isPending}
          >
            {existingGroupPurchase
              ? cancelMutation.isPending
                ? 'Cancelling...'
                : 'Cancel Group Buy'
              : 'Back'}
          </Button>
          <Button
            type="button"
            onClick={handleVerifyAndSaveAssignNow}
            disabled={verifyMutation.isPending || setupMutation.isPending}
            variant="default"
          >
            {verifyMutation.isPending || setupMutation.isPending
              ? 'Saving...'
              : 'Save List'}
          </Button>
        </div>
      </div>
    )
  }

  const renderAssignLater = () => {
    const discount = getGroupBuyDiscount(totalSeatsAssignLater)
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="additionalUsers">How many other users?</Label>
          <Input
            id="additionalUsers"
            type="number"
            min={1}
            max={999}
            value={additionalUsers}
            onChange={(e) => {
              const parsed = Number(e.target.value)
              setAdditionalUsers(
                Number.isFinite(parsed) ? Math.max(1, parsed) : 1,
              )
            }}
          />
          <p className="text-muted-foreground text-xs">
            You are automatically included. Total users = you + additional
            users.
          </p>
        </div>

        <div className="rounded-md border p-3 text-sm">
          <p>
            Total users: <strong>{totalSeatsAssignLater}</strong> (includes you)
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
              setStep('choice')
            }}
            disabled={cancelMutation.isPending}
          >
            {existingGroupPurchase
              ? cancelMutation.isPending
                ? 'Cancelling...'
                : 'Cancel Group Buy'
              : 'Back'}
          </Button>
          <Button
            type="button"
            onClick={handleSaveAssignLater}
            disabled={setupMutation.isPending}
            variant="default"
          >
            {setupMutation.isPending ? 'Saving...' : 'Save Group Buy'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAndReset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Group Buy: {book?.title ?? ''}</DialogTitle>
        </DialogHeader>

        {step === 'manage' && renderManage()}
        {step === 'choice' && renderChoice()}
        {step === 'assign-now' && renderAssignNow()}
        {step === 'assign-later' && renderAssignLater()}
      </DialogContent>
    </Dialog>
  )
}

export default GroupBuyModal
