import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from 'react-native';

import { useColors } from '@/hooks/use-colors';

export function PrimaryButton({
  title,
  loading,
  disabled,
  style,
  ...props
}: PressableProps & { title: string; loading?: boolean }) {
  const colors = useColors();
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      className="w-full active:opacity-85"
      style={typeof style === 'function' ? undefined : style}>
      <View
        className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl"
        style={{
          backgroundColor: colors.primary,
          opacity: isDisabled ? 0.7 : 1,
        }}>
        {loading ? <ActivityIndicator color={colors.primaryForeground} /> : null}
        <Text
          className="text-[15px] font-semibold"
          style={{ color: colors.primaryForeground }}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
