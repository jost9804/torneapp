import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { api, type Session } from '@/lib/api';

// Closes the provider popup on web once it redirects back
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};
const GOOGLE_READY = Boolean(
  Platform.select({
    ios: GOOGLE_IDS.iosClientId,
    android: GOOGLE_IDS.androidClientId,
    default: GOOGLE_IDS.webClientId,
  }),
);
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

type Props = {
  onSession: (session: Session) => Promise<void>;
  onError: (message: string | null) => void;
};

function GoogleButton({ onSession, onError }: Props) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(GOOGLE_IDS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    setBusy(true);
    api.auth
      .google(idToken)
      .then(onSession)
      .catch((e: Error) => onError(e.message))
      .finally(() => setBusy(false));
  }, [response, onSession, onError]);

  return (
    <Button
      title="Continuar con Google"
      variant="secondary"
      disabled={!request}
      loading={busy}
      onPress={() => {
        onError(null);
        promptAsync();
      }}
    />
  );
}

function FacebookButton({ onSession, onError }: Props) {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const accessToken = response.authentication?.accessToken ?? response.params.access_token;
    setBusy(true);
    api.auth
      .facebook(accessToken)
      .then(onSession)
      .catch((e: Error) => onError(e.message))
      .finally(() => setBusy(false));
  }, [response, onSession, onError]);

  return (
    <Button
      title="Continuar con Facebook"
      variant="secondary"
      disabled={!request}
      loading={busy}
      onPress={() => {
        onError(null);
        promptAsync();
      }}
    />
  );
}

/** Placeholder until the provider's client ID is configured for this build. */
function UnavailableButton({ provider, onError }: { provider: string; onError: Props['onError'] }) {
  return (
    <Button
      title={`Continuar con ${provider}`}
      variant="secondary"
      onPress={() => onError(`El inicio con ${provider} todavía no está configurado.`)}
    />
  );
}

export function SocialButtons(props: Props) {
  return (
    <View style={styles.stack}>
      <View style={styles.divider}>
        <ThemedText type="small" themeColor="textSecondary">
          o
        </ThemedText>
      </View>
      {GOOGLE_READY ? (
        <GoogleButton {...props} />
      ) : (
        <UnavailableButton provider="Google" onError={props.onError} />
      )}
      {FACEBOOK_APP_ID ? (
        <FacebookButton {...props} />
      ) : (
        <UnavailableButton provider="Facebook" onError={props.onError} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
  divider: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
