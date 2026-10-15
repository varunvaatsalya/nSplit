export const MutationType: Record<string, string>;
export const SyncStatus: Record<string, string>;
export function backoffMs(retryCount: number, opts?: { base?: number; cap?: number }): number;
