import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  createAdminOutreachLocation,
  updateAdminOutreachLocation,
  type OutreachLocation,
  type OutreachType,
} from '@/services/outreach'

interface OpeningHours {
  mon?: string
  tue?: string
  wed?: string
  thu?: string
  fri?: string
  sat?: string
  sun?: string
}

interface FormState {
  type: OutreachType
  externalId: string
  name: string
  addressLine: string
  city: string
  region: string
  country: string
  contactName: string
  phone: string
  whatsapp: string
  email: string
  languages: string
  privateLocation: boolean
  notes: string
  openingHours: OpeningHours
  classDayOfWeek: string
  classTime: string
  classDurationMin: string
  active: boolean
}

const emptyForm = (defaultType: OutreachType): FormState => ({
  type: defaultType,
  externalId: '',
  name: '',
  addressLine: '',
  city: '',
  region: '',
  country: '',
  contactName: '',
  phone: '',
  whatsapp: '',
  email: '',
  languages: '',
  privateLocation: false,
  notes: '',
  openingHours: {},
  classDayOfWeek: '',
  classTime: '',
  classDurationMin: '',
  active: true,
})

function fromLocation(loc: OutreachLocation): FormState {
  return {
    type: loc.type,
    externalId: loc.externalId ?? '',
    name: loc.name,
    addressLine: loc.addressLine ?? '',
    city: loc.city,
    region: loc.region ?? '',
    country: loc.country,
    contactName: loc.contactName ?? '',
    phone: loc.phone ?? '',
    whatsapp: loc.whatsapp ?? '',
    email: loc.email ?? '',
    languages: (loc.languages ?? []).join(', '),
    privateLocation: loc.privateLocation,
    notes: loc.notes ?? '',
    openingHours: (loc.openingHours as OpeningHours) ?? {},
    classDayOfWeek:
      loc.classSchedule?.dayOfWeek != null
        ? String(loc.classSchedule.dayOfWeek)
        : '',
    classTime: loc.classSchedule?.time ?? '',
    classDurationMin:
      loc.classSchedule?.durationMin != null
        ? String(loc.classSchedule.durationMin)
        : '',
    active: loc.active,
  }
}

function toPayload(state: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: state.type,
    externalId: state.externalId.trim() || null,
    name: state.name.trim(),
    addressLine: state.addressLine.trim() || null,
    city: state.city.trim(),
    region: state.region.trim() || null,
    country: state.country.trim().toUpperCase(),
    contactName: state.contactName.trim() || null,
    phone: state.phone.trim() || null,
    whatsapp: state.whatsapp.trim() || null,
    email: state.email.trim() || null,
    languages: state.languages
      .split(/[,\s]+/)
      .map((v) => v.trim())
      .filter(Boolean),
    privateLocation: state.privateLocation,
    notes: state.notes.trim() || null,
    active: state.active,
  }

  if (state.type === 'office') {
    // Flatten openingHours into the per-day column shape the backend
    // expects in the row format (openingHours_mon, _tue, ...).
    for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const) {
      payload[`openingHours_${day}`] = state.openingHours[day] || ''
    }
  } else {
    payload.classSchedule_dayOfWeek = state.classDayOfWeek
    payload.classSchedule_time = state.classTime
    payload.classSchedule_durationMin = state.classDurationMin
  }

  return payload
}

const DAY_LABELS: Array<[keyof OpeningHours, string]> = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
]

const DOW_OPTIONS = [
  { value: '0', label: 'Sun' },
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, dialog is in edit mode; otherwise create mode. */
  location?: OutreachLocation | null
  /** Pre-selected type for create mode. */
  defaultType?: OutreachType
}

