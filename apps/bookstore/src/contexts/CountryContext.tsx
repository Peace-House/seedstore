import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCountryCurrencies } from '@/services/countryCurrency'
import api from '@/services/apiService'
import { CountryContext } from './CountryContextDef'

const STORAGE_KEY = 'selected_country'
const DEFAULT_COUNTRY = 'Nigeria'

function getToken() {
  return localStorage.getItem('auth_token')
}

async function fetchPreferredCountry(): Promise<string | null> {
  try {
    const res = await api.get<{ user: { preferredDisplayCountry?: string | null } }>('/users/me')
    return res.data.user?.preferredDisplayCountry ?? null
  } catch {
    return null
  }
}

async function savePreferredCountry(country: string): Promise<void> {
  await api.patch('/users/me/preferences', { preferredDisplayCountry: country })
}

export const CountryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient()
  const [selectedCountry, setSelectedCountryState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_COUNTRY
  })

  const lastSyncedFromServer = useRef<string | null>(null)
  const isSaving = useRef(false)

  // On mount + when tab regains focus: pull the latest preference from the server
  const syncFromServer = useCallback(async () => {
    if (!getToken() || isSaving.current) return
    const serverCountry = await fetchPreferredCountry()
    if (serverCountry && serverCountry !== lastSyncedFromServer.current) {
      lastSyncedFromServer.current = serverCountry
      setSelectedCountryState(serverCountry)
      localStorage.setItem(STORAGE_KEY, serverCountry)
    }
  }, [])

  useEffect(() => {
    syncFromServer()
  }, [syncFromServer])

  useEffect(() => {
    const onFocus = () => syncFromServer()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [syncFromServer])

  const { data: countryCurrencies = [], isLoading } = useQuery({
    queryKey: ['countryCurrencies'],
    queryFn: getCountryCurrencies,
    staleTime: 1000 * 60 * 60,
  })

  const setSelectedCountry = useCallback(async (country: string) => {
    setSelectedCountryState(country)
    localStorage.setItem(STORAGE_KEY, country)
    lastSyncedFromServer.current = country

    if (getToken()) {
      try {
        isSaving.current = true
        await savePreferredCountry(country)
      } catch (err) {
        console.error('Failed to save currency preference:', err)
      } finally {
        isSaving.current = false
      }
    }
  }, [])

  const selectedCurrencyData = countryCurrencies.find(
    (c) => c.country.toLowerCase() === selectedCountry.toLowerCase()
  )
  const selectedCurrency = selectedCurrencyData?.currency || 'NGN'
  const selectedSymbol = selectedCurrencyData?.symbol || '₦'

  return (
    <CountryContext.Provider
      value={{
        selectedCountry,
        selectedCurrency,
        selectedSymbol,
        countryCurrencies,
        setSelectedCountry,
        isLoading,
      }}
    >
      {children}
    </CountryContext.Provider>
  )
}
