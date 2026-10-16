import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, type TextInput, View } from 'react-native';

import { AuthField } from '@/components/auth/auth-field';
import { AUTH_BENEFITS, AuthScreen } from '@/components/auth/auth-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export default function SignupScreen() {
  const colors = useColors();
  const { register, pending } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const longEnough = password.length >= MIN_PASSWORD;

  function clear(field: keyof typeof errors) {
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  }

  async function onSubmit() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter your name';
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address';
    if (!longEnough) next.password = `Use at least ${MIN_PASSWORD} characters`;
    setErrors(next);
    if (next.name || next.email || next.password) return;
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Could not create your account. Try again.' });
    }
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Free, and it takes a few seconds."
      footer={
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
          Already have an account?{' '}
          <Link href="/login" replace style={{ color: colors.primary, fontWeight: '700' }}>
            Log in
          </Link>
        </Text>
      }>
      <View style={[styles.benefits, { backgroundColor: colors.softSurface }]}>
        {AUTH_BENEFITS.map((b) => (
          <View key={b.text} style={styles.benefit}>
            <Feather name={b.icon} size={16} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 }}>{b.text}</Text>
          </View>
        ))}
      </View>

      <AuthField
        label="Your name"
        icon="user"
        placeholder="How your group knows you"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        value={name}
        onChangeText={(v) => {
          setName(v);
          clear('name');
        }}
        error={errors.name}
        editable={!pending}
      />
      <AuthField
        ref={emailRef}
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
          clear('email');
        }}
        error={errors.email}
        editable={!pending}
      />
      <View>
        <AuthField
          ref={passwordRef}
          label="Password"
          icon="lock"
          password
          placeholder="Create a password"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clear('password');
          }}
          error={errors.password}
          editable={!pending}
        />
        {!errors.password ? (
          <View style={styles.rule}>
            <Feather
              name={longEnough ? 'check-circle' : 'circle'}
              size={13}
              color={longEnough ? colors.success : colors.textSecondary}
            />
            <Text style={{ color: longEnough ? colors.success : colors.textSecondary, fontSize: 12 }}>
              At least {MIN_PASSWORD} characters
            </Text>
          </View>
        ) : null}
      </View>

      {errors.form ? <Text style={[styles.formError, { color: colors.danger }]}>{errors.form}</Text> : null}
      <PrimaryButton title={pending ? 'Creating account…' : 'Create account'} loading={pending} onPress={onSubmit} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  benefits: { borderRadius: 16, padding: 14, gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  formError: { fontSize: 14, textAlign: 'center' },
});
