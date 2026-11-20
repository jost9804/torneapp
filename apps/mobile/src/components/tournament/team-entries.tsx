import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Crest } from '@/components/ui/crest';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Team } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { plural } from '@/lib/format';
import { useClubSearch, useEntryMutations, useEntryRequests, useMyClubs } from '@/lib/queries';

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'No se pudo completar');

function ClubLine({
  name,
  crestUrl,
  detail,
  children,
}: {
  name: string;
  crestUrl: string | null;
  detail?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.line, { borderColor: theme.border }]}>
      <Crest url={crestUrl} name={name} size={36} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {name}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

/**
 * Before the fixture exists: tournament admins search clubs to add and answer requests;
 * club admins ask to enter their own clubs.
 */
export function TeamEntries({
  tournamentId,
  isAdmin,
  teams,
}: {
  tournamentId: string;
  isAdmin: boolean;
  teams: Team[];
}) {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';
  const requests = useEntryRequests(tournamentId, signedIn);
  const myClubs = useMyClubs(signedIn && !isAdmin);
  const entries = useEntryMutations(tournamentId);
  const [query, setQuery] = useState('');
  const search = useClubSearch(isAdmin ? query : '');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!signedIn) return null;

  const run = async (id: string, action: () => Promise<unknown>) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyId(null);
    }
  };

  const entered = new Set(teams.map((t) => t.clubId).filter(Boolean));
  const pending = requests.data ?? [];
  const pendingClubs = new Set(pending.map((r) => r.clubId));
  const ownClubs = (myClubs.data ?? []).filter(
    (club) =>
      club.members?.some((m) => m.role === 'OWNER' || m.role === 'ADMIN') &&
      !entered.has(club.id) &&
      !pendingClubs.has(club.id),
  );

  return (
    <View style={styles.wrapper}>
      {pending.length > 0 ? (
        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="accentText">
            {isAdmin
              ? `${plural(pending.length, 'equipo pide', 'equipos piden')} inscribirse`
              : 'Esperando aprobación del organizador'}
          </ThemedText>
          {pending.map((request) => (
            <ClubLine
              key={request.id}
              name={request.club.name}
              crestUrl={request.club.crestUrl}
              detail={`Lo pidió ${request.requestedBy.name}`}
            >
              {isAdmin ? (
                <>
                  <Button
                    title="Rechazar"
                    variant="secondary"
                    disabled={busyId !== null}
                    onPress={() => run(request.id, () => entries.dismiss.mutateAsync(request.id))}
                  />
                  <Button
                    title="Aprobar"
                    loading={busyId === request.id && entries.approve.isPending}
                    disabled={busyId !== null}
                    onPress={() => run(request.id, () => entries.approve.mutateAsync(request.id))}
                  />
                </>
              ) : (
                <Button
                  title="Cancelar"
                  variant="secondary"
                  disabled={busyId !== null}
                  onPress={() => run(request.id, () => entries.dismiss.mutateAsync(request.id))}
                />
              )}
            </ClubLine>
          ))}
        </View>
      ) : null}

      {isAdmin ? (
        <View style={styles.group}>
          <TextField
            label="Agregar equipo"
            placeholder="Busca por nombre"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {search.data?.map((club) => (
            <ClubLine
              key={club.id}
              name={club.name}
              crestUrl={club.crestUrl}
              detail={plural(club._count.entries, 'torneo jugado', 'torneos jugados')}
            >
              {entered.has(club.id) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Inscrito
                </ThemedText>
              ) : (
                <Button
                  title="Agregar"
                  loading={busyId === club.id}
                  disabled={busyId !== null}
                  onPress={() =>
                    run(club.id, async () => {
                      await entries.enter.mutateAsync(club.id);
                      setQuery('');
                    })
                  }
                />
              )}
            </ClubLine>
          ))}
          {query.trim().length >= 2 && search.data?.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No hay equipos con ese nombre. Quien lo dirige puede crearlo desde Perfil.
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <View style={styles.group}>
          {ownClubs.map((club) => (
            <ClubLine key={club.id} name={club.name} crestUrl={club.crestUrl} detail="Tu equipo">
              <Button
                title="Inscribir"
                loading={busyId === club.id}
                disabled={busyId !== null}
                onPress={() => run(club.id, () => entries.enter.mutateAsync(club.id))}
              />
            </ClubLine>
          ))}
          {myClubs.data && myClubs.data.length === 0 ? (
            <ThemedText
              type="linkPrimary"
              accessibilityRole="link"
              onPress={() => router.push('/clubs/new')}
            >
              ¿Diriges un equipo? Créalo para inscribirlo
            </ThemedText>
          ) : null}
        </View>
      )}
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.one,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
