import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ListRow } from '@/components/ui/list-row';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import { useTopScorers } from '@/lib/queries';

export function ScorersSection({ tournamentId }: { tournamentId: string }) {
  const { data, isPending, isError, error } = useTopScorers(tournamentId);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;
  if (data.length === 0) {
    return (
      <EmptyView title="Sin goles todavía" hint="Registra resultados para ver los goleadores." />
    );
  }

  return (
    <View>
      {data.map((scorer, index) => (
        <ListRow key={scorer.playerId}>
          <ThemedText
            type="stat"
            themeColor={index === 0 ? 'accentText' : 'textSecondary'}
            style={styles.position}
          >
            {index + 1}
          </ThemedText>
          <View style={styles.names}>
            <ThemedText type="smallBold">{scorer.playerName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {scorer.teamName}
            </ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.goals}>
            {scorer.goals}
          </ThemedText>
        </ListRow>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    width: 22,
    textAlign: 'center',
  },
  names: {
    flex: 1,
    gap: Spacing.half,
  },
  goals: {
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
