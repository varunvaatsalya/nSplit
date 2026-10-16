import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NsplitBrand } from '@/components/nsplit-logo';
import { useColors } from '@/hooks/use-colors';

export const AUTH_BENEFITS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'cloud', text: 'Back up your groups and use them on any device' },
  { icon: 'link', text: 'Share a read-only link with your group' },
  { icon: 'globe', text: 'Open everything on the web too' },
];

/** Shared frame for login and sign-up: "Not now", brand, heading, form and footer. */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const colors = useColors();
  const router = useRouter();

  // The app works fully without an account, so leaving is always allowed.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            hitSlop={10}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Feather name="chevron-left" size={24} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Back</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <NsplitBrand color={colors.primary} logoSize={40} fontSize={30} align="center" />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          <View style={styles.form}>{children}</View>
          <View style={styles.footer}>{footer}</View>
          <Text style={[styles.local, { color: colors.textSecondary }]}>
            You can use nSplit without an account. Your groups stay on this phone until you log in.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 8, paddingTop: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingRight: 8 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 24 },
  subtitle: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  form: { gap: 16 },
  footer: { marginTop: 22, alignItems: 'center' },
  local: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 24 },
});
