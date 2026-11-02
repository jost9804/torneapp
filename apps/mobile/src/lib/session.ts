import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'torneapp.session';

// Read synchronously by every API request
let currentToken: string | null = null;

export function getToken() {
  return currentToken;
}

/** Keychain/Keystore on devices; the browser has no secure store, so web uses localStorage. */
export async function loadToken() {
  try {
    currentToken =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(TOKEN_KEY) ?? null)
        : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    currentToken = null;
  }
  return currentToken;
}

export async function saveToken(token: string | null) {
  currentToken = token;
  try {
    if (Platform.OS === 'web') {
      if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
      else globalThis.localStorage?.removeItem(TOKEN_KEY);
    } else if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    // Still signed in for this run; the next launch asks again
  }
}
