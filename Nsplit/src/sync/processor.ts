import {
  backoffMs,
  listPendingMutations,
  markMutationConflict,
  markMutationFailed,
  markMutationSynced,
} from './queue';

export type SyncApi = {
  postSync: (body: {
    deviceId?: string;
    mutations: {
      mutationId: string;
      type: string;
      entity: string;
      payload: Record<string, unknown>;
      clientTimestamp?: string;
      baseVersion?: number;
    }[];
  }) => Promise<{
    data?: {
      results: {
        mutationId: string;
        status: string;
        error?: string;
        serverEntityId?: string;
      }[];
    };
    error?: { message: string };
  }>;
};

let syncing = false;

/**
 * Drain local sync queue against Next.js POST /api/sync.
 * Call on network reconnect and app foreground.
 */
export async function processSyncQueue(api: SyncApi, deviceId?: string) {
  if (syncing) return { status: 'busy' as const };
  syncing = true;
  try {
    const pending = await listPendingMutations();
    if (!pending.length) return { status: 'idle' as const, processed: 0 };

    const mutations = pending.map((row) => ({
      mutationId: row.mutation_id,
      type: row.type,
      entity: row.entity,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      clientTimestamp: row.client_timestamp,
      baseVersion: row.base_version ?? undefined,
    }));

    const response = await api.postSync({ deviceId, mutations });
    if (response.error || !response.data?.results) {
      throw new Error(response.error?.message || 'Sync failed');
    }

    for (const result of response.data.results) {
      const local = pending.find((p) => p.mutation_id === result.mutationId);
      if (result.status === 'APPLIED' || result.status === 'DUPLICATE') {
        await markMutationSynced(result.mutationId);
      } else if (result.status === 'CONFLICT') {
        await markMutationConflict(result.mutationId, result.error || 'Conflict');
      } else {
        const retries = (local?.retries ?? 0) + 1;
        const next = new Date(Date.now() + backoffMs(retries)).toISOString();
        await markMutationFailed(
          result.mutationId,
          result.error || 'Rejected',
          retries,
          next
        );
      }
    }

    return { status: 'synced' as const, processed: mutations.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync error';
    const pending = await listPendingMutations(1);
    if (pending[0]) {
      const retries = (pending[0].retries ?? 0) + 1;
      await markMutationFailed(
        pending[0].mutation_id,
        message,
        retries,
        new Date(Date.now() + backoffMs(retries)).toISOString()
      );
    }
    return { status: 'failed' as const, error: message };
  } finally {
    syncing = false;
  }
}
