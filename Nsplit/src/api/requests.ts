import { apiFetch } from '@/src/api/client';

type MemberAmount = { memberId: string; amountMinor: number };

/**
 * Something a group admin approves: a signed-in person asking to join as one of
 * the members, or an expense / payment a member sent for approval.
 */
export type ShareRequest = {
  _id: string;
  kind: 'expense' | 'payment' | 'join';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedByMemberId: string;
  /** join: the member name being claimed. Otherwise: the member who sent it. */
  submitterName: string;
  requesterName: string | null;
  requesterEmail: string | null;
  payload: {
    title?: string | null;
    description?: string | null;
    icon?: string | null;
    categoryKey?: string | null;
    splitMethod?: string;
    expenseDate?: string;
    payers?: MemberAmount[];
    participants?: { memberId: string; included?: boolean }[];
    fromMemberId?: string;
    toMemberId?: string;
    amountMinor?: number;
    note?: string | null;
  };
  rejectReason: string | null;
  createdAt: string;
};

/** Reviewers: the inbox (and reviewed history). Members: their own requests. */
export async function listRequests(groupCode: string, includeReviewed = false) {
  return apiFetch<{ requests: ShareRequest[]; pending: number; canReview: boolean }>(
    `/api/groups/${groupCode}/requests${includeReviewed ? '?status=all' : ''}`
  );
}

/** @deprecated use listRequests */
export const listPendingRequests = (groupCode: string) => listRequests(groupCode);

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
