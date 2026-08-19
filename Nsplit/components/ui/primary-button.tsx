import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
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
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.primary,
          opacity: isDisabled ? 0.7 : pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? undefined : style,
      ]}>
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
