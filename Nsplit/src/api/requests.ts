import { apiFetch } from '@/src/api/client';

/** A change suggested from the group's public share link. */
export type ShareRequest = {
  _id: string;
  kind: 'expense' | 'payment';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedByMemberId: string;
  submitterName: string;
  payload: {
    // expense
    title?: string;
    paidByMemberId?: string;
    splitMemberIds?: string[];
    expenseDate?: string;
    // payment
    fromMemberId?: string;
    toMemberId?: string;
    // both
    amountMinor: number;
    note?: string | null;
  };
  rejectReason: string | null;
  createdAt: string;
};

export async function listPendingRequests(groupCode: string) {
  return apiFetch<{ requests: ShareRequest[]; pending: number }>(`/api/groups/${groupCode}/requests`);
}

export async function reviewRequest(
  groupCode: string,
  requestId: string,
  action: 'approve' | 'reject',
  reason?: string | null
) {
  return apiFetch<{ request: ShareRequest }>(`/api/groups/${groupCode}/requests/${requestId}`, {
    method: 'POST',
    timeoutMs: 15000,
    body: JSON.stringify({ action, reason: reason || null }),
  });
}
