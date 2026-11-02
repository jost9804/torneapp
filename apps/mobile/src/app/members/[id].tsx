import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Segmented } from '@/components/ui/segmented';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { TeamPicker } from '@/components/ui/team-picker';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Membership, Role, Team } from '@/lib/api';
import { tournamentAccess, useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/format';
import {
  useApproveMember,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useTeams,
  useTournament,
} from '@/lib/queries';

const ROLE_ORDER: Role[] = ['ADMIN', 'REFEREE', 'COACH', 'PLAYER'];

function memberLine(member: Membership, lowercaseRole = false) {
  const role = ROLE_LABEL[member.role];
  return [lowercaseRole ? role.toLowerCase() : role, member.team?.name, member.player?.name]
    .filter(Boolean)
    .join(' · ');
}

/** Approving a player can link them to their roster entry so they can edit it. */
function PendingRow({
  member,
  teams,
  tournamentId,
}: {
  member: Membership;
  teams: Team[];
  tournamentId: string;
}) {
  const approve = useApproveMember(tournamentId);
  const remove = useRemoveMember(tournamentId);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roster =
    member.role === 'PLAYER' ? (teams.find((t) => t.id === member.team?.id)?.players ?? []) : [];

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar');
    }
  };

  return (
    <View style={styles.pending}>
      <View style={styles.memberText}>
        <ThemedText type="smallBold">{member.user.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Pide ser {memberLine(member, true)}
          {member.user.email ? ` · ${member.user.email}` : ''}
        </ThemedText>
      </View>
      {roster.length > 0 ? (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            ¿Quién es en la plantilla? (opcional)
          </ThemedText>
          <TeamPicker teams={roster} value={playerId} onChange={setPlayerId} />
        </View>
      ) : null}
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <View style={styles.buttons}>
        <Button
          title="Rechazar"
          variant="secondary"
          disabled={approve.isPending || remove.isPending}
          onPress={() => run(() => remove.mutateAsync(member.id))}
          style={styles.flex}
        />
        <Button
          title="Aprobar"
          loading={approve.isPending}
          disabled={remove.isPending}
          onPress={() =>
            run(() => approve.mutateAsync({ id: member.id, playerId: playerId ?? undefined }))
          }
          style={styles.flex}
        />
      </View>
    </View>
  );
}

function InviteForm({ teams, tournamentId }: { teams: Team[]; tournamentId: string }) {
  const invite = useInviteMember(tournamentId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('REFEREE');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const needsTeam = role === 'COACH' || role === 'PLAYER';

  const submit = async () => {
    setMessage(null);
    try {
      const member = await invite.mutateAsync({
        email: email.trim(),
        role,
        teamId: needsTeam ? (teamId ?? undefined) : undefined,
      });
      setEmail('');
      setMessage({
        text: `${member.user.name} ya es ${ROLE_LABEL[role].toLowerCase()}.`,
        error: false,
      });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'No se pudo invitar', error: true });
    }
  };

  return (
    <View style={styles.section}>
      <ThemedText type="heading">Agregar a alguien</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        La persona necesita una cuenta en TorneApp. Queda con el rol de inmediato.
      </ThemedText>
      <TextField
        label="Correo de su cuenta"
        placeholder="arbitro@correo.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Segmented
        value={role}
        onChange={setRole}
        options={ROLE_ORDER.map((value) => ({ value, label: ROLE_LABEL[value] }))}
      />
      {needsTeam ? (
        teams.length > 0 ? (
          <TeamPicker teams={teams} value={teamId} onChange={setTeamId} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Agrega equipos primero para asignar técnicos y jugadores.
          </ThemedText>
        )
      ) : null}
      {message ? (
        <ThemedText type="small" themeColor={message.error ? 'danger' : 'textSecondary'}>
          {message.text}
        </ThemedText>
      ) : null}
      <Button
        title="Agregar"
        disabled={email.trim().length === 0 || (needsTeam && !teamId)}
        loading={invite.isPending}
        onPress={submit}
      />
    </View>
  );
}

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const tournament = useTournament(id);
  const members = useMembers(id);
  const teams = useTeams(id);
  const remove = useRemoveMember(id);

  if (tournament.isPending || members.isPending) return <LoadingView />;
  if (tournament.isError) return <ErrorView message={tournament.error.message} />;
  if (members.isError) return <ErrorView message={members.error.message} />;

  const { isAdmin } = tournamentAccess(tournament.data);
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  const pending = members.data.filter((m) => m.status === 'PENDING');
  const active = members.data.filter((m) => m.status === 'ACTIVE');
  const ownPending = pending.filter((m) => m.user.id === userId);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {isAdmin ? (
            <View style={styles.section}>
              <ThemedText type="heading">Solicitudes</ThemedText>
              {pending.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No hay solicitudes pendientes.
                </ThemedText>
              ) : (
                pending.map((member) => (
                  <PendingRow
                    key={member.id}
                    member={member}
                    teams={teams.data ?? []}
                    tournamentId={id}
                  />
                ))
              )}
            </View>
          ) : null}

          {!isAdmin && ownPending.length > 0 ? (
            <View style={styles.section}>
              {ownPending.map((member) => (
                <View key={member.id} style={styles.pending}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Pediste ser {memberLine(member, true)}. El administrador aún no responde.
                  </ThemedText>
                  <Button
                    title="Cancelar solicitud"
                    variant="secondary"
                    loading={remove.isPending}
                    onPress={() => remove.mutate(member.id)}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {isAdmin ? <InviteForm teams={teams.data ?? []} tournamentId={id} /> : null}

          <View style={styles.section}>
            <ThemedText type="heading">Miembros</ThemedText>
            {active.length === 0 ? (
              <EmptyView title="Sin miembros todavía" />
            ) : (
              <View>
                {ROLE_ORDER.flatMap((role) => active.filter((m) => m.role === role)).map(
                  (member) => (
                    <ListRow key={member.id}>
                      <View style={styles.memberText}>
                        <ThemedText type="smallBold">
                          {member.user.name}
                          {member.user.id === userId ? ' (tú)' : ''}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {memberLine(member)}
                        </ThemedText>
                      </View>
                      {isAdmin && member.user.id !== userId ? (
                        <ThemedText
                          type="linkPrimary"
                          accessibilityRole="button"
                          onPress={() => remove.mutate(member.id)}
                        >
                          Quitar
                        </ThemedText>
                      ) : null}
                    </ListRow>
                  ),
                )}
              </View>
            )}
            {remove.isError ? (
              <ThemedText type="small" themeColor="danger">
                {remove.error.message}
              </ThemedText>
            ) : null}
          </View>
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
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  pending: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  memberText: {
    flex: 1,
    gap: Spacing.half,
  },
  field: {
    gap: Spacing.one,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
