import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Team } from '@/lib/api';
import { useCreatePlayer, useCreateTeam, useTeams } from '@/lib/queries';

function AddPlayerForm({ team, tournamentId }: { team: Team; tournamentId: string }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const createPlayer = useCreatePlayer(tournamentId);

  const submit = async () => {
    const parsedNumber = parseInt(number, 10);
    await createPlayer.mutateAsync({
      teamId: team.id,
      name: name.trim(),
      number: Number.isNaN(parsedNumber) ? undefined : parsedNumber,
    });
    setName('');
    setNumber('');
  };

  return (
    <View style={styles.addPlayerRow}>
      <View style={styles.addPlayerName}>
        <TextField placeholder="Player name" value={name} onChangeText={setName} />
      </View>
      <View style={styles.addPlayerNumber}>
        <TextField
          placeholder="#"
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>
      <Button
        title="Add"
        variant="secondary"
        disabled={name.trim().length === 0}
        loading={createPlayer.isPending}
        onPress={submit}
      />
    </View>
  );
}

function TeamCard({
  team,
  tournamentId,
  canEdit,
}: {
  team: Team;
  tournamentId: string;
  canEdit: boolean;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{team.name}</ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          onPress={() => setExpanded((value) => !value)}
        >
          {team.players.length} players {expanded ? '▲' : '▼'}
        </ThemedText>
      </View>
      {expanded ? (
        <View style={styles.players}>
          {team.players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.playerNumber}>
                {player.number ?? '–'}
              </ThemedText>
              <ThemedText type="small">{player.name}</ThemedText>
              {player.position ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {player.position}
                </ThemedText>
              ) : null}
            </View>
          ))}
          {team.players.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No players yet.
            </ThemedText>
          ) : null}
          {canEdit ? <AddPlayerForm team={team} tournamentId={tournamentId} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export function TeamsSection({
  tournamentId,
  fixtureGenerated,
}: {
  tournamentId: string;
  fixtureGenerated: boolean;
}) {
  const { data, isPending, isError, error } = useTeams(tournamentId);
  const [teamName, setTeamName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const createTeam = useCreateTeam(tournamentId);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  const addTeam = async () => {
    setFormError(null);
    try {
      await createTeam.mutateAsync({ name: teamName.trim() });
      setTeamName('');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not add the team');
    }
  };

  return (
    <View style={styles.section}>
      {!fixtureGenerated ? (
        <View style={styles.addTeamRow}>
          <View style={styles.addTeamField}>
            <TextField
              placeholder="Team name"
              value={teamName}
              onChangeText={setTeamName}
              maxLength={60}
            />
          </View>
          <Button
            title="Add team"
            disabled={teamName.trim().length === 0}
            loading={createTeam.isPending}
            onPress={addTeam}
          />
        </View>
      ) : null}
      {formError ? <ThemedText themeColor="danger">{formError}</ThemedText> : null}
      {data.length === 0 ? (
        <EmptyView title="No teams yet" hint="Add at least 2 teams to generate a fixture." />
      ) : (
        data.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            tournamentId={tournamentId}
            canEdit={!fixtureGenerated}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  addTeamRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  addTeamField: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  players: {
    gap: Spacing.one,
  },
  playerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  playerNumber: {
    width: 24,
    textAlign: 'right',
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end',
    marginTop: Spacing.one,
  },
  addPlayerName: {
    flex: 1,
  },
  addPlayerNumber: {
    width: 56,
  },
});
