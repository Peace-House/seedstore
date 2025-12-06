import api from './apiService';

export const getCountries = async () => {
  const res = await api.get('/location/countries');
  return res.data;
};

export const getStates = async () => {
  const res = await api.get('/location/states');
  return res.data;
};
