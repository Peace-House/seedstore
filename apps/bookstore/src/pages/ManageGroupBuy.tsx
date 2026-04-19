import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  assignGroupPurchaseCopies,
  checkPHCodes,
  getMyGroupPurchases,
  type GroupPurchase,
} from '@/services/groupPurchase'
import Breadcrumb from '@/components/Breadcrumb'
import Navigation from '@/components/Navigation'
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  parsePhcodesFromDocx,
  parsePhcodesFromExcel,
  parsePhcodesFromFreeText,
} from '@/utils/bulkPhcodes'
import { ChevronDown, CircleHelp, FileUp, Loader2 } from 'lucide-react'

function phcodeMapKey(code: string): string {
  return code.trim().toUpperCase()
}

type PhCheckEntry = {
  exists: boolean
  displayName?: string | null
  seedStoreLinked?: boolean
}

const MSG_SELF = 'You cannot assign to yourself again'
const MSG_ALREADY = 'User already assigned a copy'
const MSG_DUP_ON_LIST = 'User is already on the assign list'
const MSG_LEGACY = 'This user has not logged in to Seed Store'

const BADGE_WARNING =
  'pointer-events-none absolute right-2 top-2 min-w-max md:top-1/2 -translate-y-1/2 truncate rounded-full bg-amber-500/20 px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-sm font-medium leading-tight text-amber-950 dark:bg-amber-500/25 dark:text-amber-50'

const BADGE_NAME =
  'bg-primary/10 text-primary pointer-events-none absolute right-2 top-2 md:top-1/2 max-w-[min(100%-1rem,12rem)] -translate-y-1/2 truncate rounded-full px-1 md:px-2 py-0.5 md:py-1 text-[10px] md:text-sm font-medium leading-tight'

function assignedPhcodeKeys(gp: GroupPurchase): Set<string> {
  return new Set(
    gp.copies
      .map((c) => (c.phcode ? phcodeMapKey(c.phcode) : ''))
      .filter(Boolean),
  )
}

