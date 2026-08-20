import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

export function SettingsHeader({ title }: { title: string }) {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
        <MaterialIcons name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  iconBtn: { padding: 6 },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
});
