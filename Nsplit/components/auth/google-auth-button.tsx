import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';
import { googleSignInAvailable } from '@/src/auth/google';

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

/**
 * "Continue with Google" plus an "or" line, shown above the email form.
 * Hidden where Google sign-in can't run (Expo Go, or not configured).
 */
export function GoogleAuthButton() {
  const colors = useColors();
  const { loginWithGoogle, pending } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!googleSignInAvailable) return null;

  async function onPress() {
    setBusy(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || pending;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => void onPress()}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: colors.border,
            backgroundColor: pressed ? colors.softSurface : colors.surface,
            opacity: disabled && !busy ? 0.6 : 1,
          },
        ]}>
        {busy ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <GoogleLogo />}
        <Text style={[styles.label, { color: colors.text }]}>{busy ? 'Signing you in…' : 'Continue with Google'}</Text>
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.or, { color: colors.textSecondary }]}>OR</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 6 },
  // Same size, corners and border as the email/password fields below it.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  label: { fontSize: 15, fontWeight: '600' },
  error: { fontSize: 14, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  or: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
