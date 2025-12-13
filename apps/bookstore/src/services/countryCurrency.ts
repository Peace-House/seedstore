import api from './apiService';

export interface CountryCurrency {
  id: number;
  country: string;
  currency: string;
  code?: string;
  symbol?: string;
}

// GET /api/country-currency - Get all country/currency mappings
export const getCountryCurrencies = async (): Promise<CountryCurrency[]> => {
  const res = await api.get('/country-currency');
  return res.data;
};
