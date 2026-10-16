import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiFetch } from '@/src/api/client';

export type FeedbackType = 'bug' | 'idea' | 'other';

/**
 * Send a bug report or idea. Where it came from (screen, group, platform,
 * version) is attached here, so the user only writes the message.
 */
export const sendFeedback = (input: {
  type: FeedbackType;
  message: string;
  source: string;
  groupRef?: string | null;
}) =>
  apiFetch<{ id: string }>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      groupRef: input.groupRef ?? null,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? null,
      osVersion: String(Platform.Version ?? ''),
    }),
  });
