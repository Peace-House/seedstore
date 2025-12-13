import axios from 'axios';

// Use our own server as a proxy to avoid CORS issues with legacy API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/legacy-auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GenerateOTPResponse {
  status: boolean;
  message: string;
}

export interface ValidateOTPResponse {
  status: boolean;
  message: string;
  verificationToken?: string;
}

export interface ResetPasswordResponse {
  status: boolean;
  message: string;
}

// Helper to normalize status from string "success" to boolean
const isSuccess = (status: string | boolean): boolean => {
  return status === true || status === 'success';
};

/**
 * Step 1: Generate OTP for password reset
 * Sends an OTP to the user's email
 */
export const generateOTP = async (phcode: string, email: string): Promise<GenerateOTPResponse> => {
  const res = await api.post('/generate-otp', {
    phcode,
    email,
  });
  const data = res.data;
  return {
    status: isSuccess(data.status),
    message: data.message,
  };
};

/**
 * Step 2: Validate the OTP entered by user
 * Returns a verification token if OTP is valid
 */
export const validateOTP = async (phcode: string, otp: string): Promise<ValidateOTPResponse> => {
  const res = await api.post('/validate-otp', {
    phcode,
    otp,
  });
  const data = res.data;
  return {
    status: isSuccess(data.status),
    message: data.message,
    // Token can be in data.verificationToken or data.data.verificationToken
    verificationToken: data.verificationToken || data.data?.verificationToken,
  };
};

/**
 * Step 3: Reset password using verification token
 */
export const resetPasswordLegacy = async (
  phcode: string,
  password: string,
  verificationToken: string
): Promise<ResetPasswordResponse> => {
  const res = await api.post('/reset-password', {
    phcode,
    password,
    verificationToken,
  });
  const data = res.data;
  return {
    status: isSuccess(data.status),
    message: data.message,
  };
};

/**
 * Step 4: Sync password to local database after legacy reset
 * This keeps the local database in sync with the legacy system
 */
export const syncPasswordToLocal = async (
  phcode: string,
  newPassword: string
): Promise<{ message: string; synced: boolean }> => {
  const res = await axios.post<{ message: string; synced: boolean }>(
    `${API_URL}/users/sync-password`,
    { phcode, newPassword }
  );
  return res.data;
};
