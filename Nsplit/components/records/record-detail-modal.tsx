import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpenseDetailPage } from '@/components/expenses/expense-detail-modal';
import { TransferDetailPage } from '@/components/transfers/transfer-detail-modal';
import { useColors } from '@/hooks/use-colors';
import type { Expense, GroupDetail, Transfer } from '@/src/api/types';

export type RecordFeedItem =
  | { kind: 'expense'; id: string; expense: Expense }
  | { kind: 'transfer'; id: string; transfer: Transfer };

export function RecordDetailModal({
  open,
  onClose,
  items,
  index,
  onIndexChange,
  group,
  currentUserId,
  myMemberId,
  onEditExpense,
  onEditTransfer,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  items: RecordFeedItem[];
  index: number;
  onIndexChange: (next: number) => void;
  group: GroupDetail;
  currentUserId?: string | null;
  myMemberId?: string | null;
  onEditExpense: (expense: Expense) => void;
  onEditTransfer: (transfer: Transfer) => void;
  onDeleted: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<RecordFeedItem>>(null);
  const indexRef = useRef(index);
  const [session, setSession] = useState({ open: false, key: 0, start: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  indexRef.current = index;

  useEffect(() => {
    if (open && !session.open) {
      setSession((prev) => ({ open: true, key: prev.key + 1, start: index }));
    } else if (!open && session.open) {
      setSession((prev) => ({ ...prev, open: false }));
    }
  }, [open]);

  const canPrev = index > 0;
  const canNext = index < items.length - 1;
  const pageWidth = viewport.width;

  function go(next: number) {
    if (next < 0 || next >= items.length || !pageWidth) return;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    onIndexChange(next);
  }

  function handleDeleted() {
    onDeleted();
    onClose();
  }

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!pageWidth) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== indexRef.current && next >= 0 && next < items.length) {
      onIndexChange(next);
    }
  }

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View
          style={[styles.pager, { backgroundColor: colors.background }]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (width !== viewport.width || height !== viewport.height) {
              setViewport({ width, height });
            }
          }}>
          {open && pageWidth > 0 && viewport.height > 0 ? (
            <FlatList
              ref={listRef}
              key={session.key}
              data={items}
              horizontal
              pagingEnabled
              bounces={false}
              overScrollMode="never"
              nestedScrollEnabled
              style={{ flex: 1, backgroundColor: colors.background }}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => `${item.kind}-${item.id}`}
              initialScrollIndex={Math.min(session.start, Math.max(items.length - 1, 0))}
              getItemLayout={(_, i) => ({
                length: pageWidth,
                offset: pageWidth * i,
                index: i,
              })}
              windowSize={7}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              updateCellsBatchingPeriod={16}
              removeClippedSubviews={false}
              onMomentumScrollEnd={onMomentumEnd}
              onScrollToIndexFailed={({ index: failed }) => {
                requestAnimationFrame(() => {
                  listRef.current?.scrollToIndex({ index: failed, animated: false });
                });
              }}
              renderItem={({ item }) => (
                <View
                  style={{
                    width: pageWidth,
                    height: viewport.height,
                    backgroundColor: colors.background,
                  }}>
                  {item.kind === 'expense' ? (
                    <ExpenseDetailPage
                      expense={item.expense}
                      group={group}
                      currentUserId={currentUserId}
                      myMemberId={myMemberId}
                      onEdit={onEditExpense}
                      onDeleted={handleDeleted}
                    />
                  ) : (
                    <TransferDetailPage
                      transfer={item.transfer}
                      group={group}
                      currentUserId={currentUserId}
                      myMemberId={myMemberId}
                      onEdit={onEditTransfer}
                      onDeleted={handleDeleted}
                    />
                  )}
                </View>
              )}
            />
          ) : null}
        </View>

        <View
          style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}>
          <Pressable disabled={!canPrev} onPress={() => go(index - 1)} hitSlop={12} style={styles.navHit}>
            <MaterialIcons
              name="chevron-left"
              size={32}
              color={canPrev ? colors.text : colors.border}
            />
          </Pressable>
          <Pressable disabled={!canNext} onPress={() => go(index + 1)} hitSlop={12} style={styles.navHit}>
            <MaterialIcons
              name="chevron-right"
              size={32}
              color={canNext ? colors.text : colors.border}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  navHit: { padding: 8 },
  pager: { flex: 1 },
});
