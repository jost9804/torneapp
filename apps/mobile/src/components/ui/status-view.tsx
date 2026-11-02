import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function LoadingView() {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.accent} size="large" />
    </View>
  );
}

export function ErrorView({ message }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ThemedText themeColor="danger">
        {message ?? 'No se pudo cargar. Revisa la conexión e inténtalo de nuevo.'}
      </ThemedText>
    </View>
  );
}

/** `action` sits right under the message so it never drifts behind a tab bar. */
export function EmptyView({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.one,
  },
  hint: {
    textAlign: 'center',
  },
  action: {
    maxWidth: 360,
    width: '100%',
    marginTop: Spacing.three,
  },
});
