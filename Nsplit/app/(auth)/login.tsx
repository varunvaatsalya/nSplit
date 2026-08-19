import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/ui/field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';

export default function LoginScreen() {
  const colors = useColors();
  const { login, pending } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter email and password');
      return;
    }
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <Text style={[styles.brand, { color: colors.primary }]}>Nsplit</Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Log in to Nsplit
            </Text>

            <View style={styles.form}>
              <Field
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!pending}
              />
              <Field
                label="Password"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                editable={!pending}
              />
              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
              <PrimaryButton
                title={pending ? 'Signing in…' : 'Log in'}
                loading={pending}
                onPress={onSubmit}
              />
            </View>

            <Pressable disabled style={[styles.google, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary }}>Continue with Google · Coming soon</Text>
            </Pressable>

            <Text style={[styles.footer, { color: colors.textSecondary }]}>
              No account?{' '}
              <Link href="/signup" style={{ color: colors.primary }}>
                Sign up
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brand: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
  },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { marginTop: 4, fontSize: 14 },
  form: { marginTop: 20, gap: 14 },
  error: { fontSize: 14 },
  google: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  footer: { marginTop: 16, textAlign: 'center', fontSize: 14 },
});
