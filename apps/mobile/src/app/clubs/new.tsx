import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { VerifyEmailNotice } from '@/components/auth/verify-email-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ImageField } from '@/components/ui/image-field';
import { EmptyView, LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import type { PickedImage } from '@/lib/images';
import { useCreateClub } from '@/lib/queries';

export default function NewClubScreen() {
  const auth = useAuth();
  const [name, setName] = useState('');
  const [crest, setCrest] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createClub = useCreateClub();

  if (auth.status === 'loading') return <LoadingView />;
  if (auth.status === 'signedOut') {
    return (
      <ThemedView style={styles.signedOut}>
        <EmptyView
          title="Crea tu equipo"
          hint="Entra con tu cuenta para crear un equipo. Quedarás como su creador."
          action={<Button title="Entrar" onPress={() => router.push('/login')} />}
        />
      </ThemedView>
    );
  }

  const submit = async () => {
    if (!crest) return;
    setError(null);
    try {
      const club = await createClub.mutateAsync({ name: name.trim(), crest });
      router.replace({ pathname: '/clubs/[id]', params: { id: club.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el equipo');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <VerifyEmailNotice action="crear equipos" />
          <ThemedText themeColor="textSecondary">
            El equipo guarda su historial de torneos. Podrás nombrar hasta 2 administradores más y
            asignar técnico, vocero y capitán.
          </ThemedText>
          <ImageField
            label="Escudo"
            hint="Obligatorio. Se recorta en cuadrado."
            name={name}
            value={crest}
            onChange={setCrest}
          />
          <View style={styles.field}>
            <TextField
              label="Nombre del equipo"
              placeholder="Deportivo La Esperanza"
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Elígelo bien: el nombre solo se puede cambiar cada 6 meses.
            </ThemedText>
          </View>
          {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
          <Button
            title="Crear equipo"
            disabled={name.trim().length === 0 || !crest}
            loading={createClub.isPending}
            onPress={submit}
          />
        </View>
      </ScrollView>
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
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  signedOut: {
    flex: 1,
    padding: Spacing.three,
  },
});
