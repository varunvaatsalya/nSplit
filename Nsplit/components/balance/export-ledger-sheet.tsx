import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useColors } from '@/hooks/use-colors';
import type { Expense, GroupBalance, GroupDetail, Transfer } from '@/src/api/types';
import { printGroupLedgerPdf, shareGroupLedgerPdf } from '@/src/lib/group-ledger-pdf';

export function ExportLedgerSheet({
  open,
  onOpenChange,
  group,
  expenses,
  transfers,
  balance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupDetail;
  expenses: Expense[];
  transfers: Transfer[];
  balance: GroupBalance | null;
}) {
  const colors = useColors();
  const [busy, setBusy] = useState<'share' | 'export' | null>(null);

  function close() {
    if (busy) return;
    onOpenChange(false);
  }

  async function run(kind: 'share' | 'export') {
    if (busy) return;
    setBusy(kind);
    const input = { group, expenses, transfers, balance };
    try {
      if (kind === 'share') await shareGroupLedgerPdf(input);
      else await printGroupLedgerPdf(input);
      onOpenChange(false);
    } catch {
      Alert.alert('Could not export', 'Try again in a moment.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={close} />
        <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}1A` }]}>
              <MaterialIcons name="picture-as-pdf" size={22} color={colors.primary} />
            </View>
            <Text className="text-base font-semibold">Export details</Text>
            <Text variant="muted" className="leading-5">
              PDF ledger with nSplit branding, group ID, date range, expenses, transfers, and
              balances.
            </Text>
          </View>
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.softSurface }]}>
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={Boolean(busy)}
              onPress={() => run('export')}>
              <Text>{busy === 'export' ? 'Preparing…' : 'Export PDF'}</Text>
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={Boolean(busy)}
              onPress={() => run('share')}>
              <Text>{busy === 'share' ? 'Preparing…' : 'Share'}</Text>
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
    paddingBottom: 12,
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
