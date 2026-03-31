import { useContext } from 'react'
import {
  CountryContext,
  CountryContextType,
} from '@/contexts/CountryContextDef'

export const useCountry = (): CountryContextType => {
  const context = useContext(CountryContext)
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider')
  }
  return context
}
