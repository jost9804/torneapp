import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FixtureSection } from '@/components/tournament/fixture-section';
import { ScorersSection } from '@/components/tournament/scorers-section';
import { StandingsSection } from '@/components/tournament/standings-section';
import { TeamsSection } from '@/components/tournament/teams-section';
import { Segmented } from '@/components/ui/segmented';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useTournament } from '@/lib/queries';

type Section = 'teams' | 'fixture' | 'standings' | 'scorers';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = useTournament(id);
  const [section, setSection] = useState<Section>('teams');

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  const fixtureGenerated = (data._count?.matches ?? 0) > 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: data.name }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              Football 11 · {data._count?.teams ?? 0} teams
            </ThemedText>
            {data.rulesPdfPath ? (
              <ThemedText
                type="smallBold"
                themeColor="accent"
                onPress={() => WebBrowser.openBrowserAsync(api.tournaments.rulesUrl(id))}
              >
                View rules (PDF)
              </ThemedText>
            ) : null}
          </View>
          <Segmented
            value={section}
            onChange={setSection}
            options={[
              { value: 'teams', label: 'Teams' },
              { value: 'fixture', label: 'Fixture' },
              { value: 'standings', label: 'Standings' },
              { value: 'scorers', label: 'Top scorers' },
            ]}
          />
          {section === 'teams' ? (
            <TeamsSection tournamentId={id} fixtureGenerated={fixtureGenerated} />
          ) : null}
          {section === 'fixture' ? (
            <FixtureSection tournamentId={id} teamCount={data._count?.teams ?? 0} />
          ) : null}
          {section === 'standings' ? <StandingsSection tournamentId={id} /> : null}
          {section === 'scorers' ? <ScorersSection tournamentId={id} /> : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
