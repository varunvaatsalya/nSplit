import Feather from '@expo/vector-icons/Feather';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  error?: string | null;
  hint?: string | null;
  /** Adds a show/hide toggle and hides the text by default. */
  password?: boolean;
};

/** Labeled input with a leading icon, inline error and an optional password toggle. */
export const AuthField = forwardRef<TextInput, Props>(function AuthField(
  { label, icon, error, hint, password, editable = true, onFocus, onBlur, ...props },
  ref
) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={{ opacity: editable === false ? 0.6 : 1 }}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={[styles.box, { borderColor, backgroundColor: colors.surface }]}>
        <Feather name={icon} size={18} color={focused ? colors.primary : colors.textSecondary} />
        <TextInput
          ref={ref}
          editable={editable}
          secureTextEntry={password && !visible}
          placeholderTextColor={colors.textSecondary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }]}
          {...props}
        />
        {password ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
            <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.note, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, minWidth: 0 },
  note: { fontSize: 12, marginTop: 6 },
});
