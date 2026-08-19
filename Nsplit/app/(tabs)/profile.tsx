import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout, pending } = useAuth();

  async function onLogout() {
    try {
      await logout();
    } catch {
      Alert.alert('Could not log out', 'Try again.');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
      </View>

      {user ? (
        <>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <UserAvatar name={user.name} avatar={user.avatar} seed={user._id} size={64} />
            <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
            <Text style={{ color: colors.textSecondary }}>{user.email}</Text>
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <PrimaryButton
              title={pending ? 'Logging out…' : 'Log out'}
              loading={pending}
              onPress={onLogout}
            />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.name, { color: colors.text }]}>Your groups stay on this phone</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Log in later to back them up.
            </Text>
          </View>
          <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 10 }}>
            <PrimaryButton title="Log in" onPress={() => router.push('/login')} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  card: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  name: { fontSize: 20, fontWeight: '700', marginTop: 8 },
});
