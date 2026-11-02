import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function AccountScreen() {
  const auth = useAuth();

  if (auth.status !== 'signedIn') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText themeColor="textSecondary">No has iniciado sesión.</ThemedText>
          <Button title="Entrar" onPress={() => router.replace('/login')} />
        </View>
      </ThemedView>
    );
  }

  const signOut = async () => {
    await auth.signOut();
    if (router.canGoBack()) router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.identity}>
          <ThemedText type="subtitle">{auth.user.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{auth.user.email}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Tus roles se ven en cada torneo. Para cambiar de rol, pídelo al administrador del torneo.
        </ThemedText>
        <Button title="Cerrar sesión" variant="danger" onPress={signOut} />
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
  identity: {
    gap: Spacing.one,
  },
});
