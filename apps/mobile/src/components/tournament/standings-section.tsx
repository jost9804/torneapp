import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StandingsRow } from '@/lib/api';
import { useStandings } from '@/lib/queries';

type Column = { label: string; value: (row: StandingsRow) => string | number };

const signed = (value: number) =>
  value > 0 ? `+${value}` : value < 0 ? `\u2212${Math.abs(value)}` : '0';

const PLAYED: Column = { label: 'PJ', value: (row) => row.played };
const GOAL_DIFF: Column = { label: 'DG', value: (row) => signed(row.goalDifference) };

/** Phones get the columns people check at the pitch; wider screens get the full sheet. */
const COMPACT_COLUMNS: Column[] = [PLAYED, GOAL_DIFF];
const FULL_COLUMNS: Column[] = [
  PLAYED,
  { label: 'G', value: (row) => row.won },
  { label: 'E', value: (row) => row.drawn },
  { label: 'P', value: (row) => row.lost },
  { label: 'GF', value: (row) => row.goalsFor },
  { label: 'GC', value: (row) => row.goalsAgainst },
  GOAL_DIFF,
];

const FULL_TABLE_MIN_WIDTH = 520;

export function StandingsSection({ tournamentId }: { tournamentId: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { data, isPending, isError, error } = useStandings(tournamentId);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;
  if (data.length === 0) {
    return <EmptyView title="Sin posiciones todavía" hint="Agrega equipos para ver la tabla." />;
  }

  const columns = width >= FULL_TABLE_MIN_WIDTH ? FULL_COLUMNS : COMPACT_COLUMNS;

  return (
    <View>
      <View style={[styles.row, styles.headerRow, { borderColor: theme.text }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.position}>
          #
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.team}>
          Equipo
        </ThemedText>
        {columns.map((column) => (
          <ThemedText
            key={column.label}
            type="small"
            themeColor="textSecondary"
            style={styles.stat}
          >
            {column.label}
          </ThemedText>
        ))}
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.points}>
          Pts
        </ThemedText>
      </View>
      {data.map((row, index) => (
        <View key={row.teamId} style={[styles.row, { borderColor: theme.border }]}>
          <ThemedText
            type="stat"
            themeColor={index === 0 ? 'accentText' : 'textSecondary'}
            style={styles.position}
          >
            {index + 1}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.team} numberOfLines={1}>
            {row.teamName}
          </ThemedText>
          {columns.map((column) => (
            <ThemedText key={column.label} type="small" style={styles.stat}>
              {column.value(row)}
            </ThemedText>
          ))}
          <ThemedText type="stat" style={styles.points}>
            {row.points}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  headerRow: {
    borderBottomWidth: 2,
    paddingVertical: Spacing.two,
  },
  position: {
    width: 22,
    textAlign: 'center',
  },
  team: {
    flex: 1,
  },
  stat: {
    width: 30,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  points: {
    width: 36,
    textAlign: 'right',
  },
});
