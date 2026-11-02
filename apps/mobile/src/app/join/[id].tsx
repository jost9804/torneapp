import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { TeamPicker } from '@/components/ui/team-picker';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Role } from '@/lib/api';
import { useJoinTournament, useTeams, useTournament } from '@/lib/queries';

type RequestableRole = Exclude<Role, 'ADMIN'>;

const ROLE_HINT: Record<RequestableRole, string> = {
  REFEREE:
    'Podrás registrar el marcador, las tarjetas y las observaciones de los partidos que te asignen.',
  COACH: 'Podrás proponer jugadores para tu equipo; el administrador los aprueba.',
  PLAYER: 'Podrás mantener al día tu número y tu posición en la plantilla.',
};

export default function JoinTournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournament = useTournament(id);
  const teams = useTeams(id);
  const join = useJoinTournament(id);
  const [role, setRole] = useState<RequestableRole>('PLAYER');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (tournament.isPending || teams.isPending) return <LoadingView />;
  if (tournament.isError) return <ErrorView message={tournament.error.message} />;
  if (teams.isError) return <ErrorView message={teams.error.message} />;

  const needsTeam = role !== 'REFEREE';

  const submit = async () => {
    setError(null);
    try {
      await join.mutateAsync({ role, teamId: needsTeam ? (teamId ?? undefined) : undefined });
      if (router.canGoBack()) router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la solicitud');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <ThemedText themeColor="textSecondary">
            Elige cómo participas en {tournament.data.name}. El administrador revisará tu solicitud.
          </ThemedText>
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Rol
            </ThemedText>
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { value: 'PLAYER', label: 'Jugador' },
                { value: 'COACH', label: 'Técnico' },
                { value: 'REFEREE', label: 'Árbitro' },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {ROLE_HINT[role]}
            </ThemedText>
          </View>
          {needsTeam ? (
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Equipo
              </ThemedText>
              {teams.data.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Este torneo todavía no tiene equipos. Vuelve cuando el administrador los agregue.
                </ThemedText>
              ) : (
                <TeamPicker teams={teams.data} value={teamId} onChange={setTeamId} />
              )}
            </View>
          ) : null}
          {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
          <Button
            title="Enviar solicitud"
            disabled={needsTeam && !teamId}
            loading={join.isPending}
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
  field: {
    gap: Spacing.two,
  },
});
