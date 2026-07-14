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
        {message ?? 'Something went wrong. Check that the API is reachable.'}
      </ThemedText>
    </View>
  );
}

export function EmptyView({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.center}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
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
});
