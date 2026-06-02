import api from './apiService';

/** Pull a human message out of an axios-ish error without `any`. */
export function freeCopyErr(e: unknown, fallback = 'Unknown error'): string {
  const err = e as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return err?.response?.data?.error ?? err?.message ?? fallback;
}

/**
 * Admin Free Copies service (per-author quotas + outreach allocations).
 * Authors tab reads books + their per-author allocations; the Users tab
 * manages outreach allocations and their giving history.
 */

// ── Authors tab ───────────────────────────────────────────────
export interface AuthorAllocation {
  allocationId: string;
  holderPhcode: string;
  holderName: string | null;
  total: number;
  used: number;
  remaining: number;
}

export interface AuthorBookRow {
  id: number;
  title: string;
  author: string;
  authorPhcode: string | null;
  coAuthor: string | null;
  coAuthorPhcode: string | null;
  coverImage?: string | null;
  authorAllocations: AuthorAllocation[];
}

export interface ListAuthorsResponse {
  books: AuthorBookRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listAuthorsFreeCopies(
  params: { page?: number; pageSize?: number; q?: string } = {},
): Promise<ListAuthorsResponse> {
  const res = await api.get('/admin/free-copies', { params });
  return res.data;
}

// ── Users (outreach) tab ──────────────────────────────────────
export interface UserBookAgg {
  bookId: number;
  title: string;
  author: string;
  coverImage?: string | null;
  totalGiven: number;
  used: number;
  remaining: number;
  userCount: number;
}

export interface ListUsersResponse {
  books: UserBookAgg[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listUsersFreeCopies(
  params: { page?: number; pageSize?: number; q?: string } = {},
): Promise<ListUsersResponse> {
  const res = await api.get('/admin/free-copies/users', { params });
  return res.data;
}

export interface UserAllocationRow {
  allocationId: string;
  holderPhcode: string;
  holderName: string | null;
  total: number;
  givenOut: number;
  remaining: number;
  createdAt: string;
}

export async function listBookUserAllocations(
  bookId: number,
): Promise<{ allocations: UserAllocationRow[] }> {
  const res = await api.get(`/admin/free-copies/${bookId}/users`);
  return res.data;
}

export interface RecipientRow {
  phcode: string;
  name: string | null;
  grantedAt: string;
  notified?: boolean;
}

export async function listAllocationRecipients(
  allocationId: string,
): Promise<{ recipients: RecipientRow[] }> {
  const res = await api.get(
    `/admin/free-copies/allocations/${allocationId}/recipients`,
  );
  return res.data;
}

export async function createUserAllocation(args: {
  bookId: number;
  phcode: string;
  total: number;
}): Promise<{
  ok: boolean;
  allocation: { id: string; total: number; used: number; remaining: number };
}> {
  const res = await api.post('/admin/free-copies/users', args);
  return res.data;
}

// ── OTP-gated allocation increase ─────────────────────────────
export interface RequestOtpResponse {
  requestId: string;
  expiresAt: number; // epoch millis
}

export async function requestFreeCopiesOtp(
  allocationId: string,
  newTotal: number,
): Promise<RequestOtpResponse> {
  const res = await api.post(
    `/admin/free-copies/allocations/${allocationId}/otp`,
    { newTotal },
  );
  return res.data;
}

export interface ConfirmUpdateResponse {
  ok: boolean;
  allocation: { id: string; total: number; used: number; remaining: number };
}

export async function confirmFreeCopiesUpdate(
  allocationId: string,
  args: { requestId: string; code: string },
): Promise<ConfirmUpdateResponse> {
  const res = await api.post(
    `/admin/free-copies/allocations/${allocationId}/confirm`,
    args,
  );
  return res.data;
}
