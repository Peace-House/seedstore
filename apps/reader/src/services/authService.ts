import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export interface LoginCredentials {
  /** The user's unique PH-Code. Mirrors the mobile + bookstore flow,
   *  which both authenticate by phcode rather than email. The auth
   *  service uppercases and trims it before sending. */
  phcode: string
  password: string
  platform?: string
  deviceId?: string
  deviceName?: string
  location?: string
}

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phcode?: string
}

export interface LoginResponse {
  token: string
  user: User
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}

/**
 * Get auth token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

/**
 * Generate a unique device ID
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = `reader_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

/**
 * Get device name based on user agent
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device'
  
  const ua = navigator.userAgent
  
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android Device'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Linux/.test(ua)) return 'Linux PC'
  
  return 'Web Browser'
}

/**
 * Detect platform
 */
export function detectPlatform(): string {
  if (typeof window === 'undefined') return 'web'
  
  const ua = navigator.userAgent
  
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  
  return 'web'
}

/**
 * Login user via PH-Code + password.
 *
 * POST /users/login
 * Body: { phcode, password, platform, deviceId, deviceName, location }
 *
 * Aligned with the mobile app and the bookstore which both authenticate
 * by phcode. The reader used to accept either email or phcode; that
 * dual-mode was retired so all three clients hit the same endpoint with
 * the same field shape.
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { phcode, password, platform, deviceId, deviceName, location } = credentials

  const body = {
    // PH-Codes are conventionally upper-case; normalise so trailing
    // whitespace or shift-key slips don't bounce the user back to the
    // login form.
    phcode: phcode.trim().toUpperCase(),
    password,
    platform: platform || detectPlatform(),
    deviceId: deviceId || getDeviceId(),
    deviceName: deviceName || getDeviceName(),
    location: location || 'Reader App',
  }

  const response = await api.post<LoginResponse>('/users/login', body)

  // Store token
  if (response.data.token) {
    localStorage.setItem('auth_token', response.data.token)
  }

  return response.data
}

/**
 * Logout user
 */
export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
}

/**
 * Validate current token
 */
export async function validateToken(): Promise<boolean> {
  const token = getAuthToken()
  if (!token) return false
  
  try {
    await api.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return true
  } catch {
    return false
  }
}
