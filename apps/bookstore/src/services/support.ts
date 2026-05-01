import api from './apiService'

export interface SupportMessagePayload {
  name: string
  email: string
  subject: string
  message: string
}

export const sendSupportMessage = async (
  payload: SupportMessagePayload,
): Promise<{ message: string }> => {
  const res = await api.post('/support', payload)
  return res.data
}
