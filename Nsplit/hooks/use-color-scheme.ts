import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppearanceOptional } from '@/src/theme/appearance-context';

export function useColorScheme() {
  const appearance = useAppearanceOptional();
  const system = useSystemColorScheme();
  return appearance?.scheme ?? system ?? 'light';
}
