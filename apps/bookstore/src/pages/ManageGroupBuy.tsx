import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  assignGroupPurchaseCopies,
  checkPHCodes,
  getMyGroupPurchases,
} from '@/services/groupPurchase'
import Breadcrumb from '@/components/Breadcrumb'
import Navigation from '@/components/Navigation'
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper'

const ManageGroupBuy = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [drafts, setDrafts] = useState<Record<string, string[]>>({})
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>(
    {},
  )

  const { data, isLoading } = useQuery({
    queryKey: ['group-purchases'],
    queryFn: getMyGroupPurchases,
  })

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const assignMutation = useMutation({
    mutationFn: async ({ id, phcodes }: { id: string; phcodes: string[] }) =>
      assignGroupPurchaseCopies(id, phcodes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-purchases'] })
      toast({ title: 'Copies assigned successfully' })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Copy assignment failed',
        description:
          error?.response?.data?.error || error?.message || 'Please try again',
      })
    },
  })

  const verifyCodes = async (id: string) => {
    const codes = (drafts[id] ?? []).map((c) => c.trim()).filter(Boolean)
    if (codes.length === 0) {
      toast({ variant: 'destructive', title: 'Add PH-Codes first' })
      return false
    }

    const result = await checkPHCodes(codes)
    const map: Record<string, boolean> = {}
    result.results.forEach((r) => {
      map[r.phcode.trim()] = r.exists
    })
    setChecks((prev) => ({ ...prev, [id]: map }))

    const allValid = result.results.every((r) => r.exists)
    if (!allValid) {
      toast({
        variant: 'destructive',
        title: 'Some PH-Codes are invalid',
      })
    }

    return allValid
  }

  const saveAssignment = async (id: string) => {
    const valid = await verifyCodes(id)
    if (!valid) return

    const codes = (drafts[id] ?? []).map((c) => c.trim()).filter(Boolean)
    assignMutation.mutate({ id, phcodes: codes })
  }

  const setDraftCode = (id: string, idx: number, value: string) => {
    setDrafts((prev) => {
      const current = [...(prev[id] ?? [''])]
      current[idx] = value
      return { ...prev, [id]: current }
    })
  }

  const addDraftCode = (id: string) => {
    setDrafts((prev) => ({ ...prev, [id]: [...(prev[id] ?? ['']), ''] }))
  }

  const removeDraftCode = (id: string, idx: number) => {
    setDrafts((prev) => {
      const current = [...(prev[id] ?? [''])]
      const next = current.filter((_, i) => i !== idx)
      return { ...prev, [id]: next.length > 0 ? next : [''] }
    })
  }

  return (
    <Navigation>
      <div className="container mt-8 space-y-6 pb-16">
        <Breadcrumb
          routes={[
            { label: 'Home', path: '/' },
            { label: 'Library', path: '/library' },
            { label: 'Manage Group Buy' },
          ]}
        />
        <h1 className="text-3xl font-bold">Manage Group Buy</h1>

        {isLoading ? <p>Loading...</p> : null}

        {!isLoading && items.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground p-6">
              You have no group purchases yet.
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {items.map((gp) => {
            const remaining = gp.totalCopies - gp.assignedCopies
            const isPaid = gp.status === 'PAID' || gp.status === 'COMPLETED'
            const editable = isPaid && remaining > 0
            const localDraft = drafts[gp.id] ?? ['']
            const localChecks = checks[gp.id] ?? {}

            return (
              <LiquidGlassWrapper
                key={gp.id}
                style={{
                  border: '0.5px solid green',
                }}
              >
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{gp.book.title}</h2>
                      <p className="text-muted-foreground text-sm">
                        Status: {gp.status} · Copies: {gp.assignedCopies}/
                        {gp.totalCopies} assigned
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Remaining copies: {remaining}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        Discount: <strong>{gp.discountPercent}%</strong>
                      </p>
                      <p>
                        Paid: <strong>{gp.totalPaid.toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>

                  {editable ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Assign PH-Codes to remaining copies
                      </p>
                      {localDraft.map((code, idx) => {
                        const key = code.trim()
                        const checked =
                          key.length > 0 && localChecks[key] !== undefined
                        const ok = checked ? localChecks[key] : false
                        return (
                          <div
                            key={`${gp.id}-${idx}`}
                            className="flex items-center gap-2"
                          >
                            <Input
                              value={code}
                              placeholder={`PH-Code ${idx + 1}`}
                              onChange={(e) =>
                                setDraftCode(gp.id, idx, e.target.value)
                              }
                            />
                            {checked ? (
                              <span
                                className={
                                  ok ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {ok ? '✓' : '✕'}
                              </span>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-full"
                              style={{
                                color: 'red',
                                border: '0.5px solid',
                              }}
                              onClick={() => removeDraftCode(gp.id, idx)}
                            >
                              Remove
                            </Button>
                          </div>
                        )
                      })}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          liquidGlass={false}
                          variant="default"
                          className="bg-primary/20 hover:bg-primary/10 text-primary hover:text-primary"
                          onClick={() => addDraftCode(gp.id)}
                          disabled={localDraft.length >= remaining}
                        >
                          Add PH-Code
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          style={{
                            color: 'red',
                          }}
                          onClick={() => verifyCodes(gp.id)}
                          disabled={localDraft.every((c) => !c.trim())}
                        >
                          Check PH-Codes
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => saveAssignment(gp.id)}
                          disabled={
                            assignMutation.isPending ||
                            localDraft.every((c) => !c.trim()) ||
                            !localDraft
                              .map((c) => c.trim())
                              .filter(Boolean)
                              .every((code) => localChecks[code] === true)
                          }
                        >
                          Assign Copies
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {gp.status === 'PENDING'
                        ? 'Complete payment first, then copies can be assigned.'
                        : 'All copies are already assigned.'}
                    </p>
                  )}
                </CardContent>
              </LiquidGlassWrapper>
            )
          })}
        </div>
      </div>
    </Navigation>
  )
}

export default ManageGroupBuy
