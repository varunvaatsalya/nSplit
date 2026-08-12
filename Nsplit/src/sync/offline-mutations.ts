/**
 * Offline mutation helpers for creating expenses locally then syncing.
 */
import { enqueueMutation } from './queue';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createExpenseOffline(payload: Record<string, unknown>) {
  const mutationId = uuid();
  const localId = `local_${mutationId}`;
  const record = {
    id: localId,
    ...payload,
    clientMutationId: mutationId,
    syncStatus: 'pending',
    createdAt: new Date().toISOString(),
  };

  // Persist + queue (DB write happens in repository layer when wired to UI)
  await enqueueMutation({
    mutationId,
    type: 'expense.create',
    entity: 'expense',
    payload: { ...payload, clientMutationId: mutationId },
  });

  return record;
}
