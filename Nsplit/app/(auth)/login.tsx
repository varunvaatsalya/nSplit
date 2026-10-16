import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, type TextInput } from 'react-native';

import { AuthField } from '@/components/auth/auth-field';
import { AuthScreen } from '@/components/auth/auth-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const colors = useColors();
  const { login, pending } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const passwordRef = useRef<TextInput>(null);

  async function onSubmit() {
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (next.email || next.password) return;
    try {
      await login(email.trim(), password);
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Could not log in. Try again.' });
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log in to back up your groups and keep them in sync across devices."
      footer={
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
          New to nSplit?{' '}
          <Link href="/signup" replace style={{ color: colors.primary, fontWeight: '700' }}>
            Create an account
          </Link>
        </Text>
      }>
      <AuthField
        label="Email"
        icon="mail"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setErrors((e) => ({ ...e, email: undefined, form: undefined }));
        }}
        error={errors.email}
        editable={!pending}
      />
      <AuthField
        ref={passwordRef}
        label="Password"
        icon="lock"
        password
        placeholder="Your password"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setErrors((e) => ({ ...e, password: undefined, form: undefined }));
        }}
        error={errors.password}
        editable={!pending}
      />
      {errors.form ? <Text style={[styles.formError, { color: colors.danger }]}>{errors.form}</Text> : null}
      <PrimaryButton title={pending ? 'Logging in…' : 'Log in'} loading={pending} onPress={onSubmit} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  formError: { fontSize: 14, textAlign: 'center' },
});
