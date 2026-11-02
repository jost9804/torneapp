import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  type AppearancePreference,
  canChooseAppearance,
  loadAppearance,
  saveAppearance,
} from '@/lib/preferences';

function AccountSection() {
  const auth = useAuth();

  if (auth.status !== 'signedIn') {
    return (
      <View style={styles.section}>
        <ThemedText type="heading">Cuenta</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Entra para seguir torneos, darles me gusta, crear los tuyos y unirte como árbitro, técnico
          o jugador.
        </ThemedText>
        <View style={styles.buttons}>
          <Button
            title="Crear cuenta"
            variant="secondary"
            onPress={() => router.push('/register')}
            style={styles.flex}
          />
          <Button title="Entrar" onPress={() => router.push('/login')} style={styles.flex} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText type="heading">Cuenta</ThemedText>
      <View style={styles.identity}>
        <ThemedText type="smallBold">{auth.user.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {auth.user.email}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Tus roles se ven en cada torneo. Para cambiar de rol, pídelo al administrador del torneo.
      </ThemedText>
      <Button title="Cerrar sesión" variant="danger" onPress={auth.signOut} />
    </View>
  );
}

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
        <AccountSection />
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
  identity: {
    gap: Spacing.half,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
