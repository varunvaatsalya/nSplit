import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import type { SavedShare } from '@/src/api/shares';
import { getGroupEmoji } from '@/src/lib/icons';

/** Home card for a group added by link (view only), or its "link expired" placeholder. */
export function SavedGroupCard({
  share,
  onOpen,
  onRemove,
}: {
  share: SavedShare;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();

  if (share.status === 'expired') {
    return (
      <View style={[styles.card, { borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.surface }]}>
        <View style={[styles.icon, { backgroundColor: colors.softSurface }]}>
          <MaterialIcons name="link-off" size={22} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
            {share.name || 'Shared group'}
          </Text>
          <Text style={{ color: colors.danger, fontSize: 13 }}>Link expired · ask for a new one</Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel="Remove group">
          <MaterialIcons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    );
  }

  const subtitle =
    share.join === 'pending'
      ? 'Join request sent'
      : `${share.memberCount || 0} member${share.memberCount === 1 ? '' : 's'}`;

  return (
    <Pressable onPress={onOpen} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.icon, { backgroundColor: colors.softSurface }]}>
        <Text style={{ fontSize: 22 }}>{getGroupEmoji(share.icon)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Text style={{ flexShrink: 1, color: colors.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
            {share.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.softSurface }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}>VIEWER</Text>
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
});
