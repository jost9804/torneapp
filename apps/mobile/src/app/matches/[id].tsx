import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Team } from '@/lib/api';
import { useMatches, useRecordResult, useTeams } from '@/lib/queries';

function ScorerPicker({
  team,
  count,
  selected,
  onToggle,
}: {
  team: Team;
  count: number;
  selected: string[];
  onToggle: (playerId: string) => void;
}) {
  const theme = useTheme();
  if (count === 0 || team.players.length === 0) return null;
  return (
    <View style={styles.scorers}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {team.name} scorers ({selected.length}/{count})
      </ThemedText>
      <View style={styles.chips}>
        {team.players.map((player) => {
          const times = selected.filter((id) => id === player.id).length;
          return (
            <Pressable
              key={player.id}
              onPress={() => onToggle(player.id)}
              style={[
                styles.chip,
                { backgroundColor: times > 0 ? theme.accent : theme.backgroundElement },
              ]}
            >
              <ThemedText
                type="small"
                style={{ color: times > 0 ? theme.onAccent : theme.text }}
              >
                {player.number ? `${player.number} · ` : ''}
                {player.name}
                {times > 1 ? ` ×${times}` : ''}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MatchResultScreen() {
  const { id, tournamentId } = useLocalSearchParams<{
    id: string;
    tournamentId: string;
  }>();
  const matches = useMatches(tournamentId);
  const { data: teams } = useTeams(tournamentId);
  const recordResult = useRecordResult(tournamentId);

  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [homeScorers, setHomeScorers] = useState<string[]>([]);
  const [awayScorers, setAwayScorers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (matches.isPending) return <LoadingView />;
  if (matches.isError) return <ErrorView message={matches.error.message} />;

  const match = matches.data.find((m) => m.id === id);
  if (!match) return <ErrorView message="Match not found" />;

  const homeTeam = teams?.find((t) => t.id === match.homeTeam.id);
  const awayTeam = teams?.find((t) => t.id === match.awayTeam.id);

  const parsedHome = parseInt(homeScore, 10);
  const parsedAway = parseInt(awayScore, 10);
  const valid = !Number.isNaN(parsedHome) && !Number.isNaN(parsedAway);

  const makeToggle =
    (list: string[], set: (v: string[]) => void, max: number) =>
    (playerId: string) => {
      if (list.length >= max) {
        // At the limit: tapping a selected player removes one of their goals
        const index = list.indexOf(playerId);
        if (index >= 0) set(list.filter((_, i) => i !== index));
        return;
      }
      set([...list, playerId]);
    };

  const submit = async () => {
    setError(null);
    try {
      await recordResult.mutateAsync({
        matchId: match.id,
        homeScore: parsedHome,
        awayScore: parsedAway,
        goals: [
          ...homeScorers.map((playerId) => ({ playerId })),
          ...awayScorers.map((playerId) => ({ playerId })),
        ],
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({ pathname: '/tournaments/[id]', params: { id: tournamentId } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the result');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Round {match.round}
          </ThemedText>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeam}>
              <ThemedText type="smallBold" numberOfLines={2} style={styles.centered}>
                {match.homeTeam.name}
              </ThemedText>
              <TextField
                placeholder="0"
                value={homeScore}
                onChangeText={(value) => {
                  setHomeScore(value);
                  setHomeScorers([]);
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.scoreInput}
              />
            </View>
            <ThemedText type="subtitle" themeColor="textSecondary">
              –
            </ThemedText>
            <View style={styles.scoreTeam}>
              <ThemedText type="smallBold" numberOfLines={2} style={styles.centered}>
                {match.awayTeam.name}
              </ThemedText>
              <TextField
                placeholder="0"
                value={awayScore}
                onChangeText={(value) => {
                  setAwayScore(value);
                  setAwayScorers([]);
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.scoreInput}
              />
            </View>
          </View>
          {homeTeam && valid ? (
            <ScorerPicker
              team={homeTeam}
              count={parsedHome}
              selected={homeScorers}
              onToggle={makeToggle(homeScorers, setHomeScorers, parsedHome)}
            />
          ) : null}
          {awayTeam && valid ? (
            <ScorerPicker
              team={awayTeam}
              count={parsedAway}
              selected={awayScorers}
              onToggle={makeToggle(awayScorers, setAwayScorers, parsedAway)}
            />
          ) : null}
          {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
          <Button
            title="Save result"
            disabled={!valid}
            loading={recordResult.isPending}
            onPress={submit}
          />
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
    gap: Spacing.four,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  scoreTeam: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  scoreInput: {
    width: 64,
    textAlign: 'center',
    fontSize: 24,
  },
  centered: {
    textAlign: 'center',
  },
  scorers: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: 16,
  },
});
