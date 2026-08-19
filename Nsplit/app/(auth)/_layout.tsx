import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/src/auth/auth-context';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