function draftKeyCounts(draft: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const c of draft) {
    const k = phcodeMapKey(c)
    if (!k) continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

/** Lowest row index whose value normalizes to `phKey` (non-empty). */
function firstDraftIndexForPhcode(draft: string[], phKey: string): number {
  if (!phKey) return -1
  for (let i = 0; i < draft.length; i++) {
    if (phcodeMapKey(draft[i]) === phKey) return i
  }
  return -1
}

function codesPassClientRules(
  gp: GroupPurchase,
  draft: string[],
  resultMap: Record<string, PhCheckEntry>,
  userPhcode?: string | null,
): boolean {
  const trimmed = draft.map((c) => c.trim()).filter(Boolean)
  if (trimmed.length === 0) return false
  const assignedKeys = assignedPhcodeKeys(gp)
  const buyerKey = userPhcode ? phcodeMapKey(userPhcode) : ''
  const counts = draftKeyCounts(trimmed)

  for (const code of trimmed) {
    const key = phcodeMapKey(code)
    const entry = resultMap[key]
    if (!entry?.exists) return false
    if (entry.exists && entry.seedStoreLinked === false) return false
    if (gp.includesBuyer && buyerKey && key === buyerKey) return false
    if (assignedKeys.has(key)) return false
    if ((counts.get(key) ?? 0) > 1) return false
  }
  return true
}

const ManageGroupBuy = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [drafts, setDrafts] = useState<Record<string, string[]>>({})
  const [checks, setChecks] = useState<Record<string, Record<string, PhCheckEntry>>>(
    {},
  )
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [checkingGroupId, setCheckingGroupId] = useState<string | null>(null)
  const [bulkModal, setBulkModal] = useState<{
    open: boolean
    groupId: string | null
    maxSlots: number
  }>({ open: false, groupId: null, maxSlots: 0 })
  const [bulkPasteText, setBulkPasteText] = useState('')
  const [bulkParsing, setBulkParsing] = useState(false)
  const bulkFileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['group-purchases'],
    queryFn: getMyGroupPurchases,
  })

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const clearChecksForGroup = (id: string) => {
    setChecks((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const assignMutation = useMutation({
    mutationFn: async ({ id, phcodes }: { id: string; phcodes: string[] }) =>
      assignGroupPurchaseCopies(id, phcodes),
    onSuccess: (_data, variables) => {
      const id = variables.id
      clearChecksForGroup(id)
      setDrafts((prev) => ({ ...prev, [id]: [''] }))
      queryClient.invalidateQueries({ queryKey: ['group-purchases'] })
      toast({ title: 'Copies assigned successfully' })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } }; message?: string }
      toast({
        variant: 'destructive',
        title: 'Copy assignment failed',
        description:
          err?.response?.data?.error || err?.message || 'Please try again',
      })
    },
  })

  const verifyCodes = async (id: string) => {
    const codes = (drafts[id] ?? []).map((c) => c.trim()).filter(Boolean)
    if (codes.length === 0) {
      toast({ variant: 'destructive', title: 'Add PH-Codes first' })
      return false
    }

    setCheckingGroupId(id)
    try {
      const gp = items.find((g) => g.id === id)
      const result = await checkPHCodes(codes)

      // Map only this API response — do not merge old keys for removed PH-Codes
      // (stale entries caused Assign → verify → false client rules).
      const mergedMap: Record<string, PhCheckEntry> = {}
      result.results.forEach((r) => {
        const k = phcodeMapKey(r.phcode)
        mergedMap[k] = {
          exists: r.exists,
          displayName: r.displayName ?? null,
          seedStoreLinked: Boolean(r.seedStoreLinked),
        }
      })
      setChecks((prev) => ({ ...prev, [id]: mergedMap }))

      const allApiValid = result.results.every((r) => r.exists)
      if (!allApiValid) {
        toast({
          variant: 'destructive',
          title: 'Some PH-Codes are invalid',
        })
        return false
      }

      if (gp && !codesPassClientRules(gp, codes, mergedMap, user?.phcode)) {
        toast({
          variant: 'destructive',
          title: 'PH-Code issues',
          description:
            'Fix the warnings on the fields (self-assignment, duplicate, already assigned, or Seed Store account required).',
        })
        return false
      }

      return true
    } catch {
      toast({
        variant: 'destructive',
        title: 'Check failed',
        description: 'Could not verify PH-Codes. Please try again.',
      })
      return false
    } finally {
      setCheckingGroupId(null)
    }
  }

  const saveAssignment = async (id: string) => {
    const valid = await verifyCodes(id)
    if (!valid) return

    const codes = (drafts[id] ?? []).map((c) => c.trim()).filter(Boolean)
    assignMutation.mutate({ id, phcodes: codes })
  }

  const setDraftCode = (id: string, idx: number, value: string) => {
    clearChecksForGroup(id)
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
    const current = [...(drafts[id] ?? [''])]
    const removed = current[idx] ?? ''
    const next = current.filter((_, i) => i !== idx)
    const nextDraft = next.length > 0 ? next : ['']
    const removedKey = phcodeMapKey(removed)

    setDrafts((prev) => ({ ...prev, [id]: nextDraft }))

    if (removedKey) {
      const stillUsed = nextDraft.some((c) => phcodeMapKey(c) === removedKey)
      if (!stillUsed) {
        setChecks((prev) => {
          const cur = { ...(prev[id] ?? {}) }
          delete cur[removedKey]
          return { ...prev, [id]: cur }
        })
      }
    }
  }

  const canAssign = (gp: GroupPurchase, gpId: string, draft: string[]) => {
    const trimmed = draft.map((c) => c.trim()).filter(Boolean)
    if (trimmed.length === 0) return false
    const localChecks = checks[gpId] ?? {}
    return codesPassClientRules(gp, draft, localChecks, user?.phcode)
  }

  const closeBulkModal = () => {
    setBulkModal({ open: false, groupId: null, maxSlots: 0 })
    setBulkPasteText('')
    setBulkParsing(false)
  }

  const openBulkModal = (groupId: string, maxSlots: number) => {
    setBulkPasteText('')
    setBulkModal({ open: true, groupId, maxSlots })
  }

  const applyBulkDraft = () => {
    const id = bulkModal.groupId
    const max = bulkModal.maxSlots
    if (!id) return
    const codes = parsePhcodesFromFreeText(bulkPasteText)
    if (codes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No PH-Codes found',
        description: 'Paste or import a list, then try again.',
      })
      return
    }
    clearChecksForGroup(id)
    const applied = codes.slice(0, max)
    if (codes.length > max) {
      toast({
        title: 'Slot limit',
        description: `${codes.length - max} code(s) were not added. You have ${max} open slot(s).`,
      })
    }
    setDrafts((prev) => ({ ...prev, [id]: applied }))
    toast({ title: `${applied.length} PH-Code(s) loaded` })
    closeBulkModal()
  }

  const handleBulkFile = async (file: File) => {
    const name = file.name.toLowerCase()
    setBulkParsing(true)
    try {
      const buf = await file.arrayBuffer()
      let codes: string[] = []
      if (name.endsWith('.docx')) {
        codes = await parsePhcodesFromDocx(buf)
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        codes = parsePhcodesFromExcel(buf)
      } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = new TextDecoder('utf-8').decode(buf)
        codes = parsePhcodesFromFreeText(text)
      } else {
        toast({
          variant: 'destructive',
          title: 'Unsupported file',
          description: 'Use .csv, .txt, .xlsx, .xls, or .docx.',
        })
        return
      }
      setBulkPasteText(codes.join('\n'))
      toast({
        title: 'File imported',
        description: `${codes.length} unique PH-Code(s) found. Review below, then apply.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'Could not read that file. Try CSV or paste instead.',
      })
    } finally {
      setBulkParsing(false)
    }
  }

  return (
    <Navigation>
      <div className="container mt-8 space-y-6 pb-16">
        <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>How group copy assignment works</DialogTitle>
            </DialogHeader>
            <div className="text-muted-foreground space-y-4 text-sm">
              <p>
                After you pay for a group buy, your purchase appears here. You
                then assign each extra copy to someone else by their{' '}
                <strong>PH-Code</strong> (Living Seed profile code).
              </p>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Use <strong>Add PH-Code</strong> until you have one field per
                  copy you still need to assign. You cannot add more rows than
                  there are open slots.
                </li>
                <li>
                  Enter a code, then tap <strong>Check PH-Codes</strong>. If the
                  profile exists, a name badge appears on the field and a check
                  mark confirms it.
                </li>
                <li>
                  When every code is verified and passes checks (green check),
                  <strong> Assign Copies</strong> becomes available. You cannot
                  assign your own PH code if you already have a reserved copy,
                  assign the same code twice, or assign someone who has not
                  created a Seed Store account yet.
                </li>
                <li>
                  <strong>Bulk add (many codes):</strong> use{' '}
                  <strong>Bulk add PH-Codes</strong> to open a modal. Paste codes
                  separated by commas, spaces, or new lines, or upload a{' '}
                  <strong>.csv</strong>, <strong>.txt</strong>,{' '}
                  <strong>Excel (.xlsx / .xls)</strong>, or <strong>Word (.docx)</strong>{' '}
                  file—we read text and cells, dedupe, and fill up to your number
                  of open slots (extras are skipped with a notice). Then use{' '}
                  <strong>Check PH-Codes</strong> and <strong>Assign Copies</strong>{' '}
                  as usual. Remove duplicate rows in the list before checking.
                </li>
                <li>
                  If your group purchase <strong>includes you</strong> as a reader
                  for one copy, that copy is already counted as yours—you only
                  assign the remaining copies with PH-Codes.
                </li>
              </ol>
              <p className="border-t pt-3">
                Assigned recipients also appear in the list below each book so you
                can see who already received a copy.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={bulkModal.open}
          onOpenChange={(open) => {
            if (!open) closeBulkModal()
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk add PH-Codes</DialogTitle>
              <DialogDescription>
                Up to {bulkModal.maxSlots} code(s) for this purchase. Duplicates
                in your list are removed. Extra codes beyond your slots are not
                added.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-phcodes-paste">Paste list</Label>
                <Textarea
                  id="bulk-phcodes-paste"
                  rows={8}
                  placeholder="PH001, PH002&#10;PH003"
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  className="font-mono text-sm"
                  disabled={bulkParsing}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,.docx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void handleBulkFile(file)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={bulkParsing}
                  onClick={() => bulkFileInputRef.current?.click()}
                >
                  {bulkParsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  {bulkParsing ? 'Reading file...' : 'Upload file'}
                </Button>
                <span className="text-muted-foreground self-center text-xs">
                  .csv, .txt, .xlsx, .xls, .docx
                </span>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeBulkModal}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={applyBulkDraft}
                disabled={bulkParsing || !bulkPasteText.trim()}
              >
                Apply to fields
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Breadcrumb
          routes={[
            { label: 'Home', path: '/' },
            { label: 'Library', path: '/library' },
            { label: 'Manage Group Buy' },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Manage Group Buy</h1>
          <Button
            type="button"
            variant="link"
            size="sm"
            liquidGlass={false}
            className="gap-2 text-red-600"
            onClick={() => setHowItWorksOpen(true)}
          >
            <CircleHelp className="h-4 w-4" />
            How it works
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </p>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground p-6">
              You have no group purchases yet.
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {items.map((gp) => {
            const buyerReservedCopies = gp.includesBuyer ? 1 : 0
            const displayAssignedCount = gp.assignedCopies + buyerReservedCopies
            const unassignedCopyCount = gp.copies.filter((c) => !c.phcode).length
            const isPaid = gp.status === 'PAID' || gp.status === 'COMPLETED'
            const editable = isPaid && unassignedCopyCount > 0
            const localDraft = drafts[gp.id] ?? ['']
            const localChecks = checks[gp.id] ?? {}
            const assignedList = gp.copies.filter((c) => c.phcode)
            const assignedKeys = assignedPhcodeKeys(gp)
            const buyerPhKey = user?.phcode ? phcodeMapKey(user.phcode) : ''
            const draftKeyCount = draftKeyCounts(localDraft)
            const hasDuplicateInDraft = [...draftKeyCount.values()].some(
              (n) => n > 1,
            )
            const isCheckingThis = checkingGroupId === gp.id
            const isAssigningThis =
              assignMutation.isPending &&
              assignMutation.variables?.id === gp.id

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
                        Status: {gp.status} · Copies: {displayAssignedCount}/
                        {gp.totalCopies} assigned
                        {gp.includesBuyer ? (
                          <span className="block text-xs">
                            (Includes your copy when you joined the group as a
                            reader.)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Remaining copies to assign by PH-Code: {unassignedCopyCount}
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

                  {assignedList.length > 0 || gp.includesBuyer ? (
                    <Collapsible defaultOpen className="bg-muted/40 rounded-lg border">
                      <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors">
                        <span>Assigned recipients</span>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="border-t px-3 pb-3 pt-1">
                        <ul className="space-y-2 text-sm">
                          {gp.includesBuyer ? (
                            <li className="flex flex-wrap justify-between gap-2 border-b border-dashed pb-2">
                              <span className="text-muted-foreground">
                                You (buyer)
                              </span>
                              <span className="font-medium">1 copy (reserved)</span>
                            </li>
                          ) : null}
                          {assignedList.map((copy) => (
                            <li
                              key={copy.id}
                              className="flex flex-wrap justify-between gap-2"
                            >
                              <span className="font-mono text-xs tracking-wide">
                                {copy.phcode}
                              </span>
                              <span className="text-muted-foreground max-w-[60%] text-right">
                                {copy.assigneeName?.trim() ||
                                  'Profile found — name will show when linked to SeedStore'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : null}

                  {editable ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Assign PH-Codes to remaining copies
                      </p>
                      {localDraft.map((code, idx) => {
                        const key = phcodeMapKey(code)
                        const entry =
                          key.length > 0 ? localChecks[key] : undefined
                        const checked = entry !== undefined
                        const apiOk = checked ? entry.exists : false
                        const displayName = entry?.displayName?.trim()
                        const seedLinked = entry?.seedStoreLinked === true

                        const isSelf =
                          Boolean(key) &&
                          gp.includesBuyer &&
                          Boolean(buyerPhKey) &&
                          key === buyerPhKey
                        const alreadyAssigned =
                          Boolean(key) && assignedKeys.has(key)
                        const dupInDraft =
                          Boolean(key) && (draftKeyCount.get(key) ?? 0) > 1
                        const isDuplicateListRow =
                          dupInDraft &&
                          firstDraftIndexForPhcode(localDraft, key) !== idx

                        const rowOk =
                          apiOk &&
                          !isSelf &&
                          !alreadyAssigned &&
                          !dupInDraft &&
                          (checked ? seedLinked : true)

                        let badge: { text: string; variant: 'warn' | 'name' } | null =
                          null
                        if (key) {
                          if (isSelf) {
                            badge = { text: MSG_SELF, variant: 'warn' }
                          } else if (alreadyAssigned) {
                            badge = { text: MSG_ALREADY, variant: 'warn' }
                          } else if (isDuplicateListRow) {
                            badge = { text: MSG_DUP_ON_LIST, variant: 'warn' }
                          } else if (
                            checked &&
                            apiOk &&
                            !seedLinked &&
                            entry?.seedStoreLinked === false
                          ) {
                            badge = { text: MSG_LEGACY, variant: 'warn' }
                          } else if (
                            checked &&
                            apiOk &&
                            seedLinked &&
                            displayName
                          ) {
                            badge = { text: displayName, variant: 'name' }
                          }
                        }

                        return (
                          <div
                            key={`${gp.id}-${idx}`}
                            className="flex flex-wrap items-center justify-end gap-2"
                          >
                            <div className="relative min-w-[200px] max-w-full flex-1">
                              <Input
                                value={code}
                                placeholder={`PH-Code ${idx + 1}`}
                                className={cn(
                                  'rounded-full text-xs font-bold md:text-sm',
                                  // badge ? 'pr-[min(15rem,calc(100%-0.5rem))]' : '',
                                )}
                                onChange={(e) =>
                                  setDraftCode(gp.id, idx, e.target.value)
                                }
                              />
                              {/* desktop only */}
                              {badge ? (
                                <span
                                  className={cn(
                                    // 'hidden md:block',
                                    badge.variant === 'name'
                                      ? BADGE_NAME
                                      : BADGE_WARNING,
                                  )}
                                >
                                  {badge.text}
                                </span>
                              ) : null}
                            </div>
                            {checked ? (
                              <span
                                className={
                                  rowOk ? 'text-green-600' : 'text-red-600'
                                }
                                aria-hidden
                              >
                                {rowOk ? '✓' : '✕'}
                              </span>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-full w-full md:w-auto text-xs font-bold md:text-sm h-6 md:h-6 !py-0.5 md:py-1"
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
                      <div className="flex flex-wrap gap-2 !mt-6">
                        <Button
                          type="button"
                          liquidGlass={false}
                          variant="default"
                          className="bg-primary/20 hover:bg-primary/10 text-primary hover:text-primary md:rounded-tl-full md:rounded-bl-full w-full md:w-auto"
                          onClick={() => addDraftCode(gp.id)}
                          disabled={localDraft.length >= unassignedCopyCount}
                        >
                          Add PH-Code
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          className="gap-2 md:rounded-tr-full md:rounded-br-full w-full md:w-auto"
                          onClick={() =>
                            openBulkModal(gp.id, unassignedCopyCount)
                          }
                          disabled={
                            isCheckingThis ||
                            isAssigningThis ||
                            unassignedCopyCount === 0
                          }
                        >
                          <FileUp className="h-4 w-4" />
                          Bulk add PH-Codes
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="md:rounded-tl-full md:rounded-bl-full"
                          style={{
                            color: 'red',
                          }}
                          onClick={() => void verifyCodes(gp.id)}
                          disabled={
                            localDraft.every((c) => !c.trim()) ||
                            hasDuplicateInDraft ||
                            isCheckingThis ||
                            isAssigningThis
                          }
                        >
                          {isCheckingThis ? 'Checking...' : 'Check PH-Codes'}
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          className="md:rounded-tr-full md:rounded-br-full"
                          onClick={() => void saveAssignment(gp.id)}
                          disabled={
                            isCheckingThis ||
                            isAssigningThis ||
                            !canAssign(gp, gp.id, localDraft)
                          }
                        >
                          {isAssigningThis ? 'Assigning...' : 'Assign Copies'}
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
