import { apiFetch } from '@/src/api/client';
import type { Expense, Transfer } from '@/src/api/types';

/** A group added by link (view only), or its "link expired" placeholder. */
export type SavedShare = {
  token: string;
  status: 'active' | 'expired';
  name: string | null;
  icon: string | null;
  memberCount: number | null;
  join: 'none' | 'pending' | 'rejected';
};

export type SharedMember = {
  _id: string;
  displayName: string;
  avatar: { url: null; letters: string | null; bg: string | null };
  /** Someone already joined as this name. */
  claimed: boolean;
};

export type SharedLedger = {
  group: { name: string; icon: string | null; currency: string; members: SharedMember[] };
  expenses: Expense[];
  transfers: Transfer[];
};

export type JoinStatus =
  | { status: 'signed-out' | 'none' }
  | { status: 'member'; groupCode: string }
  | { status: 'pending' | 'rejected'; request: { submitterName: string; rejectReason: string | null } };

/** Token from a pasted share link ("https://…/s/<token>") or a bare token. */
export function tokenFromLink(input: string) {
  const text = input.trim();
  const match = text.match(/\/s\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  const token = match ? match[1] : text;
  return /^[A-Za-z0-9_-]{20,64}$/.test(token) ? token : null;
}

export const listSavedShares = () => apiFetch<{ shares: SavedShare[] }>('/api/shares');

export const addSavedShare = (link: string) =>
  apiFetch<{ member: boolean; groupCode?: string; token?: string }>('/api/shares', {
    method: 'POST',
    body: JSON.stringify({ link }),
  });

export const removeSavedShare = (token: string) => apiFetch(`/api/shares/${token}`, { method: 'DELETE' });

export const getSharedLedger = (token: string) => apiFetch<SharedLedger>(`/api/share/${token}`);

export const getJoinStatus = (token: string) => apiFetch<JoinStatus>(`/api/share/${token}/join`);

export const sendJoinRequest = (token: string, memberId: string) =>
  apiFetch<JoinStatus>(`/api/share/${token}/join`, { method: 'POST', body: JSON.stringify({ memberId }) });

/** A member's suggestion; an admin approves it before it reaches the ledger. */
export const sendMemberRequest = (
  groupCode: string,
  body: { kind: 'expense'; expense: Record<string, unknown> } | { kind: 'payment'; payment: Record<string, unknown> }
) =>
  apiFetch(`/api/groups/${groupCode}/requests`, { method: 'POST', timeoutMs: 15000, body: JSON.stringify(body) });
