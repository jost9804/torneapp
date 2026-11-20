import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ImageField } from '@/components/ui/image-field';
import { Segmented } from '@/components/ui/segmented';
import { EmptyView, LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { api, TournamentFormat } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { imageForm, type PickedImage } from '@/lib/images';
import { useCreateTournament } from '@/lib/queries';

export default function CreateTournamentScreen() {
  const auth = useAuth();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('ROUND_ROBIN');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rulesFile, setRulesFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createTournament = useCreateTournament();

  const pickRulesPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled) setRulesFile(result.assets[0]);
  };

  const submit = async () => {
    if (!image) return;
    setError(null);
    setUploading(true);
    try {
      const tournament = await createTournament.mutateAsync({
        name: name.trim(),
        format,
      });
      await api.tournaments.uploadImage(tournament.id, await imageForm(image));
      if (rulesFile) {
        const form = new FormData();
        if (Platform.OS === 'web' && rulesFile.file) {
          form.append('file', rulesFile.file);
        } else {
          form.append('file', {
            uri: rulesFile.uri,
            name: rulesFile.name ?? 'rules.pdf',
            type: 'application/pdf',
          } as unknown as Blob);
        }
        await api.tournaments.uploadRules(tournament.id, form);
      }
      // Leave the tab ready for the next one, then open the new tournament
      setName('');
      setFormat('ROUND_ROBIN');
      setRulesFile(null);
      setImage(null);
      router.push({ pathname: '/tournaments/[id]', params: { id: tournament.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el torneo');
    } finally {
      setUploading(false);
    }
  };

  if (auth.status === 'loading') return <LoadingView />;
  if (auth.status === 'signedOut') {
    return (
      <ThemedView style={styles.signedOut}>
        <EmptyView
          title="Crea tu torneo"
          hint="Entra con tu cuenta para crear un torneo. Quedarás como su administrador."
          action={<Button title="Entrar" onPress={() => router.push('/login')} />}
        />
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <TextField
          label="Nombre del torneo"
          placeholder="Torneo Municipal 2026"
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <ImageField
          label="Imagen del torneo"
          hint="Obligatoria. El logo o una foto que lo identifique; se recorta en cuadrado."
          name={name}
          value={image}
          onChange={setImage}
        />
        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Formato
          </ThemedText>
          <Segmented
            value={format}
            onChange={setFormat}
            options={[
              { value: 'ROUND_ROBIN', label: 'Todos contra todos' },
              { value: 'ROUND_ROBIN_HOME_AWAY', label: 'Ida y vuelta' },
            ]}
          />
        </View>
        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Reglamento (PDF, opcional)
          </ThemedText>
          <Button
            title={rulesFile ? (rulesFile.name ?? 'PDF seleccionado') : 'Adjuntar reglamento'}
            variant="secondary"
            onPress={pickRulesPdf}
          />
        </View>
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button
          title="Crear torneo"
          onPress={submit}
          disabled={name.trim().length === 0 || !image}
          loading={uploading}
        />
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            ¿Diriges un equipo? Créalo para inscribirlo en torneos y guardar su historial.
          </ThemedText>
          <Button
            title="Crear equipo"
            variant="secondary"
            onPress={() => router.push('/clubs/new')}
          />
        </View>
      </View>
    </ScrollView>
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
