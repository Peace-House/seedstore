import { Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  NewsletterBookReadingStatus,
  NewsletterReaderLevel,
  NewsletterTargetMode,
} from '@/services/user'
import type { TargetingFilters } from './useTargetingFilters'
import type { Channel } from './types'

/**
 * Shared audience-targeting panel. Used by both the email-newsletter and
 * push-notification composers so the same audience can be sent either way.
 * Push can't reach raw email addresses, so the "pasted emails" mode is hidden
 * when the active channel is push.
 */
const TargetingFiltersPanel = ({
  tf,
  channel,
}: {
  tf: TargetingFilters
  channel: Channel
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Targeting Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Target mode</Label>
          <Select
            value={tf.targetMode}
            onValueChange={(value) =>
              tf.setTargetMode(value as NewsletterTargetMode)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="manual">Specific users</SelectItem>
              {channel === 'email' && (
                <SelectItem value="pasted-emails">Pasted emails only</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {tf.targetMode === 'manual' && (
          <div className="space-y-3 rounded-lg border p-3">
            <Label>Select specific users</Label>
            <Input
              placeholder="Search by name, email, or ID"
              value={tf.manualSearch}
              onChange={(e) => tf.setManualSearch(e.target.value)}
            />
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {tf.filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={tf.selectedUserIds.includes(user.id)}
                    onCheckedChange={(checked) =>
                      tf.handleToggleUser(user.id, checked === true)
                    }
                  />
                  <span className="font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-muted-foreground">({user.email})</span>
                </label>
              ))}
            </div>
            <Badge variant="secondary">
              Selected: {tf.selectedUserIds.length}
            </Badge>
          </div>
        )}

        {channel === 'email' && tf.targetMode === 'pasted-emails' && (
          <div className="space-y-2">
            <Label>Pasted emails (newline, comma, or semicolon separated)</Label>
            <Textarea
              value={tf.pastedEmailsInput}
              onChange={(e) => tf.setPastedEmailsInput(e.target.value)}
              rows={6}
              placeholder="person1@email.com&#10;person2@email.com"
            />
            <Badge variant="secondary">
              Parsed emails: {tf.pastedEmails.length}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Date from</Label>
            <Input
              type="date"
              value={tf.dateFrom}
              onChange={(e) => tf.setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Date to</Label>
            <Input
              type="date"
              value={tf.dateTo}
              onChange={(e) => tf.setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Active in days</Label>
            <Input
              placeholder="e.g. 30"
              value={tf.activeInDays}
              onChange={(e) => tf.setActiveInDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Inactive in days</Label>
            <Input
              placeholder="e.g. 180"
              value={tf.inactiveInDays}
              onChange={(e) => tf.setInactiveInDays(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Reader level</Label>
          <Select
            value={tf.readerLevel || 'all'}
            onValueChange={(value) =>
              tf.setReaderLevel(
                value === 'all' ? '' : (value as NewsletterReaderLevel),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="active">Active readers</SelectItem>
              <SelectItem value="heavy">Heavy readers</SelectItem>
              <SelectItem value="reviewers">Reviewers</SelectItem>
              <SelectItem value="annotators">Annotators</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Recent buyer days</Label>
            <Input
              placeholder="e.g. 90"
              value={tf.recentBuyerDays}
              onChange={(e) => tf.setRecentBuyerDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum spend</Label>
            <Input
              placeholder="e.g. 50000"
              value={tf.minSpending}
              onChange={(e) => tf.setMinSpending(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Book</Label>
          <Select
            value={tf.bookId || 'all'}
            onValueChange={(value) => tf.setBookId(value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All books" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All books</SelectItem>
              {tf.books.map((book) => (
                <SelectItem key={book.id} value={String(book.id)}>
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Book reading status</Label>
          <Select
            value={tf.bookReadingStatus || 'all'}
            onValueChange={(value) =>
              tf.setBookReadingStatus(
                value === 'all' ? '' : (value as NewsletterBookReadingStatus),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="reading">Reading selected book</SelectItem>
              <SelectItem value="purchased-not-reading">
                Bought but not reading
              </SelectItem>
              <SelectItem value="finished">Finished selected book</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {channel === 'email' && (
          <div className="space-y-2">
            <Label>Genres</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {tf.selectedGenres.length > 0
                    ? `${tf.selectedGenres.length} selected`
                    : 'All genres'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="max-h-64 w-72 overflow-y-auto"
                align="start"
              >
                {tf.genreOptions.length > 0 ? (
                  tf.genreOptions.map((genre) => (
                    <DropdownMenuCheckboxItem
                      key={genre}
                      checked={tf.selectedGenres.includes(genre)}
                      onCheckedChange={(checked) =>
                        tf.toggleGenre(genre, checked === true)
                      }
                    >
                      {genre}
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    No genres available
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="space-y-2">
          <Label>Countries</Label>
          <DropdownMenu
            open={tf.isCountryDropdownOpen}
            onOpenChange={(open) => {
              tf.setIsCountryDropdownOpen(open)
              if (!open) tf.setCountrySearch('')
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {tf.selectedCountries.length > 0
                  ? `${tf.selectedCountries.length} selected`
                  : 'All countries'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="max-h-64 w-72 overflow-y-auto"
              align="start"
            >
              <div className="p-2">
                <Input
                  value={tf.countrySearch}
                  onChange={(e) => tf.setCountrySearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Search countries..."
                />
              </div>
              {tf.filteredCountryOptions.length > 0 ? (
                tf.filteredCountryOptions.map((country) => (
                  <DropdownMenuCheckboxItem
                    key={country.id}
                    checked={tf.selectedCountries.includes(country.id)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) =>
                      tf.toggleCountry(country.id, checked === true)
                    }
                  >
                    {country.name} ({country.userCount})
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="text-muted-foreground px-2 py-1.5 text-sm">
                  No countries match your search
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <Label>Email verified</Label>
          <Select
            value={tf.emailVerified}
            onValueChange={(value) =>
              tf.setEmailVerified(value as 'all' | 'true' | 'false')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Verified only</SelectItem>
              <SelectItem value="false">Unverified only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {channel === 'email' && (
          <div className="space-y-2">
            <Label>Promotions preference</Label>
            <Select
              value={tf.promotionOptedIn}
              onValueChange={(value) =>
                tf.setPromotionOptedIn(value as 'all' | 'true' | 'false')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Promotion opted-in</SelectItem>
                <SelectItem value="false">Promotion opted-out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>PHCode status</Label>
          <Select
            value={tf.hasPhcode}
            onValueChange={(value) =>
              tf.setHasPhcode(value as 'all' | 'true' | 'false')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">With PHCode</SelectItem>
              <SelectItem value="false">Without PHCode</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tf.cartAbandonersOnly}
              onCheckedChange={(checked) =>
                tf.setCartAbandonersOnly(checked === true)
              }
            />
            Cart abandoners
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tf.multiBuyersOnly}
              onCheckedChange={(checked) =>
                tf.setMultiBuyersOnly(checked === true)
              }
            />
            Multi-buyers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tf.freeContentOnly}
              onCheckedChange={(checked) =>
                tf.setFreeContentOnly(checked === true)
              }
            />
            Free-only buyers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tf.multiGenreOnly}
              onCheckedChange={(checked) =>
                tf.setMultiGenreOnly(checked === true)
              }
            />
            Multi-genre readers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tf.peerLenderOnly}
              onCheckedChange={(checked) =>
                tf.setPeerLenderOnly(checked === true)
              }
            />
            Peer lenders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={tf.peerBorrowerOnly}
              onCheckedChange={(checked) =>
                tf.setPeerBorrowerOnly(checked === true)
              }
            />
            Peer borrowers
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <Checkbox
              checked={tf.groupBuyerOnly}
              onCheckedChange={(checked) =>
                tf.setGroupBuyerOnly(checked === true)
              }
            />
            Group buyers
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

export default TargetingFiltersPanel
