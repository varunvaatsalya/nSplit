import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { useColors } from '@/hooks/use-colors';

export default function GroupStackLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  if (!id) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="add"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
          title: 'Add expense',
        }}
      />
    </Stack>
  );
}
