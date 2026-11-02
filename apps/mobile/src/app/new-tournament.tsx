import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { api, TournamentFormat } from '@/lib/api';
import { useCreateTournament } from '@/lib/queries';

export default function NewTournamentScreen() {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('ROUND_ROBIN');
  const [rulesFile, setRulesFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
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
    setError(null);
    try {
      const tournament = await createTournament.mutateAsync({
        name: name.trim(),
        format,
      });
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
      if (router.canDismiss()) router.dismiss();
      router.push({ pathname: '/tournaments/[id]', params: { id: tournament.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el torneo');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <TextField
          label="Nombre del torneo"
          placeholder="Torneo Municipal 2026"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={80}
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
          disabled={name.trim().length === 0}
          loading={createTournament.isPending}
        />
      </View>
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
});
