import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { Avatar } from '@/src/api/types';

const PALETTE = [
  { bg: '#4338ca', fg: '#ffffff' },
  { bg: '#15803d', fg: '#ffffff' },
  { bg: '#b45309', fg: '#ffffff' },
  { bg: '#be185d', fg: '#ffffff' },
  { bg: '#0369a1', fg: '#ffffff' },
  { bg: '#7e22ce', fg: '#ffffff' },
  { bg: '#c2410c', fg: '#ffffff' },
  { bg: '#0f766e', fg: '#ffffff' },
  { bg: '#b91c1c', fg: '#ffffff' },
  { bg: '#4d7c0f', fg: '#ffffff' },
];

function resolveStyle(avatar?: Avatar | null, seed = '?') {
  const stored = avatar?.bg?.toLowerCase();
  if (stored && /^#[0-9a-f]{6}$/.test(stored)) {
    const match = PALETTE.find((p) => p.bg.toLowerCase() === stored);
    return match || { bg: stored, fg: '#ffffff' };
  }
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function UserAvatar({
  name,
  avatar,
  seed,
  size = 40,
}: {
  name?: string | null;
  avatar?: Avatar | null;
  seed?: string | null;
  size?: number;
}) {
  const letters = (avatar?.letters || '?').toUpperCase();
  const style = resolveStyle(avatar, seed || name || letters);

  if (avatar?.url) {
    return (
      <Image
        source={{ uri: avatar.url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: style.bg,
        },
      ]}>
      <Text style={[styles.letters, { color: style.fg, fontSize: size * 0.36 }]}>{letters}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letters: {
    fontWeight: '700',
  },
});
