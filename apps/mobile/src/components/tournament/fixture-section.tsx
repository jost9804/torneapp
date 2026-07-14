import { Link } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Match } from '@/lib/api';
import { useGenerateFixture, useMatches } from '@/lib/queries';

function MatchRow({ match, tournamentId }: { match: Match; tournamentId: string }) {
  const theme = useTheme();
  const played = match.status === 'PLAYED';
  return (
    <Link
      href={{ pathname: '/matches/[id]', params: { id: match.id, tournamentId } }}
      asChild
    >
      <Pressable
        style={StyleSheet.flatten([
          styles.matchRow,
          { backgroundColor: theme.backgroundElement },
        ])}
      >
        <ThemedText type="small" style={styles.teamName} numberOfLines={1}>
          {match.homeTeam.name}
        </ThemedText>
        <ThemedText type="smallBold" themeColor={played ? 'text' : 'textSecondary'}>
          {played ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
        </ThemedText>
        <ThemedText type="small" style={[styles.teamName, styles.awayName]} numberOfLines={1}>
          {match.awayTeam.name}
        </ThemedText>
      </Pressable>
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
        <Fragment key={round}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Round {round}
          </ThemedText>
          {data
            .filter((match) => match.round === round)
            .map((match) => (
              <MatchRow key={match.id} match={match} tournamentId={tournamentId} />
            ))}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  emptyWrapper: {
    gap: Spacing.three,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  teamName: {
    flex: 1,
  },
  awayName: {
    textAlign: 'right',
  },
});
