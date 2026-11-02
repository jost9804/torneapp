import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { SocialButtons } from '@/components/auth/social-buttons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { api, type Session } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(
    async (session: Session) => {
      await signIn(session);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    [signIn],
  );

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await finish(await api.auth.login({ email: email.trim(), password }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.intro}>
              <ThemedText type="subtitle">Entra a TorneApp</ThemedText>
              <ThemedText themeColor="textSecondary">
                Para seguir torneos, darles like y unirte como árbitro, técnico o jugador.
              </ThemedText>
            </View>
            <TextField
              label="Correo"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={submit}
            />
            {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
            <Button
              title="Entrar"
              loading={busy}
              disabled={email.trim().length === 0 || password.length === 0}
              onPress={submit}
            />
            <SocialButtons onSession={finish} onError={setError} />
            <View style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                ¿No tienes cuenta?
              </ThemedText>
              <ThemedText
                type="linkPrimary"
                accessibilityRole="link"
                onPress={() => router.replace('/register')}
              >
                Crear cuenta
              </ThemedText>
            </View>
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
  scroll: {
    flexGrow: 1,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
});
