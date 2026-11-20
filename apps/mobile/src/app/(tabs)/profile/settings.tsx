import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Segmented } from '@/components/ui/segmented';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  type AppearancePreference,
  canChooseAppearance,
  loadAppearance,
  saveAppearance,
} from '@/lib/preferences';

function AppearanceSection() {
  const [preference, setPreference] = useState<AppearancePreference>('system');

  useEffect(() => {
    loadAppearance().then(setPreference);
  }, []);

  const choose = (value: AppearancePreference) => {
    setPreference(value);
    saveAppearance(value);
  };

  return (
    <View style={styles.section}>
      <ThemedText type="heading">Apariencia</ThemedText>
      <Segmented
        value={preference}
        onChange={choose}
        options={[
          { value: 'system', label: 'Automática' },
          { value: 'light', label: 'Clara' },
          { value: 'dark', label: 'Oscura' },
        ]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Automática sigue el modo del teléfono. La oscura descansa la vista en partidos de noche.
      </ThemedText>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.content}>
        {canChooseAppearance ? <AppearanceSection /> : null}
        <View style={styles.section}>
          <ThemedText type="heading">Acerca de</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            TorneApp {Constants.expoConfig?.version ?? ''} · Organiza torneos de fútbol aficionado:
            equipos, calendario, tabla y goleadores.
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
});
