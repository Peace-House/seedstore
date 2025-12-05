import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, X, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface FilterConfig {
  // Search configuration
  searchPlaceholder?: string
  searchEnabled?: boolean

  // Status filter configuration
  statusEnabled?: boolean
  statusOptions?: { value: string; label: string }[]
  statusPlaceholder?: string

  // Date filter configuration
  dateEnabled?: boolean
  dateLabel?: string
}

export interface FilterValues {
  search: string
  status: string
  dateFrom: Date | undefined
  dateTo: Date | undefined
}

interface AdvancedFilterProps {
  config: FilterConfig
  onFilterChange: (filters: FilterValues) => void
  className?: string
}

const defaultConfig: FilterConfig = {
  searchPlaceholder: 'Search...',
  searchEnabled: true,
  statusEnabled: false,
  statusOptions: [],
  statusPlaceholder: 'All statuses',
  dateEnabled: true,
  dateLabel: 'Filter by date',
}

const AdvancedFilter = ({ config: userConfig, onFilterChange, className }: AdvancedFilterProps) => {
  const config = { ...defaultConfig, ...userConfig }

  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = status || dateFrom || dateTo
  const activeFilterCount = [status, dateFrom, dateTo].filter(Boolean).length

  const applyFilters = useCallback(
    (overrides?: Partial<FilterValues>) => {
      onFilterChange({
        search: overrides?.search ?? searchInput,
        status: overrides?.status ?? status,
        dateFrom: overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFrom,
        dateTo: overrides?.dateTo !== undefined ? overrides.dateTo : dateTo,
      })
    },
    [searchInput, status, dateFrom, dateTo, onFilterChange]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? '' : value)
    applyFilters({ status: value === 'all' ? '' : value })
  }

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date)
    applyFilters({ dateFrom: date })
  }

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date)
    applyFilters({ dateTo: date })
  }

  const clearFilters = () => {
    setSearchInput('')
    setStatus('')
    setDateFrom(undefined)
    setDateTo(undefined)
    onFilterChange({
      search: '',
      status: '',
      dateFrom: undefined,
      dateTo: undefined,
    })
  }

  const clearSearch = () => {
    setSearchInput('')
    applyFilters({ search: '' })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Toggle Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        {config.searchEnabled && (
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={config.searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" size="default">
              Search
            </Button>
          </form>
        )}

        {/* Filter Toggle Button */}
        {(config.statusEnabled || config.dateEnabled) && (
          <Button
            type="button"
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg border">
          {/* Status Filter */}
          {config.statusEnabled && config.statusOptions && config.statusOptions.length > 0 && (
            <div className="space-y-2 min-w-[180px]">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={status || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder={config.statusPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{config.statusPlaceholder}</SelectItem>
                  {config.statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date From */}
          {config.dateEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={handleDateFromChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Date To */}
          {config.dateEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={handleDateToChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-2" />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default AdvancedFilter
