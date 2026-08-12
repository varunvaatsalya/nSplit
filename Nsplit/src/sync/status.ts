import type { SyncStatus } from './types';

export type { SyncStatus } from './types';

let current: SyncStatus = 'online';
const listeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return current;
}

export function setSyncStatus(status: SyncStatus) {
  current = status;
  listeners.forEach((l) => l(status));
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
