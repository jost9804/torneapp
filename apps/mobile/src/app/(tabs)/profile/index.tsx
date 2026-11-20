import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FontFamily, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import type { User } from '@/lib/api';

const AVATAR_SIZE = 88;

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

function Avatar({ user }: { user: User }) {
  const theme = useTheme();
  if (user.avatarUrl) {
    return (
      <Image
        source={user.avatarUrl}
        style={styles.avatar}
        contentFit="cover"
        accessibilityLabel={`Foto de ${user.name}`}
      />
    );
  }
  return (
    <View style={[styles.avatar, { backgroundColor: theme.brand }]} accessible={false}>
      <ThemedText style={[styles.initials, { color: theme.onBrand }]}>
        {initials(user.name)}
      </ThemedText>
    </View>
  );
}

/** Asks before signing out; browsers have no native alert with buttons. */
function confirmSignOut(signOut: () => Promise<void>) {
  if (Platform.OS === 'web') {
    if (window.confirm('¿Cerrar sesión en este dispositivo?')) signOut();
    return;
  }
  Alert.alert('Cerrar sesión', '¿Cerrar sesión en este dispositivo?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() },
  ]);
}

export default function ProfileScreen() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (auth.status === 'signedOut') {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <View style={styles.section}>
            <ThemedText type="heading">Sin sesión</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Entra para seguir torneos, darles me gusta, crear los tuyos y unirte como árbitro,
              técnico o jugador.
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
        </View>
      </ScrollView>
    );
  }

  const { user, signOut } = auth;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.content}>
        <View style={styles.identity}>
          <Avatar user={user} />
          <View style={styles.names}>
            <ThemedText type="subtitle" style={styles.centerText}>
              {user.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              {user.email}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Tus roles se ven en cada torneo. Para cambiar de rol, pídelo al administrador del torneo.
        </ThemedText>
        <Button title="Cerrar sesión" variant="danger" onPress={() => confirmSignOut(signOut)} />
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
    gap: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  names: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  centerText: {
    textAlign: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: FontFamily.display,
    fontSize: 36,
    lineHeight: 40,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
