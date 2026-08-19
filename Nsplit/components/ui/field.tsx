import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

export const Field = forwardRef<TextInput, TextInputProps & { label?: string }>(
  function Field({ label, style, editable = true, ...props }, ref) {
    const colors = useColors();
    return (
      <View style={{ opacity: editable === false ? 0.6 : 1 }}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.text,
            },
            style,
          ]}
          {...props}
        />
      </View>
    );
  }
);

export function InlineField({
  left,
  right,
  style,
  editable = true,
  ...props
}: TextInputProps & { left?: ReactNode; right?: ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.inline,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: editable === false ? 0.6 : 1,
        },
      ]}>
      {left}
      <TextInput
        editable={editable}
        placeholderTextColor={colors.textSecondary}
        style={[styles.inlineInput, { color: colors.text }, style]}
        {...props}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 48,
  },
  inlineInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    fontSize: 16,
    minWidth: 0,
  },
});

