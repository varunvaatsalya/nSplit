import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { addSavedShare, tokenFromLink } from '@/src/api/shares';
import { useAuth } from '@/src/auth/auth-context';
import { useOffline } from '@/src/offline/offline-context';

/** "Add group": start a new group, or add an existing one by pasting its link. */
export function AddGroupSheet({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { online } = useOffline();
  const [mode, setMode] = useState<'menu' | 'link'>('menu');
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function close() {
    setMode('menu');
    setLink('');
    setError('');
    onClose();
  }

  function chooseExisting() {
    if (!user) {
      close();
      Alert.alert('Log in to add a group', 'Adding a group by link needs an account, so it shows up on all your devices.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Log in', onPress: () => router.push('/login') },
      ]);
      return;
    }
    setMode('link');
  }

  async function addExisting() {
    const token = tokenFromLink(link);
    if (!token) return setError('That doesn’t look like an nSplit group link.');
    if (!online) return setError('Connect to the internet to add a group.');
    setSaving(true);
    setError('');
    try {
      const res = await addSavedShare(link.trim());
      if (!res.ok || !res.data) {
        setError(res.error?.message || 'Could not add this group.');
        return;
      }
      close();
      // Already a member: it syncs in as a normal group; otherwise open the shared view.
      if (res.data.member) onAdded();
      else {
        onAdded();
        router.push({ pathname: '/s/[token]', params: { token } });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={mode === 'menu' ? 'Add group' : 'Add existing group'}
      subtitle={mode === 'link' ? 'Paste the link someone shared with you.' : undefined}
      heightRatio={mode === 'menu' ? 0.36 : 0.5}>
      {mode === 'menu' ? (
        <View style={{ gap: 10 }}>
          <Option
            icon="group-add"
            title="New group"
            text="Start a group and add people"
            onPress={() => {
              close();
              router.push('/group/new');
            }}
          />
          <Option icon="link" title="Add existing" text="Paste a link someone shared" onPress={chooseExisting} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <TextInput
            value={link}
            onChangeText={(v) => {
              setLink(v);
              setError('');
            }}
            placeholder="https://nsplit.vercel.app/s/…"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            style={[styles.input, { color: colors.text, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.background }]}
          />
          {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
            You can view the group right away. To add expenses, ask to join it from there.
          </Text>
          <PrimaryButton title={saving ? 'Adding…' : 'Add group'} loading={saving} onPress={() => void addExisting()} />
        </View>
      )}
    </BottomSheet>
  );

}


/** One row in the "Add group" menu. */
function Option({
  icon,
  title,
  text,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  text: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={[styles.option, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={[styles.optionIcon, { backgroundColor: colors.softSurface }]}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>{text}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  optionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
});
