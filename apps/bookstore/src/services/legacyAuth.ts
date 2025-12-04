import axios from 'axios';

// Legacy API base URL for authentication
const LEGACY_API_URL = import.meta.env.VITE_LEGACY_API_URL || 'https://phlib.peacehousefellowship.com';

const legacyApi = axios.create({
  baseURL: LEGACY_API_URL,
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

/**
 * Step 1: Generate OTP for password reset
 * Sends an OTP to the user's email
 */
export const generateOTP = async (phcode: string, email: string): Promise<GenerateOTPResponse> => {
  const res = await legacyApi.post<GenerateOTPResponse>('/auth/generateOTP.php', {
    phcode,
    contact: email,
    contactType: 'email',
  });
  return res.data;
};

/**
 * Step 2: Validate the OTP entered by user
 * Returns a verification token if OTP is valid
 */
export const validateOTP = async (phcode: string, otp: string): Promise<ValidateOTPResponse> => {
  const res = await legacyApi.post<ValidateOTPResponse>('/auth/validateOTP.php', {
    phcode,
    otp,
  });
  return res.data;
};

/**
 * Step 3: Reset password using verification token
 */
export const resetPasswordLegacy = async (
  phcode: string,
  password: string,
  verificationToken: string
): Promise<ResetPasswordResponse> => {
  const res = await legacyApi.post<ResetPasswordResponse>('/auth/resetPassword.php', {
    phcode,
    password,
    verificationToken,
  });
  return res.data;
};

/**
 * Step 4: Sync password to local database after legacy reset
 * This keeps the local database in sync with the legacy system
 */
export const syncPasswordToLocal = async (
  phcode: string,
  newPassword: string
): Promise<{ message: string; synced: boolean }> => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const res = await axios.post<{ message: string; synced: boolean }>(
    `${API_URL}/users/sync-password`,
    { phcode, newPassword }
  );
  return res.data;
};
