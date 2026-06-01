import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getNewsletterBooks,
  getNewsletterCountries,
  getUsers,
  type NewsletterBookReadingStatus,
  type NewsletterCountryOption,
  type NewsletterPreviewFilters,
  type NewsletterReaderLevel,
  type NewsletterTargetMode,
} from '@/services/user'

/**
 * Shared audience-targeting state for the Communications page.
 *
 * This is the single source of truth for "who do we message" — used by BOTH
 * the email-newsletter composer and the push-notification composer. The push
 * composer hands the resulting filter object to the server, which resolves it
 * to userIds → device tokens (see adminPush.controller.ts), so a push can
 * target the exact same audience a newsletter would.
 *
 * Lifted verbatim from the original NewsletterManagement component so the
 * newsletter behaviour is unchanged.
 */
export function useTargetingFilters() {
  const [targetMode, setTargetMode] = useState<NewsletterTargetMode>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeInDays, setActiveInDays] = useState('')
  const [inactiveInDays, setInactiveInDays] = useState('')
  const [readerLevel, setReaderLevel] = useState<NewsletterReaderLevel | ''>('')
  const [recentBuyerDays, setRecentBuyerDays] = useState('')
  const [minSpending, setMinSpending] = useState('')
  const [cartAbandonersOnly, setCartAbandonersOnly] = useState(false)
  const [multiBuyersOnly, setMultiBuyersOnly] = useState(false)
  const [freeContentOnly, setFreeContentOnly] = useState(false)
  const [bookId, setBookId] = useState('')
  const [bookReadingStatus, setBookReadingStatus] = useState<
    NewsletterBookReadingStatus | ''
  >('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [multiGenreOnly, setMultiGenreOnly] = useState(false)
  const [peerLenderOnly, setPeerLenderOnly] = useState(false)
  const [peerBorrowerOnly, setPeerBorrowerOnly] = useState(false)
  const [groupBuyerOnly, setGroupBuyerOnly] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [emailVerified, setEmailVerified] = useState<'all' | 'true' | 'false'>(
    'all',
  )
  const [promotionOptedIn, setPromotionOptedIn] = useState<
    'all' | 'true' | 'false'
  >('all')
  const [hasPhcode, setHasPhcode] = useState<'all' | 'true' | 'false'>('all')
  const [pastedEmailsInput, setPastedEmailsInput] = useState('')
  const [manualSearch, setManualSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [excludedRecipientEmails, setExcludedRecipientEmails] = useState<
    string[]
  >([])

  const { data: books = [] } = useQuery({
    queryKey: ['newsletter-books'],
    queryFn: getNewsletterBooks,
  })

  const { data: countriesWithUsers = [] } = useQuery({
    queryKey: ['newsletter-countries-with-users'],
    queryFn: getNewsletterCountries,
  })

  const { data: usersPage } = useQuery({
    queryKey: ['newsletter-users'],
    queryFn: async () => getUsers(1, 250),
    enabled: targetMode === 'manual',
  })

  const users = useMemo(() => usersPage?.users || [], [usersPage?.users])

  const genreOptions = useMemo(() => {
    return Array.from(
      new Set(
        books
          .map((book) => book.genre?.trim())
          .filter((genre): genre is string => Boolean(genre)),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [books])

  const countryOptions = useMemo(() => {
    return countriesWithUsers
      .map((country: NewsletterCountryOption) => ({
        id: country.id,
        name: country.name,
        userCount: country.userCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [countriesWithUsers])

  const filteredCountryOptions = useMemo(() => {
    const search = countrySearch.trim().toLowerCase()
    if (!search) return countryOptions
    return countryOptions.filter((country) => {
      return (
        country.name.toLowerCase().includes(search) ||
        country.id.toLowerCase().includes(search)
      )
    })
  }, [countryOptions, countrySearch])

  const filteredUsers = useMemo(() => {
    const search = manualSearch.trim().toLowerCase()
    if (!search) return users
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
      return (
        user.email.toLowerCase().includes(search) ||
        fullName.includes(search) ||
        String(user.id).includes(search)
      )
    })
  }, [users, manualSearch])

  const pastedEmails = useMemo(
    () =>
      pastedEmailsInput
        .split(/[\n,;\s]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    [pastedEmailsInput],
  )

  const buildFilters = (
    extra?: Partial<NewsletterPreviewFilters>,
  ): NewsletterPreviewFilters => {
    return {
      targetMode,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      activeInDays: activeInDays ? Number(activeInDays) : undefined,
      inactiveInDays: inactiveInDays ? Number(inactiveInDays) : undefined,
      readerLevel: readerLevel || undefined,
      recentBuyerDays: recentBuyerDays ? Number(recentBuyerDays) : undefined,
      minSpending: minSpending ? Number(minSpending) : undefined,
      cartAbandonersOnly,
      multiBuyersOnly,
      freeContentOnly,
      bookId: bookId ? Number(bookId) : undefined,
      bookReadingStatus: bookReadingStatus || undefined,
      genres: selectedGenres,
      multiGenreOnly,
      peerLenderOnly,
      peerBorrowerOnly,
      groupBuyerOnly,
      countries: selectedCountries,
      emailVerified:
        emailVerified === 'all' ? undefined : emailVerified === 'true',
      promotionOptedIn:
        promotionOptedIn === 'all' ? undefined : promotionOptedIn === 'true',
      hasPhcode: hasPhcode === 'all' ? undefined : hasPhcode === 'true',
      userIds: targetMode === 'manual' ? selectedUserIds : undefined,
      pastedEmails: targetMode === 'pasted-emails' ? pastedEmails : undefined,
      excludeEmails: excludedRecipientEmails,
      ...extra,
    }
  }

  const applyFilters = (filters: NewsletterPreviewFilters) => {
    setTargetMode(filters.targetMode ?? 'all')
    setDateFrom(filters.dateFrom || '')
    setDateTo(filters.dateTo || '')
    setActiveInDays(
      filters.activeInDays !== undefined ? String(filters.activeInDays) : '',
    )
    setInactiveInDays(
      filters.inactiveInDays !== undefined
        ? String(filters.inactiveInDays)
        : '',
    )
    setReaderLevel(filters.readerLevel || '')
    setRecentBuyerDays(
      filters.recentBuyerDays !== undefined
        ? String(filters.recentBuyerDays)
        : '',
    )
    setMinSpending(
      filters.minSpending !== undefined ? String(filters.minSpending) : '',
    )
    setCartAbandonersOnly(filters.cartAbandonersOnly === true)
    setMultiBuyersOnly(filters.multiBuyersOnly === true)
    setFreeContentOnly(filters.freeContentOnly === true)
    setBookId(filters.bookId !== undefined ? String(filters.bookId) : '')
    setBookReadingStatus(filters.bookReadingStatus || '')
    setSelectedGenres(filters.genres || [])
    setMultiGenreOnly(filters.multiGenreOnly === true)
    setPeerLenderOnly(filters.peerLenderOnly === true)
    setPeerBorrowerOnly(filters.peerBorrowerOnly === true)
    setGroupBuyerOnly(filters.groupBuyerOnly === true)
    setSelectedCountries(filters.countries || [])
    setEmailVerified(
      filters.emailVerified === undefined
        ? 'all'
        : filters.emailVerified
        ? 'true'
        : 'false',
    )
    setPromotionOptedIn(
      filters.promotionOptedIn === undefined
        ? 'all'
        : filters.promotionOptedIn
        ? 'true'
        : 'false',
    )
    setHasPhcode(
      filters.hasPhcode === undefined
        ? 'all'
        : filters.hasPhcode
        ? 'true'
        : 'false',
    )
    setSelectedUserIds(filters.userIds || [])
    setPastedEmailsInput((filters.pastedEmails || []).join('\n'))
    setExcludedRecipientEmails(filters.excludeEmails || [])
    setManualSearch('')
  }

  const resetFilters = () => {
    setTargetMode('all')
    setDateFrom('')
    setDateTo('')
    setActiveInDays('')
    setInactiveInDays('')
    setReaderLevel('')
    setRecentBuyerDays('')
    setMinSpending('')
    setCartAbandonersOnly(false)
    setMultiBuyersOnly(false)
    setFreeContentOnly(false)
    setBookId('')
    setBookReadingStatus('')
    setSelectedGenres([])
    setMultiGenreOnly(false)
    setPeerLenderOnly(false)
    setPeerBorrowerOnly(false)
    setGroupBuyerOnly(false)
    setSelectedCountries([])
    setCountrySearch('')
    setIsCountryDropdownOpen(false)
    setEmailVerified('all')
    setPromotionOptedIn('all')
    setHasPhcode('all')
    setPastedEmailsInput('')
    setManualSearch('')
    setSelectedUserIds([])
    setExcludedRecipientEmails([])
  }

  const toggleGenre = (genre: string, checked: boolean) => {
    setSelectedGenres((prev) =>
      checked
        ? Array.from(new Set([...prev, genre]))
        : prev.filter((value) => value !== genre),
    )
  }

  const toggleCountry = (country: string, checked: boolean) => {
    setSelectedCountries((prev) =>
      checked
        ? Array.from(new Set([...prev, country]))
        : prev.filter((value) => value !== country),
    )
  }

  const handleToggleUser = (userId: number, checked: boolean) => {
    setSelectedUserIds((prev) =>
      checked
        ? Array.from(new Set([...prev, userId]))
        : prev.filter((id) => id !== userId),
    )
  }

  const excludeRecipientEmail = (email: string) => {
    const normalized = email.trim().toLowerCase()
    if (!normalized) return
    setExcludedRecipientEmails((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized],
    )
  }

  return {
    // raw state
    targetMode, setTargetMode,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    activeInDays, setActiveInDays,
    inactiveInDays, setInactiveInDays,
    readerLevel, setReaderLevel,
    recentBuyerDays, setRecentBuyerDays,
    minSpending, setMinSpending,
    cartAbandonersOnly, setCartAbandonersOnly,
    multiBuyersOnly, setMultiBuyersOnly,
    freeContentOnly, setFreeContentOnly,
    bookId, setBookId,
    bookReadingStatus, setBookReadingStatus,
    selectedGenres, setSelectedGenres,
    multiGenreOnly, setMultiGenreOnly,
    peerLenderOnly, setPeerLenderOnly,
    peerBorrowerOnly, setPeerBorrowerOnly,
    groupBuyerOnly, setGroupBuyerOnly,
    selectedCountries, setSelectedCountries,
    countrySearch, setCountrySearch,
    isCountryDropdownOpen, setIsCountryDropdownOpen,
    emailVerified, setEmailVerified,
    promotionOptedIn, setPromotionOptedIn,
    hasPhcode, setHasPhcode,
    pastedEmailsInput, setPastedEmailsInput,
    manualSearch, setManualSearch,
    selectedUserIds, setSelectedUserIds,
    excludedRecipientEmails, setExcludedRecipientEmails,
    // data + derived
    books,
    genreOptions,
    countryOptions,
    filteredCountryOptions,
    filteredUsers,
    pastedEmails,
    // helpers
    buildFilters,
    applyFilters,
    resetFilters,
    toggleGenre,
    toggleCountry,
    handleToggleUser,
    excludeRecipientEmail,
  }
}

export type TargetingFilters = ReturnType<typeof useTargetingFilters>
