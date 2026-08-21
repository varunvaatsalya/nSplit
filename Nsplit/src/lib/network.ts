import * as Network from 'expo-network';

function fromState(state: Network.NetworkState): boolean {
  const type = String(state.type || '').toUpperCase();
  if (type === 'NONE') return false;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export async function isOnline(): Promise<boolean> {
  try {
    return fromState(await Network.getNetworkStateAsync());
  } catch {
    return false;
  }
}

export function subscribeOnline(listener: (online: boolean) => void) {
  let removed = false;
  const sub = Network.addNetworkStateListener((state) => {
    if (!removed) listener(fromState(state));
  });

  isOnline()
    .then((online) => {
      if (!removed) listener(online);
    })
    .catch(() => {
      if (!removed) listener(false);
    });

  return () => {
    removed = true;
    sub.remove();
  };
}
