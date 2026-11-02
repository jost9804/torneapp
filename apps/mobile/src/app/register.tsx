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

const MIN_PASSWORD = 8;

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
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
      await finish(await api.auth.register({ name: name.trim(), email: email.trim(), password }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  };

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.intro}>
              <ThemedText type="subtitle">Crea tu cuenta</ThemedText>
              <ThemedText themeColor="textSecondary">
                Con tu cuenta puedes crear torneos o pedir unirte a uno.
              </ThemedText>
            </View>
            <TextField
              label="Nombre"
              placeholder="Como te conocen en la cancha"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              textContentType="name"
              maxLength={80}
            />
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
            <View style={styles.field}>
              <TextField
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <ThemedText type="small" themeColor={tooShort ? 'danger' : 'textSecondary'}>
                Mínimo {MIN_PASSWORD} caracteres.
              </ThemedText>
            </View>
            {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
            <Button
              title="Crear cuenta"
              loading={busy}
              disabled={
                name.trim().length === 0 ||
                email.trim().length === 0 ||
                password.length < MIN_PASSWORD
              }
              onPress={submit}
            />
            <SocialButtons onSession={finish} onError={setError} />
            <View style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                ¿Ya tienes cuenta?
              </ThemedText>
              <ThemedText
                type="linkPrimary"
                accessibilityRole="link"
                onPress={() => router.replace('/login')}
              >
                Entrar
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
  field: {
    gap: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
});
