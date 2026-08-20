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
import { NsplitBrand } from '@/components/nsplit-logo';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';

export default function SignupScreen() {
  const colors = useColors();
  const { register, pending } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Enter name and email');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
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
          <NsplitBrand
            color={colors.primary}
            logoSize={36}
            fontSize={26}
            align="center"
            style={styles.brand}
          />
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Start splitting with Nsplit
            </Text>

            <View style={styles.form}>
              <Field label="Name" autoComplete="name" value={name} onChangeText={setName} editable={!pending} />
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
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                editable={!pending}
              />
              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
              <PrimaryButton
                title={pending ? 'Creating…' : 'Sign up'}
                loading={pending}
                onPress={onSubmit}
              />
            </View>

            <Pressable disabled style={[styles.google, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary }}>Continue with Google · Coming soon</Text>
            </Pressable>

            <Text style={[styles.footer, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: colors.primary }}>
                Log in
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
