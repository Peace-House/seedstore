import { createContext } from 'react'
import { CountryCurrency } from '@/services/countryCurrency'

export interface CountryContextType {
  selectedCountry: string
  selectedCurrency: string
  selectedSymbol: string
  countryCurrencies: CountryCurrency[]
  setSelectedCountry: (country: string) => void
  isLoading: boolean
}

export const CountryContext = createContext<CountryContextType | undefined>(
  undefined
)
