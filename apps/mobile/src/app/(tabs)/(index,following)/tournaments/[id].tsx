import * as WebBrowser from 'expo-web-browser';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FixtureSection } from '@/components/tournament/fixture-section';
import { ScorersSection } from '@/components/tournament/scorers-section';
import { StandingsSection } from '@/components/tournament/standings-section';
import { TeamsSection } from '@/components/tournament/teams-section';
import { Segmented } from '@/components/ui/segmented';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, type TournamentFormat } from '@/lib/api';
import { tournamentAccess, useRequireAuth } from '@/lib/auth';
import { plural, ROLE_LABEL } from '@/lib/format';
import { useTournament, useTournamentReaction } from '@/lib/queries';

type Section = 'teams' | 'fixture' | 'standings' | 'scorers';

const FORMAT_LABEL: Record<TournamentFormat, string> = {
  ROUND_ROBIN: 'Todos contra todos',
  ROUND_ROBIN_HOME_AWAY: 'Ida y vuelta',
};

/** Outlined pill on the turf band; filled when the action is on (liked, following). */
function BandAction({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { borderColor: theme.onBrand },
        active && { backgroundColor: theme.onBrand },
        pressed && { opacity: 0.7 },
      ]}
    >
      <ThemedText type="smallBold" style={{ color: active ? theme.brand : theme.onBrand }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, isPending, isError, error } = useTournament(id);
  const [section, setSection] = useState<Section>('teams');
  const reaction = useTournamentReaction(id);
  const requireAuth = useRequireAuth();

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  const fixtureGenerated = (data._count?.matches ?? 0) > 0;
  const access = tournamentAccess(data);
  const liked = data.viewer?.liked ?? false;
  const followed = data.viewer?.followed ?? false;
  const activeRoles = access.memberships
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => ROLE_LABEL[m.role]);
  const roleLine =
    activeRoles.length > 0
      ? `Eres ${activeRoles.join(' y ').toLowerCase()}`
      : access.pending.length > 0
        ? 'Tu solicitud espera aprobación'
        : null;

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
                Fútbol 11 · {plural(data._count?.teams ?? 0, 'equipo', 'equipos')} ·{' '}
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
                  Reglamento (PDF)
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.actions}>
              <BandAction
                label={`Me gusta · ${data._count?.likes ?? 0}`}
                active={liked}
                onPress={() => requireAuth(() => reaction.like.mutate(!liked))}
              />
              <BandAction
                label={followed ? 'Siguiendo' : 'Seguir'}
                active={followed}
                onPress={() => requireAuth(() => reaction.follow.mutate(!followed))}
              />
              {access.memberships.length === 0 ? (
                <BandAction
                  label="Unirme"
                  onPress={() =>
                    requireAuth(() => router.push({ pathname: '/join/[id]', params: { id } }))
                  }
                />
              ) : null}
              <BandAction
                label={access.isAdmin ? 'Gestionar miembros' : 'Miembros'}
                onPress={() => router.push({ pathname: '/members/[id]', params: { id } })}
              />
            </View>
            {roleLine ? (
              <ThemedText type="small" themeColor="onBrand">
                {roleLine}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.content}>
          <Segmented
            value={section}
            onChange={setSection}
            options={[
              { value: 'teams', label: 'Equipos' },
              { value: 'fixture', label: 'Calendario' },
              { value: 'standings', label: 'Tabla' },
              { value: 'scorers', label: 'Goleadores' },
            ]}
          />
          {section === 'teams' ? (
            <TeamsSection
              tournamentId={id}
              fixtureGenerated={fixtureGenerated}
              isAdmin={access.isAdmin}
              coachTeamIds={access.coachTeamIds}
              playerIds={access.playerIds}
            />
          ) : null}
          {section === 'fixture' ? (
            <FixtureSection
              tournamentId={id}
              teamCount={data._count?.teams ?? 0}
              isAdmin={access.isAdmin}
            />
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  action: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    minHeight: 36,
    justifyContent: 'center',
  },
  rulesLink: {
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});
