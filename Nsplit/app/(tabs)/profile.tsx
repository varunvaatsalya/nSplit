import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppearanceSettings } from '@/components/profile/appearance-settings';
import { OfflineBanner } from '@/components/offline-banner';
import { Field } from '@/components/ui/field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';
import { useIdentity } from '@/src/identity/identity-context';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout, pending } = useAuth();
  const { name: storedName, matchByName, setName, setMatchByName } = useIdentity();
  const [draftName, setDraftName] = useState(storedName);

  useEffect(() => {
    setDraftName(storedName);
  }, [storedName]);

  async function onLogout() {
    try {
      await logout();
    } catch {
      Alert.alert('Could not log out', 'Try again.');
    }
  }

  async function saveName() {
    const trimmed = draftName.trim();
    setDraftName(trimmed);
    await setName(trimmed);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>
        <OfflineBanner />

        {user ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <UserAvatar name={user.name} avatar={user.avatar} seed={user._id} size={64} />
            <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
            <Text style={{ color: colors.textSecondary }}>{user.email}</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.name, { color: colors.text }]}>
              {storedName.trim() || 'Your groups stay on this phone'}
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              {storedName.trim()
                ? 'Saved on this phone. Log in later if you want a backup.'
                : 'Log in later to back them up.'}
            </Text>
          </View>
        )}

        <AppearanceSettings />

        <View style={[styles.settings, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.section, { color: colors.text }]}>In groups</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10 }}>
            We’ll treat a member as you when the name mostly matches this one. You can also pick
            yourself inside a group.
          </Text>
          <Field
            label="Your name"
            placeholder="e.g. Varun"
            value={draftName}
            onChangeText={setDraftName}
            onBlur={saveName}
            autoCapitalize="words"
          />
          <Pressable style={styles.toggleRow} onPress={() => setMatchByName(!matchByName)}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Match me by name</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                Not exact - nicknames and partial names still count.
              </Text>
            </View>
            <Switch
              value={matchByName}
              onValueChange={setMatchByName}
              trackColor={{ true: colors.primary }}
            />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 10 }}>
          {user ? (
            <PrimaryButton
              title={pending ? 'Logging out…' : 'Log out'}
              loading={pending}
              onPress={onLogout}
            />
          ) : (
            <PrimaryButton title="Log in" onPress={() => router.push('/login')} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
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
  settings: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  section: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
});
