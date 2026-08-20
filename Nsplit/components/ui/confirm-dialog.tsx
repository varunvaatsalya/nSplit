import { AlertTriangle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColors } from '@/hooks/use-colors';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  confirmPhrase,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  loading?: boolean;
  confirmPhrase?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const colors = useColors();
  const isDanger = tone === 'danger';
  const [typed, setTyped] = useState('');
  const phrase = confirmPhrase?.trim() || '';
  const phraseOk = !phrase || typed.trim().toLowerCase() === phrase.toLowerCase();

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  function close() {
    if (loading) return;
    onOpenChange(false);
  }

  const accent = isDanger ? colors.danger : colors.primary;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={close}
        />
        <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: `${accent}1A` }]}>
              <Icon
                as={AlertTriangle}
                size={20}
                className={isDanger ? 'text-destructive' : 'text-primary'}
              />
            </View>
            <Text className="text-base font-semibold">{title}</Text>
            {description ? (
              <Text variant="muted" className="leading-5">
                {description}
              </Text>
            ) : null}
          </View>

          {phrase ? (
            <View style={styles.phrase}>
              <Text variant="muted">
                Type <Text className="font-medium">{phrase}</Text> to confirm.
              </Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={phrase}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.softSurface }]}>
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={loading}
              onPress={close}>
              <Text>{cancelLabel}</Text>
            </Button>
            <Button
              variant={isDanger ? 'destructive' : 'default'}
              className="flex-1 rounded-xl"
              disabled={loading || !phraseOk}
              onPress={onConfirm}>
              <Text>{loading ? 'Please wait…' : confirmLabel}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phrase: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  footer: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 8,
  },
});
