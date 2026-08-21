import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GroupDiscussion from '@/assets/illustrations/group-discussion-amico.svg';
import { NsplitBrand } from '@/components/nsplit-logo';
import { OfflineBanner } from '@/components/offline-banner';
import { Button } from '@/components/ui/button';
import { Text as UIText } from '@/components/ui/text';
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
        <NsplitBrand color={colors.primary} logoSize={34} fontSize={32} />
      </View>
      <OfflineBanner />

      {groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 pb-16">
          <GroupDiscussion width={artWidth} height={artHeight} />
          <UIText className="mt-4 text-center text-xl font-bold">No groups yet</UIText>
          <UIText variant="muted" className="mt-1.5 max-w-[280px] text-center leading-5">
            Make a group, add your people, and start splitting expenses.
          </UIText>
          <Button variant="link" onPress={openCreate} className="mt-4">
            <UIText>Create new group</UIText>
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 px-5 pb-[100px]">
          {groups.map((group) => (
            <Pressable
              key={group._id}
              onPress={() =>
                router.push({ pathname: '/group/[id]', params: { id: group._id } })
              }
              className="flex-row items-center gap-3.5 rounded-[18px] border p-3.5 active:opacity-85"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}>
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.softSurface }}>
                <Text className="text-[22px]">{getGroupEmoji(group.icon)}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <UIText className="text-base font-bold" numberOfLines={1}>
                  {group.name}
                </UIText>
                <UIText variant="muted" className="text-[13px]">
                  {group.memberCount || 0} member{(group.memberCount || 0) === 1 ? '' : 's'}
                </UIText>
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
    paddingBottom: 16,
  },
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
