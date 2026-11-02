import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Player, PlayerRequest, Team } from '@/lib/api';
import { plural } from '@/lib/format';
import {
  useCreatePlayer,
  useCreateTeam,
  usePlayerRequests,
  useReviewPlayerRequest,
  useTeams,
  useUpdatePlayer,
} from '@/lib/queries';

const parseNumber = (value: string) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Admins add straight to the roster; a coach's entry waits for the admin. */
function AddPlayerForm({
  team,
  tournamentId,
  needsApproval,
}: {
  team: Team;
  tournamentId: string;
  needsApproval: boolean;
}) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const createPlayer = useCreatePlayer(tournamentId);

  const submit = async () => {
    setMessage(null);
    try {
      const result = await createPlayer.mutateAsync({
        teamId: team.id,
        name: name.trim(),
        number: parseNumber(number),
      });
      setName('');
      setNumber('');
      if (result.status === 'PENDING') {
        setMessage({ text: 'Enviado al administrador para su aprobación.', error: false });
      }
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : 'No se pudo agregar el jugador',
        error: true,
      });
    }
  };

  return (
    <View style={styles.formBlock}>
      <View style={styles.addPlayerRow}>
        <View style={styles.addPlayerName}>
          <TextField placeholder="Nombre del jugador" value={name} onChangeText={setName} />
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
          title={needsApproval ? 'Proponer' : 'Agregar'}
          variant="secondary"
          disabled={name.trim().length === 0}
          loading={createPlayer.isPending}
          onPress={submit}
        />
      </View>
      {message ? (
        <ThemedText type="small" themeColor={message.error ? 'danger' : 'textSecondary'}>
          {message.text}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** A player linked to this account edits their own number and position. */
function OwnPlayerEditor({ player, tournamentId }: { player: Player; tournamentId: string }) {
  const [number, setNumber] = useState(player.number?.toString() ?? '');
  const [position, setPosition] = useState(player.position ?? '');
  const [error, setError] = useState<string | null>(null);
  const updatePlayer = useUpdatePlayer(tournamentId);

  const save = async () => {
    setError(null);
    try {
      await updatePlayer.mutateAsync({
        id: player.id,
        number: parseNumber(number),
        position: position.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  };

  return (
    <View style={styles.formBlock}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Tu perfil de jugador
      </ThemedText>
      <View style={styles.addPlayerRow}>
        <View style={styles.addPlayerNumber}>
          <TextField
            placeholder="#"
            value={number}
            onChangeText={setNumber}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.addPlayerName}>
          <TextField
            placeholder="Posición (ej. Delantero)"
            value={position}
            onChangeText={setPosition}
            maxLength={30}
          />
        </View>
        <Button
          title="Guardar"
          variant="secondary"
          loading={updatePlayer.isPending}
          onPress={save}
        />
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

function PendingPlayers({
  requests,
  tournamentId,
  canReview,
}: {
  requests: PlayerRequest[];
  tournamentId: string;
  canReview: boolean;
}) {
  const review = useReviewPlayerRequest(tournamentId);
  const pending = requests.filter((r) => r.status === 'PENDING');
  if (pending.length === 0) return null;

  return (
    <View style={styles.formBlock}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Esperan aprobación
      </ThemedText>
      {pending.map((request) => (
        <View key={request.id} style={styles.playerRow}>
          <ThemedText type="stat" themeColor="textSecondary" style={styles.playerNumber}>
            {request.number ?? '–'}
          </ThemedText>
          <View style={styles.playerName}>
            <ThemedText type="small">{request.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Propuesto por {request.requestedBy.name}
            </ThemedText>
          </View>
          {canReview ? (
            <View style={styles.reviewButtons}>
              <Button
                title="Rechazar"
                variant="secondary"
                disabled={review.isPending}
                onPress={() => review.mutate({ id: request.id, decision: 'REJECTED' })}
              />
              <Button
                title="Aprobar"
                disabled={review.isPending}
                onPress={() => review.mutate({ id: request.id, decision: 'APPROVED' })}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function TeamRow({
  team,
  tournamentId,
  isAdmin,
  isCoach,
  playerIds,
  requests,
}: {
  team: Team;
  tournamentId: string;
  isAdmin: boolean;
  isCoach: boolean;
  playerIds: (string | null)[];
  requests: PlayerRequest[];
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const ownPlayer = team.players.find((player) => playerIds.includes(player.id));
  const teamRequests = requests.filter((r) => r.team.id === team.id);

  return (
    <View>
      <ListRow
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <ThemedText type="heading" style={styles.teamName} numberOfLines={1}>
          {team.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {plural(team.players.length, 'jugador', 'jugadores')} {expanded ? '▲' : '▼'}
        </ThemedText>
      </ListRow>
      {expanded ? (
        <View style={[styles.players, { borderColor: theme.border }]}>
          {team.players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <ThemedText type="stat" themeColor="textSecondary" style={styles.playerNumber}>
                {player.number ?? '–'}
              </ThemedText>
              <ThemedText type="small" style={styles.playerName}>
                {player.name}
                {player.id === ownPlayer?.id ? ' (tú)' : ''}
              </ThemedText>
              {player.position ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {player.position}
                </ThemedText>
              ) : null}
            </View>
          ))}
          {team.players.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Sin jugadores todavía.
            </ThemedText>
          ) : null}
          <PendingPlayers requests={teamRequests} tournamentId={tournamentId} canReview={isAdmin} />
          {isAdmin || isCoach ? (
            <AddPlayerForm team={team} tournamentId={tournamentId} needsApproval={!isAdmin} />
          ) : null}
          {ownPlayer ? <OwnPlayerEditor player={ownPlayer} tournamentId={tournamentId} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export function TeamsSection({
  tournamentId,
  fixtureGenerated,
  isAdmin,
  coachTeamIds,
  playerIds,
}: {
  tournamentId: string;
  fixtureGenerated: boolean;
  isAdmin: boolean;
  coachTeamIds: (string | null)[];
  playerIds: (string | null)[];
}) {
  const { data, isPending, isError, error } = useTeams(tournamentId);
  const requests = usePlayerRequests(tournamentId, isAdmin || coachTeamIds.length > 0);
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
      setFormError(e instanceof Error ? e.message : 'No se pudo agregar el equipo');
    }
  };

  const pendingCount = (requests.data ?? []).filter((r) => r.status === 'PENDING').length;

  return (
    <View style={styles.section}>
      {isAdmin && !fixtureGenerated ? (
        <View style={styles.addTeamRow}>
          <View style={styles.addTeamField}>
            <TextField
              placeholder="Nombre del equipo"
              value={teamName}
              onChangeText={setTeamName}
              maxLength={60}
            />
          </View>
          <Button
            title="Agregar equipo"
            disabled={teamName.trim().length === 0}
            loading={createTeam.isPending}
            onPress={addTeam}
          />
        </View>
      ) : null}
      {formError ? <ThemedText themeColor="danger">{formError}</ThemedText> : null}
      {isAdmin && pendingCount > 0 ? (
        <ThemedText type="smallBold" themeColor="accentText">
          {plural(pendingCount, 'jugador espera', 'jugadores esperan')} tu aprobación. Abre el
          equipo para revisarlos.
        </ThemedText>
      ) : null}
      {data.length === 0 ? (
        <EmptyView
          title="Sin equipos todavía"
          hint={
            isAdmin
              ? 'Agrega al menos 2 equipos para generar el calendario.'
              : 'El administrador todavía no ha agregado equipos.'
          }
        />
      ) : (
        <View>
          {data.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              tournamentId={tournamentId}
              isAdmin={isAdmin}
              isCoach={coachTeamIds.includes(team.id)}
              playerIds={playerIds}
              requests={requests.data ?? []}
            />
          ))}
        </View>
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
  teamName: {
    flex: 1,
  },
  players: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: 1,
  },
  playerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  playerNumber: {
    width: 28,
    textAlign: 'right',
  },
  playerName: {
    flex: 1,
  },
  formBlock: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  addPlayerName: {
    flex: 1,
  },
  addPlayerNumber: {
    width: 56,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
});
