import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppearanceOptional } from '@/src/theme/appearance-context';

export function useColors() {
  const appearance = useAppearanceOptional();
  const scheme = useColorScheme() ?? 'light';
  return appearance?.colors ?? Colors[scheme];
}
