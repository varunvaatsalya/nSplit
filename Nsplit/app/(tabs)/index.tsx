import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// import RefundBro from '@/assets/illustrations/refund-bro.svg';
import GroupDiscussion from '@/assets/illustrations/group-discussion-amico.svg';
import { useColors } from '@/hooks/use-colors';
import { useGroups } from '@/src/groups/groups-context';
import { getGroupEmoji } from '@/src/lib/icons';

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { groups, reload } = useGroups();
  const { width } = useWindowDimensions();
  const artWidth = Math.min(280, Math.round(width * 0.72));
  const artHeight = Math.round(artWidth * (419.74 / 474.81));

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  function openCreate() {
    router.push('/group/new');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: colors.primary }]}>nSplit</Text>
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <GroupDiscussion width={artWidth} height={artHeight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
            Make a group, add your people, and start splitting expenses.
          </Text>
          <Pressable onPress={openCreate} hitSlop={8}>
            <Text style={[styles.createLink, { color: colors.primary }]}>Create new group</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groups.map((group) => (
            <Pressable
              key={group._id}
              onPress={() =>
                router.push({ pathname: '/group/[id]', params: { id: group._id } })
              }
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.softSurface }]}>
                <Text style={styles.emoji}>{getGroupEmoji(group.icon)}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                  {group.name}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {group.memberCount || 0} member{(group.memberCount || 0) === 1 ? '' : 's'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable
        onPress={openCreate}
        style={[styles.fab, { backgroundColor: colors.primary }]}>
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 64,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  createLink: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  rowText: { flex: 1, minWidth: 0 },
  groupName: { fontSize: 16, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
