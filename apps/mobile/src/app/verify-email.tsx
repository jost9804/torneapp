import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, MaxContentWidth, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const RESEND_SECONDS = 60;

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** Enter the 6-digit code emailed at sign-up; it can be skipped and finished later. */
export default function VerifyEmailScreen() {
  const auth = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  // Counts down until another code may be requested
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  if (auth.status === 'loading') return <LoadingView />;
  if (auth.status === 'signedOut') return <Redirect href="/login" />;
  if (auth.user.emailVerifiedAt) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Correo confirmado</ThemedText>
          <ThemedText themeColor="textSecondary">
            Ya puedes crear torneos y equipos, e inscribirte en torneos.
          </ThemedText>
          <Button title="Listo" onPress={close} />
        </View>
      </ThemedView>
    );
  }

  const submit = async (value = code) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      auth.setUser(await api.auth.verifyEmail(value));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      await api.auth.sendCode();
      setNotice('Te enviamos un código nuevo.');
      setCode('');
      setWait(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el código');
    }
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    // Pasting or autofilling the whole code sends it right away
    if (digits.length === 6 && !busy) submit(digits);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.intro}>
              <ThemedText type="subtitle">Confirma tu correo</ThemedText>
              <ThemedText themeColor="textSecondary">
                Te enviamos un código de 6 dígitos a{' '}
                <ThemedText type="smallBold">{auth.user.email}</ThemedText>. Revisa también la
                carpeta de spam.
              </ThemedText>
            </View>
            <TextField
              label="Código"
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              style={styles.code}
            />
            {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
            {notice ? <ThemedText themeColor="textSecondary">{notice}</ThemedText> : null}
            <Button
              title="Confirmar"
              loading={busy}
              disabled={code.length !== 6}
              onPress={() => submit()}
            />
            <Button
              title={wait > 0 ? `Reenviar código en ${wait} s` : 'Reenviar código'}
              variant="secondary"
              disabled={wait > 0}
              onPress={resend}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Mientras tanto puedes ver y seguir torneos. Para crear torneos o equipos e
              inscribirte necesitas confirmar el correo.
            </ThemedText>
            <ThemedText type="linkPrimary" accessibilityRole="button" onPress={close}>
              Hacerlo más tarde
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  intro: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  code: {
    fontFamily: FontFamily.display,
    fontSize: 32,
    letterSpacing: 12,
    textAlign: 'center',
  },
});
