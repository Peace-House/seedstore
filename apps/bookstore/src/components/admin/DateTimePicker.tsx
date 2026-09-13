import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Calendar + time picker for scheduling.
 *
 * Replaces the native `datetime-local` input, which renders differently
 * in every browser and can't grey out past times.
 *
 * Past dates and times are unselectable, not merely rejected:
 *  • Days before today are disabled in the calendar.
 *  • When the chosen day IS today, the time input's `min` is the
 *    current clock time, so an earlier slot can't be picked either.
 *
 * Built on the shadcn `calendar`/`popover` already in this app
 * (react-day-picker v8), so it matches the rest of the admin UI.
 */
export interface DateTimePickerProps {
  /** ISO string, or '' when unset. */
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  /** Earliest allowed moment. Defaults to now. */
  minDate?: Date
  /** Latest allowed moment — used to stop a start passing its end. */
  maxDate?: Date
  disabled?: boolean
  /** Show a clear (×) button. */
  clearable?: boolean
  id?: string
  'aria-invalid'?: boolean
}

/** Midnight of the given day — for date-only comparisons. */
function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

/**
 * Upper bound for the year dropdown when no explicit max is given.
 * Announcements are short-lived, so two years ahead is generous while
 * keeping the dropdown short.
 */
function maxJumpDate(from: Date): Date {
  const d = new Date(from)
  d.setFullYear(d.getFullYear() + 2)
  return d
}

/** "HH:mm" for a time input. */
function toTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const DateTimePicker = ({
  value,
  onChange,
  placeholder = 'Pick a date & time',
  minDate,
  maxDate,
  disabled,
  clearable = true,
  id,
  'aria-invalid': ariaInvalid,
}: DateTimePickerProps) => {
  const selected = value ? new Date(value) : undefined
  const valid = selected && !Number.isNaN(selected.getTime())
  const min = minDate ?? new Date()

  /**
   * Picking a day keeps whatever time was already chosen. For a fresh
   * pick we default to the next whole hour rather than 00:00 — midnight
   * on today's date would be in the past and immediately invalid.
   */
  const handleSelectDay = (day: Date | undefined) => {
    if (!day) return
    const next = new Date(day)

    if (valid) {
      next.setHours(selected!.getHours(), selected!.getMinutes(), 0, 0)
    } else {
      const soon = new Date()
      soon.setHours(soon.getHours() + 1, 0, 0, 0)
      next.setHours(soon.getHours(), 0, 0, 0)
    }

    // Chose today but the carried-over time has already passed? Nudge
    // forward so the value is never born invalid.
    if (sameDay(next, min) && next.getTime() < min.getTime()) {
      next.setHours(min.getHours(), min.getMinutes() + 1, 0, 0)
    }

    // Mirror image: picking the SAME DAY as the upper bound, where the
    // defaulted time would land past it. Happens when the end date is
    // chosen first and the admin then picks a start on that same day —
    // without this the pair is inverted the instant it's created.
    if (maxDate && sameDay(next, maxDate) && next.getTime() > maxDate.getTime()) {
      const clamped = new Date(maxDate)
      clamped.setMinutes(clamped.getMinutes() - 1)
      // Only apply if it doesn't push us below the lower bound.
      if (clamped.getTime() >= min.getTime()) {
        next.setHours(clamped.getHours(), clamped.getMinutes(), 0, 0)
      }
    }

    onChange(next.toISOString())
  }

  const handleTimeChange = (time: string) => {
    if (!time) return
    const [h, m] = time.split(':').map(Number)
    const base = valid ? new Date(selected!) : new Date()
    base.setHours(h || 0, m || 0, 0, 0)
    onChange(base.toISOString())
  }

  // On the earliest allowed day, forbid times before the cutoff.
  const timeMin =
    valid && sameDay(selected!, min) ? toTimeValue(min) : undefined
  // Likewise on the latest allowed day.
  const timeMax =
    valid && maxDate && sameDay(selected!, maxDate)
      ? toTimeValue(maxDate)
      : undefined

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !valid && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {valid ? format(selected!, 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={valid ? selected : undefined}
            onSelect={handleSelectDay}
            // Whole days before the cutoff (or after the max) are greyed
            // out, so a past date simply can't be clicked.
            //
            // Note what is NOT restricted: when an end date is already
            // set, every day from today up to and including it stays
            // selectable — `maxDate` only closes off days AFTER the end,
            // never before it.
            disabled={(date) => {
              if (startOfDay(date) < startOfDay(min)) return true
              if (maxDate && startOfDay(date) > startOfDay(maxDate)) return true
              return false
            }}
            defaultMonth={valid ? selected : min}
            // Month/year dropdowns (borrowed from the divest calendar's
            // quick-jump idea) so a date months out doesn't need repeated
            // clicking through the month arrows.
            captionLayout="dropdown-buttons"
            fromDate={min}
            toDate={maxDate ?? maxJumpDate(min)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Time is a separate control — react-day-picker is date-only. */}
      <div className="relative">
        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="time"
          className="pl-8 w-[8.5rem]"
          value={valid ? toTimeValue(selected!) : ''}
          min={timeMin}
          max={timeMax}
          disabled={disabled || !valid}
          aria-invalid={ariaInvalid}
          aria-label="Time"
          onChange={(e) => handleTimeChange(e.target.value)}
        />
      </div>

      {clearable && valid && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Clear date"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export default DateTimePicker
