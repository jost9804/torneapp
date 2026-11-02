import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import type { Match } from '@/lib/api';
import { useGenerateFixture, useMatches } from '@/lib/queries';

function MatchRow({ match, tournamentId }: { match: Match; tournamentId: string }) {
  const played = match.status === 'PLAYED';
  return (
    <Link
      href={{ pathname: '/matches/[id]', params: { id: match.id, tournamentId } }}
      asChild
    >
      <ListRow
        accessibilityLabel={
          played
            ? `${match.homeTeam.name} ${match.homeScore}, ${match.awayTeam.name} ${match.awayScore}`
            : `${match.homeTeam.name} versus ${match.awayTeam.name}, record result`
        }
      >
        <ThemedText type="smallBold" style={styles.teamName} numberOfLines={2}>
          {match.homeTeam.name}
        </ThemedText>
        {played ? (
          <ThemedText type="heading" style={styles.score}>
            {match.homeScore} – {match.awayScore}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.score}>
            vs
          </ThemedText>
        )}
        <ThemedText
          type="smallBold"
          style={[styles.teamName, styles.awayName]}
          numberOfLines={2}
        >
          {match.awayTeam.name}
        </ThemedText>
      </ListRow>
    </Link>
  );
}

export function FixtureSection({
  tournamentId,
  teamCount,
}: {
  tournamentId: string;
  teamCount: number;
}) {
  const { data, isPending, isError, error } = useMatches(tournamentId);
  const generateFixture = useGenerateFixture(tournamentId);
  const [generateError, setGenerateError] = useState<string | null>(null);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  if (data.length === 0) {
    const generate = async () => {
      setGenerateError(null);
      try {
        await generateFixture.mutateAsync();
      } catch (e) {
        setGenerateError(e instanceof Error ? e.message : 'Could not generate the fixture');
      }
    };
    return (
      <View style={styles.emptyWrapper}>
        <EmptyView
          title="No fixture yet"
          hint={
            teamCount < 2
              ? 'Add at least 2 teams first.'
              : `Generate the calendar for ${teamCount} teams.`
          }
        />
        {generateError ? <ThemedText themeColor="danger">{generateError}</ThemedText> : null}
        <Button
          title="Generate fixture"
          disabled={teamCount < 2}
          loading={generateFixture.isPending}
          onPress={generate}
        />
      </View>
    );
  }

  const rounds = [...new Set(data.map((match) => match.round))].sort((a, b) => a - b);

  return (
    <View style={styles.section}>
      {rounds.map((round) => (
        <View key={round}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.round}>
            Round {round}
          </ThemedText>
          {data
            .filter((match) => match.round === round)
            .map((match) => (
              <MatchRow key={match.id} match={match} tournamentId={tournamentId} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.four,
  },
  round: {
    paddingBottom: Spacing.one,
  },
  emptyWrapper: {
    gap: Spacing.three,
  },
  score: {
    minWidth: 56,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  teamName: {
    flex: 1,
  },
  awayName: {
    textAlign: 'right',
  },
});
