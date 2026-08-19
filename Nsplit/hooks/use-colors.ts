import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useColors() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}
