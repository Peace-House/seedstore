import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  ConfirmUpdateResponse,
  ListAuthorsResponse,
  ListUsersResponse,
  RequestOtpResponse,
  UserAllocationRow,
  RecipientRow,
  confirmFreeCopiesUpdate,
  createUserAllocation,
  listAllocationRecipients,
  listAuthorsFreeCopies,
  listBookUserAllocations,
  listUsersFreeCopies,
  requestFreeCopiesOtp,
} from '@/services/adminFreeCopies';

type ListParams = { page?: number; pageSize?: number; q?: string };

export function useAuthorsFreeCopies(params: ListParams = {}) {
  return useQuery<ListAuthorsResponse>({
    queryKey: ['admin-free-copies', 'authors', params],
    queryFn: () => listAuthorsFreeCopies(params),
    placeholderData: (prev) => prev,
  });
}

export function useUsersFreeCopies(params: ListParams = {}) {
  return useQuery<ListUsersResponse>({
    queryKey: ['admin-free-copies', 'users', params],
    queryFn: () => listUsersFreeCopies(params),
    placeholderData: (prev) => prev,
  });
}

export function useBookUserAllocations(bookId: number | null) {
  return useQuery<{ allocations: UserAllocationRow[] }>({
    queryKey: ['admin-free-copies', 'book-users', bookId],
    queryFn: () => listBookUserAllocations(bookId as number),
    enabled: !!bookId,
  });
}

export function useAllocationRecipients(allocationId: string | null) {
  return useQuery<{ recipients: RecipientRow[] }>({
    queryKey: ['admin-free-copies', 'recipients', allocationId],
    queryFn: () => listAllocationRecipients(allocationId as string),
    enabled: !!allocationId,
  });
}

export function useCreateUserAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUserAllocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-free-copies'] });
    },
  });
}

export function useRequestFreeCopiesOtp() {
  return useMutation<
    RequestOtpResponse,
    Error,
    { allocationId: string; newTotal: number }
  >({
    mutationFn: ({ allocationId, newTotal }) =>
      requestFreeCopiesOtp(allocationId, newTotal),
  });
}

export function useConfirmFreeCopiesUpdate() {
  const qc = useQueryClient();
  return useMutation<
    ConfirmUpdateResponse,
    Error,
    { allocationId: string; requestId: string; code: string }
  >({
    mutationFn: ({ allocationId, requestId, code }) =>
      confirmFreeCopiesUpdate(allocationId, { requestId, code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-free-copies'] });
      qc.invalidateQueries({ queryKey: ['all-books'] });
    },
  });
}
