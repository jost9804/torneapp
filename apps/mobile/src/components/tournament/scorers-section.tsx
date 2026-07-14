import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTopScorers } from '@/lib/queries';

export function ScorersSection({ tournamentId }: { tournamentId: string }) {
  const theme = useTheme();
  const { data, isPending, isError, error } = useTopScorers(tournamentId);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;
  if (data.length === 0) {
    return (
      <EmptyView title="No goals yet" hint="Record match results to see top scorers." />
    );
  }

  return (
    <View style={styles.section}>
      {data.map((scorer, index) => (
        <View
          key={scorer.playerId}
          style={[styles.row, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.position}>
            {index + 1}
          </ThemedText>
          <View style={styles.names}>
            <ThemedText type="smallBold">{scorer.playerName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {scorer.teamName}
            </ThemedText>
          </View>
          <ThemedText type="subtitle" themeColor="accent" style={styles.goals}>
            {scorer.goals}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  position: {
    width: 24,
    textAlign: 'center',
  },
  names: {
    flex: 1,
  },
  goals: {
    fontSize: 24,
    lineHeight: 28,
  },
});
