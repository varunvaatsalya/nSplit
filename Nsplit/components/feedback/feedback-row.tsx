import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { sendFeedback, type FeedbackType } from '@/src/api/feedback';

const TYPES: { key: FeedbackType; label: string; icon: keyof typeof Feather.glyphMap; placeholder: string }[] = [
  { key: 'bug', label: 'Bug', icon: 'alert-circle', placeholder: 'What went wrong? What did you expect to happen?' },
  { key: 'idea', label: 'Idea', icon: 'zap', placeholder: 'What would make nSplit better for you?' },
  { key: 'other', label: 'Other', icon: 'message-square', placeholder: 'Tell us anything.' },
];

/**
 * "Send feedback" row that opens a sheet. `source` and `groupRef` say where it
 * was sent from, so the report carries that context without asking the user.
 */
export function FeedbackRow({
  source,
  groupRef = null,
  style,
}: {
  source: string;
  groupRef?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  function close() {
    setOpen(false);
    setType('bug');
    setMessage('');
    setError('');
  }

  async function send() {
    if (message.trim().length < 3) {
      setError('Write a little more so we can understand.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await sendFeedback({ type, message: message.trim(), source, groupRef });
      if (!res.ok) {
        setError(res.error?.message || 'Could not send. Please try again.');
        return;
      }
      close();
      Alert.alert('Thanks for the feedback', 'We read every message.');
    } finally {
      setSending(false);
    }
  }

  const current = TYPES.find((t) => t.key === type)!;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
        <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}1A` }]}>
          <Feather name="message-circle" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Send feedback</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
            Report a bug or suggest an improvement
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </Pressable>

      <BottomSheet
        open={open}
        onClose={close}
        title="Send feedback"
        subtitle="Found a bug or have an idea? Tell us."
        heightRatio={0.62}>
        <View style={{ gap: 12 }}>
          <View style={styles.chips}>
            {TYPES.map((t) => {
              const active = t.key === type;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setType(t.key)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}1A` : 'transparent',
                    },
                  ]}>
                  <Feather name={t.icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={message}
            onChangeText={(v) => {
              setMessage(v);
              setError('');
            }}
            placeholder={current.placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={[
              styles.input,
              { color: colors.text, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.background },
            ]}
          />
          {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
          <PrimaryButton title={sending ? 'Sending…' : 'Send'} loading={sending} onPress={() => void send()} />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 120 },
});
