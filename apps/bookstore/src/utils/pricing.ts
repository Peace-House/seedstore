import { CountryCurrency } from '@/services/countryCurrency'

// Helper function to get book price for selected country
export const getBookPriceForCountry = (
  prices: { country?: string | null; currency: string; soft_copy_price: number; hard_copy_price: number }[] | undefined,
  selectedCountry: string,
  priceType: 'soft_copy' | 'hard_copy' = 'soft_copy',
  countryCurrencies?: CountryCurrency[]
): { price: number; currency: string; symbol: string } => {
  // Default fallback
  const defaultResult = { price: 0, currency: 'NGN', symbol: '₦' }

  if (!prices || prices.length === 0) return defaultResult

  // Helper to get symbol from countryCurrencies or fallback
  const getSymbol = (currency: string, country?: string | null): string => {
    if (countryCurrencies && countryCurrencies.length > 0) {
      // Try to find by country first
      if (country) {
        const match = countryCurrencies.find(
          (c) => c.country.toLowerCase() === country.toLowerCase()
        )
        if (match?.symbol) return match.symbol
      }
      // Try to find by currency
      const currencyMatch = countryCurrencies.find(
        (c) => c.currency === currency
      )
      if (currencyMatch?.symbol) return currencyMatch.symbol
    }
    // Fallback to basic symbols
    return getFallbackSymbol(currency)
  }

  // Find price for selected country
  const countryPrice = prices.find(
    (p) => p.country?.toLowerCase() === selectedCountry.toLowerCase()
  )

  if (countryPrice) {
    const price = priceType === 'soft_copy' ? countryPrice.soft_copy_price : countryPrice.hard_copy_price
    return {
      price,
      currency: countryPrice.currency,
      symbol: getSymbol(countryPrice.currency, countryPrice.country),
    }
  }

  // Fallback to Nigeria price if available
  const nigeriaPrice = prices.find(
    (p) => p.country?.toLowerCase() === 'nigeria'
  )
  if (nigeriaPrice) {
    const price = priceType === 'soft_copy' ? nigeriaPrice.soft_copy_price : nigeriaPrice.hard_copy_price
    return {
      price,
      currency: nigeriaPrice.currency,
      symbol: getSymbol(nigeriaPrice.currency, 'nigeria'),
    }
  }

  // Fallback to first available price
  const firstPrice = prices[0]
  const price = priceType === 'soft_copy' ? firstPrice.soft_copy_price : firstPrice.hard_copy_price
  return {
    price,
    currency: firstPrice.currency,
    symbol: getSymbol(firstPrice.currency, firstPrice.country),
  }
}

// Fallback symbol mapping for when countryCurrencies is not available
const getFallbackSymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
  }
  return symbols[currency] || currency
}
