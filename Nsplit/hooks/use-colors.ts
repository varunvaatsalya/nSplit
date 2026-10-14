import { Colors } from '@/constants/theme';
import { useAppearanceOptional } from '@/src/theme/appearance-context';

export function useColors() {
  const appearance = useAppearanceOptional();
  return appearance?.colors ?? Colors.light;
}
