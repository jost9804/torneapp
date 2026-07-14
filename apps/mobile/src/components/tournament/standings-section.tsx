import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStandings } from '@/lib/queries';

const COLUMNS = ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'] as const;

export function StandingsSection({ tournamentId }: { tournamentId: string }) {
  const theme = useTheme();
  const { data, isPending, isError, error } = useStandings(tournamentId);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;
  if (data.length === 0) {
    return <EmptyView title="No standings yet" hint="Add teams to see the table." />;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.position}>
            #
          </ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.team}>
            Team
          </ThemedText>
          {COLUMNS.map((column) => (
            <ThemedText
              key={column}
              type="smallBold"
              themeColor="textSecondary"
              style={styles.stat}
            >
              {column}
            </ThemedText>
          ))}
        </View>
        {data.map((row, index) => (
          <View
            key={row.teamId}
            style={[styles.row, { borderColor: theme.border }]}
          >
            <ThemedText type="small" themeColor="textSecondary" style={styles.position}>
              {index + 1}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.team} numberOfLines={1}>
              {row.teamName}
            </ThemedText>
            <ThemedText type="small" style={styles.stat}>{row.played}</ThemedText>
            <ThemedText type="small" style={styles.stat}>{row.won}</ThemedText>
            <ThemedText type="small" style={styles.stat}>{row.drawn}</ThemedText>
            <ThemedText type="small" style={styles.stat}>{row.lost}</ThemedText>
            <ThemedText type="small" style={styles.stat}>{row.goalsFor}</ThemedText>
            <ThemedText type="small" style={styles.stat}>{row.goalsAgainst}</ThemedText>
            <ThemedText type="small" style={styles.stat}>
              {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="accent" style={styles.stat}>
              {row.points}
            </ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: 480,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  position: {
    width: 24,
    textAlign: 'center',
  },
  team: {
    flex: 1,
    minWidth: 140,
  },
  stat: {
    width: 34,
    textAlign: 'center',
  },
});
