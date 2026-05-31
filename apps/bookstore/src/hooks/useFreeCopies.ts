import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  AssignResponse,
  ConfirmUpdateResponse,
  ListFreeCopiesResponse,
  RequestOtpResponse,
  assignFreeCopies,
  confirmFreeCopiesUpdate,
  listBooksFreeCopies,
  requestFreeCopiesOtp,
} from '@/services/adminFreeCopies';

/**
 * Read hook for the Book Author Access table. Default page size
 * matches the audit's existing admin pages.
 */
export function useFreeCopiesList(params: {
  page?: number;
  pageSize?: number;
  q?: string;
} = {}) {
  return useQuery<ListFreeCopiesResponse>({
    queryKey: ['admin-free-copies', params],
    queryFn: () => listBooksFreeCopies(params),
    placeholderData: (prev) => prev,
  });
}

export function useRequestFreeCopiesOtp() {
  return useMutation<RequestOtpResponse, Error, { bookId: number; newTotal: number }>({
    mutationFn: ({ bookId, newTotal }) =>
      requestFreeCopiesOtp(bookId, newTotal),
  });
}

export function useConfirmFreeCopiesUpdate() {
  const qc = useQueryClient();
  return useMutation<
    ConfirmUpdateResponse,
    Error,
    { bookId: number; requestId: string; code: string }
  >({
    mutationFn: ({ bookId, requestId, code }) =>
      confirmFreeCopiesUpdate(bookId, { requestId, code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-free-copies'] });
      qc.invalidateQueries({ queryKey: ['all-books'] });
    },
  });
}

export function useAssignFreeCopies() {
  const qc = useQueryClient();
  return useMutation<
    AssignResponse,
    Error,
    { bookIds: number[]; phcodes: string[] }
  >({
    mutationFn: (args) => assignFreeCopies(args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-free-copies'] });
    },
  });
}
