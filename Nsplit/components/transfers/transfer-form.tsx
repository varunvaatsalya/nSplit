import { Check, ChevronDown, User } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmojiPickerModal } from '@/components/expenses/emoji-picker-modal';
import { WhenField } from '@/components/expenses/when-field';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Text as UIText } from '@/components/ui/text';
import { useColors } from '@/hooks/use-colors';
import type { GroupDetail, GroupMember, Transfer } from '@/src/api/types';
import { saveTransfer } from '@/src/db/transfers';
import { suggestEmojiFromText } from '@/src/lib/expense-icons';
import { memberListLabel, sortMembersByName } from '@/src/lib/members';

const DEFAULT_TRANSFER_EMOJI = '💸';

function MemberSelect({
  members,
  value,
  placeholder,
  label,
  showUserIcon,
  error,
  currentUserId,
  onChange,
}: {
  members: GroupMember[];
  value: string;
  placeholder: string;
  label?: string;
  showUserIcon?: boolean;
  error?: boolean;
  currentUserId?: string | null;
  onChange: (id: string) => void;
}) {
  const colors = useColors();
  const selected = members.find((m) => m._id === value);

  return (
    <Popover>
      <PopoverTrigger className="w-full">
        <View
          style={[
            styles.metaBtn,
            {
              borderColor: error ? colors.danger : colors.border,
              backgroundColor: colors.surface,
            },
          ]}>
          <View className="flex-row items-center gap-2">
            {showUserIcon ? <Icon as={User} size={16} className="text-muted-foreground" /> : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              {label ? (
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{label}</Text>
              ) : null}
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                {selected ? memberListLabel(selected, currentUserId) : placeholder}
              </Text>
            </View>
            <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
          </View>
        </View>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {members.map((m) => {
          const active = m._id === value;
          return (
            <PopoverClose asChild key={m._id}>
              <Button
                variant="ghost"
                className="h-10 w-full justify-between rounded-sm px-3"
                onPress={() => onChange(m._id)}>
                <UIText className="text-sm font-medium">
                  {memberListLabel(m, currentUserId)}
                </UIText>
                {active ? <Icon as={Check} size={16} className="text-primary" /> : null}
              </Button>
            </PopoverClose>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function TransferForm({
  group,
  currentUserId,
  transfer,
  onSaved,
}: {
  group: GroupDetail;
  currentUserId?: string | null;
  transfer?: Transfer | null;
  onSaved: () => void;
}) {
  const colors = useColors();
  const members = useMemo(() => sortMembersByName(group.members || []), [group.members]);
  const isEdit = Boolean(transfer?._id);

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(DEFAULT_TRANSFER_EMOJI);
  const [iconManual, setIconManual] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showDesc, setShowDesc] = useState(false);
  const [fromMemberId, setFromMemberId] = useState('');
  const [toMemberId, setToMemberId] = useState('');
  const [transferAt, setTransferAt] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    amount: false,
    title: false,
    from: false,
    to: false,
  });
  const titleRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  function applyTitleSuggestion(nextTitle: string) {
    if (iconManual) return;
    const suggested = suggestEmojiFromText(nextTitle);
    if (!nextTitle.trim() || suggested.categoryKey === 'other') {
      setIcon(DEFAULT_TRANSFER_EMOJI);
      return;
    }
    setIcon(suggested.emoji);
  }

  function resetForm() {
    setTitle('');
    setIcon(DEFAULT_TRANSFER_EMOJI);
    setIconManual(false);
    setAmount('');
    setDescription('');
    setShowDesc(false);
    setFromMemberId(members[0]?._id || '');
    setToMemberId('');
    setTransferAt(new Date());
    setFieldErrors({ amount: false, title: false, from: false, to: false });
  }

  function hydrateFromTransfer(item: Transfer) {
    setTitle(item.title || '');
    setIcon(item.icon || DEFAULT_TRANSFER_EMOJI);
    setIconManual(Boolean(item.icon));
    setAmount(((item.amountMinor || 0) / 100).toString());
    setFromMemberId(item.fromMemberId || '');
    setToMemberId(item.toMemberId || '');
    const when = item.transferDate || item.createdAt;
    setTransferAt(when ? new Date(when) : new Date());
    setFieldErrors({ amount: false, title: false, from: false, to: false });
  }

  useEffect(() => {
    if (!members.length) return;
    if (transfer?._id) hydrateFromTransfer(transfer);
    else resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group._id, transfer?._id, members.length]);

  const toOptions = members.filter((m) => m._id !== fromMemberId);

  async function onSubmit() {
    const n = Number(amount);
    const amountOk = Number.isFinite(n) && n > 0;
    const titleOk = Boolean(title.trim());
    const fromOk = Boolean(fromMemberId);
    const toOk = Boolean(toMemberId) && fromMemberId !== toMemberId;

    if (!amountOk || !titleOk || !fromOk || !toOk) {
      setFieldErrors({
        amount: !amountOk,
        title: !titleOk,
        from: !fromOk,
        to: !toOk,
      });
      return;
    }

    setSaving(true);
    try {
      await saveTransfer(
        group._id,
        {
          title: title.trim(),
          icon,
          amountMinor: Math.round(n * 100),
          fromMemberId,
          toMemberId,
          transferDate: transferAt.toISOString(),
          createdById: currentUserId,
        },
        transfer?._id
      );
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          placeholder="0.00"
          autoFocus={!isEdit}
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          returnKeyType="next"
          enterKeyHint="next"
          submitBehavior="submit"
          onSubmitEditing={() => titleRef.current?.focus()}
          value={amount}
          onChangeText={(next) => {
            setAmount(next);
            setFieldErrors((prev) => ({ ...prev, amount: false }));
          }}
          style={[
            styles.amount,
            {
              color: colors.text,
              backgroundColor: colors.softSurface,
              borderColor: fieldErrors.amount ? colors.danger : colors.border,
            },
          ]}
        />

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setIconsOpen(true)}
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.softSurface }]}>
            <Text style={{ fontSize: 22 }}>{icon}</Text>
          </Pressable>
          <TextInput
            ref={titleRef}
            placeholder="Title"
            placeholderTextColor={colors.textSecondary}
            returnKeyType={showDesc ? 'next' : 'done'}
            enterKeyHint={showDesc ? 'next' : 'done'}
            submitBehavior={showDesc ? 'submit' : 'blurAndSubmit'}
            onSubmitEditing={() => {
              if (showDesc) descriptionRef.current?.focus();
            }}
            value={title}
            onChangeText={(next) => {
              setTitle(next);
              setFieldErrors((prev) => ({ ...prev, title: false }));
              applyTitleSuggestion(next);
            }}
            style={[
              styles.titleInput,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: fieldErrors.title ? colors.danger : colors.border,
              },
            ]}
          />
        </View>

        {!showDesc ? (
          <Pressable onPress={() => setShowDesc(true)} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>+ Add description</Text>
          </Pressable>
        ) : (
          <View style={{ gap: 6 }}>
            <View style={styles.descHead}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Description</Text>
              <Pressable
                onPress={() => {
                  setShowDesc(false);
                  setDescription('');
                }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Remove</Text>
              </Pressable>
            </View>
            <TextInput
              ref={descriptionRef}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional note"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[
                styles.desc,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>
        )}

        <View className="flex-row gap-2">
          <View style={{ flex: 1 }}>
            <MemberSelect
              members={members}
              value={fromMemberId}
              placeholder="Select"
              label="From"
              showUserIcon
              error={fieldErrors.from}
              currentUserId={currentUserId}
              onChange={(id) => {
                setFromMemberId(id);
                setFieldErrors((prev) => ({ ...prev, from: false, to: false }));
                if (toMemberId === id) setToMemberId('');
              }}
            />
          </View>
          <WhenField value={transferAt} onChange={setTransferAt} />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
            Transferred to
          </Text>
          <MemberSelect
            members={toOptions}
            value={toMemberId}
            placeholder="Select member"
            error={fieldErrors.to}
            currentUserId={currentUserId}
            onChange={(id) => {
              setToMemberId(id);
              setFieldErrors((prev) => ({ ...prev, from: false, to: false }));
            }}
          />
        </View>

        <PrimaryButton
          title={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Record transfer'}
          loading={saving}
          onPress={onSubmit}
        />
      </ScrollView>

      <EmojiPickerModal
        open={iconsOpen}
        onClose={() => setIconsOpen(false)}
        value={icon}
        onSelect={(item) => {
          setIcon(item.emoji);
          setIconManual(true);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  amount: {
    height: 64,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  descHead: { flexDirection: 'row', justifyContent: 'space-between' },
  desc: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top',
  },
  metaBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
