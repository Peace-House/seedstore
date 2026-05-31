import api from './apiService';

/**
 * Service wrapper for the admin Free Copies endpoints. Mirrors
 * the same axios singleton used elsewhere so auth headers are
 * applied automatically.
 */

export interface FreeCopyBookRow {
  id: number;
  title: string;
  author: string;
  coverImage?: string | null;
  authorPhcodes: string[];
  freeCopiesTotal: number;
  freeCopiesUsed: number;
  remaining: number;
}

export interface ListFreeCopiesResponse {
  books: FreeCopyBookRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listBooksFreeCopies(params: {
  page?: number;
  pageSize?: number;
  q?: string;
} = {}): Promise<ListFreeCopiesResponse> {
  const res = await api.get('/admin/free-copies', { params });
  return res.data;
}

export interface RequestOtpResponse {
  requestId: string;
  expiresAt: number; // epoch millis
}

export async function requestFreeCopiesOtp(
  bookId: number,
  newTotal: number,
): Promise<RequestOtpResponse> {
  const res = await api.post(`/admin/free-copies/${bookId}/otp`, {
    newTotal,
  });
  return res.data;
}

export interface ConfirmUpdateResponse {
  ok: boolean;
  book: {
    id: number;
    title: string;
    freeCopiesTotal: number;
    freeCopiesUsed: number;
    remaining: number;
  };
}

export async function confirmFreeCopiesUpdate(
  bookId: number,
  args: { requestId: string; code: string },
): Promise<ConfirmUpdateResponse> {
  const res = await api.post(
    `/admin/free-copies/${bookId}/confirm`,
    args,
  );
  return res.data;
}

export interface AssignSummaryRow {
  bookId: number;
  bookTitle: string;
  granted: string[];
  alreadyGranted: string[];
  skippedDueToCapacity: string[];
  grantedUserIds: number[];
}

export interface AssignResponse {
  ok: boolean;
  summary: AssignSummaryRow[];
  invalidPhcodes: string[];
  grantedTotal: number;
}

export async function assignFreeCopies(args: {
  bookIds: number[];
  phcodes: string[];
}): Promise<AssignResponse> {
  const res = await api.post('/admin/free-copies/assign', args);
  return res.data;
}
