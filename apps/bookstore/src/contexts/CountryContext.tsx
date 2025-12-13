import { useState, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCountryCurrencies } from '@/services/countryCurrency'
import { CountryContext } from './CountryContextDef'

const STORAGE_KEY = 'selected_country'
const DEFAULT_COUNTRY = 'Nigeria'

export const CountryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedCountry, setSelectedCountryState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_COUNTRY
  })

  const { data: countryCurrencies = [], isLoading } = useQuery({
    queryKey: ['countryCurrencies'],
    queryFn: getCountryCurrencies,
    staleTime: 1000 * 60 * 60, // 1 hour cache
  })

  const setSelectedCountry = (country: string) => {
    setSelectedCountryState(country)
    localStorage.setItem(STORAGE_KEY, country)
  }

  // Get the currency and symbol for the selected country
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
