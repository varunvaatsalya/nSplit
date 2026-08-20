import type { AppearanceMode, ColorThemeId } from '@/constants/theme';
import { COLOR_THEMES } from '@/constants/theme';

import { getDb } from './client';

const NAME_KEY = 'identity_name';
const MATCH_KEY = 'identity_match_by_name';
const APPEARANCE_MODE_KEY = 'appearance_mode';
const COLOR_THEME_KEY = 'color_theme';

const APPEARANCE_MODES: AppearanceMode[] = ['system', 'light', 'dark'];
const COLOR_THEME_IDS = COLOR_THEMES.map((theme) => theme.id);

export type IdentitySettings = {
  name: string;
  matchByName: boolean;
};

export async function getIdentitySettings(): Promise<IdentitySettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM meta WHERE key IN (?, ?)`,
    [NAME_KEY, MATCH_KEY]
  );
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    name: String(map[NAME_KEY] || '').trim(),
    matchByName: map[MATCH_KEY] !== '0',
  };
}

export async function setIdentityName(name: string) {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    NAME_KEY,
    name.trim(),
  ]);
}

export async function setIdentityMatchByName(enabled: boolean) {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    MATCH_KEY,
    enabled ? '1' : '0',
  ]);
}

export type AppearanceSettings = {
  mode: AppearanceMode;
  colorTheme: ColorThemeId;
};

function isAppearanceMode(value: string | undefined): value is AppearanceMode {
  return APPEARANCE_MODES.includes(value as AppearanceMode);
}

function isColorThemeId(value: string | undefined): value is ColorThemeId {
  return COLOR_THEME_IDS.includes(value as ColorThemeId);
}

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM meta WHERE key IN (?, ?)`,
    [APPEARANCE_MODE_KEY, COLOR_THEME_KEY]
  );
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    mode: isAppearanceMode(map[APPEARANCE_MODE_KEY]) ? map[APPEARANCE_MODE_KEY] : 'system',
    colorTheme: isColorThemeId(map[COLOR_THEME_KEY]) ? map[COLOR_THEME_KEY] : 'indigo',
  };
}

export async function setAppearanceMode(mode: AppearanceMode) {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    APPEARANCE_MODE_KEY,
    mode,
  ]);
}

export async function setColorTheme(themeId: ColorThemeId) {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    COLOR_THEME_KEY,
    themeId,
  ]);
}
