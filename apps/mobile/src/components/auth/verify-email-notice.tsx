import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

/** Shown where an unconfirmed account can't act yet; renders nothing once confirmed. */
export function VerifyEmailNotice({ action }: { action: string }) {
  const auth = useAuth();
  const theme = useTheme();
  if (auth.status !== 'signedIn' || auth.user.emailVerifiedAt) return null;
  return (
    <View
      style={[styles.box, { backgroundColor: theme.backgroundElement, borderColor: theme.caution }]}
    >
      <ThemedText type="smallBold">Confirma tu correo</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Para {action} necesitas confirmar {auth.user.email} con el código que te enviamos.
      </ThemedText>
      <Button title="Ingresar código" onPress={() => router.push('/verify-email')} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
});