const OutreachLocationEditDialog = ({
  open,
  onOpenChange,
  location,
  defaultType = 'office',
}: Props) => {
  const queryClient = useQueryClient()
  const [state, setState] = useState<FormState>(emptyForm(defaultType))

  useEffect(() => {
    if (open) {
      setState(location ? fromLocation(location) : emptyForm(defaultType))
    }
  }, [open, location, defaultType])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(state)
      if (location) {
        return updateAdminOutreachLocation(location.id, payload as any)
      }
      return createAdminOutreachLocation(payload as any)
    },
    onSuccess: () => {
      toast.success(location ? 'Location updated' : 'Location created')
      queryClient.invalidateQueries({
        queryKey: ['admin', 'outreach', 'locations'],
      })
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Save failed')
    },
  })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const setHour = (day: keyof OpeningHours, value: string) =>
    setState((s) => ({
      ...s,
      openingHours: { ...s.openingHours, [day]: value },
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {location ? `Edit ${location.name}` : 'New outreach location'}
          </DialogTitle>
          <DialogDescription>
            {location
              ? 'Update the saved details below. Coordinates are not edited here — re-upload via the bulk template to re-geocode.'
              : "Create a new location manually. Coordinates will be geocoded from the address you provide."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Type + active toggle */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Type</Label>
              <select
                value={state.type}
                onChange={(e) => set('type', e.target.value as OutreachType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!!location}
              >
                <option value="office">Peace House office</option>
                <option value="class">Discipleship class</option>
              </select>
              {location && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Type can't be changed after creation.
                </p>
              )}
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={state.active}
                  onCheckedChange={(v) => set('active', v)}
                />
                <span className="text-sm">
                  {state.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>External ID</Label>
              <Input
                value={state.externalId}
                onChange={(e) => set('externalId', e.target.value)}
                placeholder="lagos-ikoyi-1"
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={state.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Peace House Ikoyi"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label>Street address</Label>
            <Input
              value={state.addressLine}
              onChange={(e) => set('addressLine', e.target.value)}
              placeholder="12 Bourdillon Road"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>City *</Label>
              <Input
                value={state.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </div>
            <div>
              <Label>Region / State</Label>
              <Input
                value={state.region}
                onChange={(e) => set('region', e.target.value)}
              />
            </div>
            <div>
              <Label>Country (ISO-2) *</Label>
              <Input
                value={state.country}
                onChange={(e) => set('country', e.target.value.toUpperCase())}
                placeholder="NG"
                maxLength={2}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Contact name</Label>
              <Input
                value={state.contactName}
                onChange={(e) => set('contactName', e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={state.email}
                onChange={(e) => set('email', e.target.value)}
                type="email"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Phone (E.164)</Label>
              <Input
                value={state.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+2348012345678"
              />
            </div>
            <div>
              <Label>WhatsApp (E.164)</Label>
              <Input
                value={state.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="+2348012345678"
              />
            </div>
          </div>

          {/* Languages + privacy */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Languages (comma-separated)</Label>
              <Input
                value={state.languages}
                onChange={(e) => set('languages', e.target.value)}
                placeholder="en, yo"
              />
            </div>
            <div>
              <Label>Private location</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={state.privateLocation}
                  onCheckedChange={(v) => set('privateLocation', v)}
                />
                <span className="text-sm text-muted-foreground">
                  Hide street address in the app
                </span>
              </div>
            </div>
          </div>

          {/* Office hours */}
          {state.type === 'office' && (
            <div>
              <Label>Opening hours</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-7">
                {DAY_LABELS.map(([day, label]) => (
                  <div key={day}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <Input
                      value={state.openingHours[day] || ''}
                      onChange={(e) => setHour(day, e.target.value)}
                      placeholder="09:00-17:00"
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Leave a day blank if closed.
              </p>
            </div>
          )}

          {/* Class schedule */}
          {state.type === 'class' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Day of week</Label>
                <select
                  value={state.classDayOfWeek}
                  onChange={(e) => set('classDayOfWeek', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {DOW_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Time (HH:mm)</Label>
                <Input
                  value={state.classTime}
                  onChange={(e) => set('classTime', e.target.value)}
                  placeholder="19:00"
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  value={state.classDurationMin}
                  onChange={(e) => set('classDurationMin', e.target.value)}
                  placeholder="90"
                  type="number"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Notes (internal)</Label>
            <Textarea
              rows={2}
              value={state.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Not shown to users"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? 'Saving…'
              : location
                ? 'Save changes'
                : 'Create location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OutreachLocationEditDialog
