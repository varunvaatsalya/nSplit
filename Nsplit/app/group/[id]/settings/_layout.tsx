import { Stack } from 'expo-router';

import { useColors } from '@/hooks/use-colors';

export default function GroupSettingsLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
