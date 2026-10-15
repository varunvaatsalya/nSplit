type Listener = () => void;

function channel() {
  const listeners = new Set<Listener>();
  return {
    emit() {
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** A local write queued something for upload. */
export const localChanges = channel();

/** Sync wrote server data into the local database; screens should reload. */
export const remoteChanges = channel();
