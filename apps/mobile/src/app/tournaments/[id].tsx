import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { useTheme } from '@/hooks/use-theme';
import { api, type TournamentFormat } from '@/lib/api';
import { plural } from '@/lib/format';
import { useTournament } from '@/lib/queries';

type Section = 'teams' | 'fixture' | 'standings' | 'scorers';

const FORMAT_LABEL: Record<TournamentFormat, string> = {
  ROUND_ROBIN: 'Single round robin',
  ROUND_ROBIN_HOME_AWAY: 'Home and away',
};

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, isPending, isError, error } = useTournament(id);
  const [section, setSection] = useState<Section>('teams');

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  const fixtureGenerated = (data._count?.matches ?? 0) > 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: data.name,
          headerTitle: '',
          headerStyle: { backgroundColor: theme.brand },
          headerTintColor: theme.onBrand,
        }}
      />
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* The turf band continues the header so the tournament reads as one block */}
        <View style={[styles.band, { backgroundColor: theme.brand }]}>
          <View style={styles.bandContent}>
            <ThemedText type="title" themeColor="onBrand">
              {data.name}
            </ThemedText>
            <View style={styles.meta}>
              <ThemedText type="small" themeColor="onBrand">
                Football 11 · {plural(data._count?.teams ?? 0, 'team', 'teams')} ·{' '}
                {FORMAT_LABEL[data.format]}
              </ThemedText>
              {data.rulesPdfPath ? (
                <ThemedText
                  type="smallBold"
                  themeColor="onBrand"
                  style={styles.rulesLink}
                  accessibilityRole="link"
                  onPress={() => WebBrowser.openBrowserAsync(api.tournaments.rulesUrl(id))}
                >
                  Tournament rules (PDF)
                </ThemedText>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.content}>
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
  band: {
    paddingBottom: Spacing.four,
  },
  bandContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  meta: {
    gap: Spacing.one,
  },
  rulesLink: {
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});
