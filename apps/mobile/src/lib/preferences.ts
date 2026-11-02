import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

export type AppearancePreference = 'system' | 'light' | 'dark';

const APPEARANCE_KEY = 'torneapp.appearance';

/** Forcing light or dark only works on devices; the web follows the browser. */
export const canChooseAppearance = Platform.OS !== 'web';

function apply(preference: AppearancePreference) {
  // 'unspecified' hands the choice back to the system
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export async function loadAppearance(): Promise<AppearancePreference> {
  if (!canChooseAppearance) return 'system';
  try {
    const stored = await SecureStore.getItemAsync(APPEARANCE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export async function restoreAppearance() {
  if (canChooseAppearance) apply(await loadAppearance());
}

export async function saveAppearance(preference: AppearancePreference) {
  if (!canChooseAppearance) return;
  apply(preference);
  try {
    await SecureStore.setItemAsync(APPEARANCE_KEY, preference);
  } catch {
    // Applied for this run; the next launch falls back to the system setting
  }
}
