import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Crest } from '@/components/ui/crest';
import { ListRow } from '@/components/ui/list-row';
import { Segmented } from '@/components/ui/segmented';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  api,
  type AssignableClubRole,
  type Club,
  type ClubHistoryEntry,
  type ClubMember,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CLUB_ROLE_LABEL, plural } from '@/lib/format';
import { pickSquareImage } from '@/lib/images';
import { useClub, useClubHistory, useClubMutations } from '@/lib/queries';

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Aceptar', style: 'destructive', onPress: onConfirm },
  ]);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading">{title}</ThemedText>
      {children}
    </View>
  );
}

function positionLabel(entry: ClubHistoryEntry) {
  const { position, tournament } = entry;
  if (tournament.status === 'DRAFT' || position === null) return 'Inscrito';
  if (tournament.status === 'FINISHED') {
    return position === 1 ? 'Campeón' : `${position}.º de ${tournament.teams}`;
  }
  return `Va ${position}.º de ${tournament.teams}`;
}

function HistorySection({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { data, isPending, isError, error } = useClubHistory(clubId);
  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;
  return (
    <Section title="Historial">
      {data.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no ha jugado torneos. Inscríbelo desde la página de un torneo.
        </ThemedText>
      ) : (
        data.map((entry) => (
          <Link
            key={entry.teamId}
            href={{ pathname: '/tournaments/[id]', params: { id: entry.tournament.id } }}
            asChild
          >
            <ListRow>
              <Crest url={entry.tournament.imageUrl} name={entry.tournament.name} size={40} />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {entry.tournament.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {/* Finished tournaments keep the name the club had back then */}
                  {entry.teamName !== clubName ? `Como ${entry.teamName} · ` : ''}
                  {new Date(entry.tournament.createdAt).getFullYear()}
                </ThemedText>
              </View>
              <ThemedText
                type="smallBold"
                themeColor={entry.position === 1 && entry.tournament.status === 'FINISHED' ? 'accentText' : 'text'}
              >
                {positionLabel(entry)}
              </ThemedText>
            </ListRow>
          </Link>
        ))
      )}
    </Section>
  );
}

function NameSection({ club, mutations }: { club: Club; mutations: ReturnType<typeof useClubMutations> }) {
  const [name, setName] = useState(club.name);
  const [error, setError] = useState<string | null>(null);
  const locked = new Date(club.nameChangeAvailableAt) > new Date();

  const save = async () => {
    setError(null);
    try {
      await mutations.rename.mutateAsync(name.trim());
    } catch (e) {
      setError(errorText(e, 'No se pudo cambiar el nombre'));
    }
  };

  return (
    <Section title="Nombre">
      <View style={styles.inlineForm}>
        <View style={styles.flex}>
          <TextField value={name} onChangeText={setName} editable={!locked} maxLength={60} />
        </View>
        <Button
          title="Guardar"
          disabled={locked || name.trim().length === 0 || name.trim() === club.name}
          loading={mutations.rename.isPending}
          onPress={save}
        />
      </View>
      <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
        {error ??
          (locked
            ? `El nombre se puede cambiar cada 6 meses. Próximo cambio desde el ${formatDate(club.nameChangeAvailableAt)}.`
            : 'Ya puedes cambiar el nombre. Después tendrás que esperar 6 meses para volver a hacerlo.')}
      </ThemedText>
    </Section>
  );
}

function MembersSection({
  club,
  mutations,
  viewerId,
}: {
  club: Club;
  mutations: ReturnType<typeof useClubMutations>;
  viewerId: string | null;
}) {
  const theme = useTheme();
  const isOwner = club.viewerRoles.includes('OWNER');
  const isAdmin = isOwner || club.viewerRoles.includes('ADMIN');
  const roles: AssignableClubRole[] = isOwner
    ? ['ADMIN', 'COACH', 'SPOKESPERSON', 'CAPTAIN']
    : ['COACH', 'SPOKESPERSON', 'CAPTAIN'];
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableClubRole>(roles[0]);
  const [error, setError] = useState<string | null>(null);

  const canRemove = (member: ClubMember) =>
    member.role !== 'OWNER' &&
    (member.user.id === viewerId || (member.role === 'ADMIN' ? isOwner : isAdmin));

  const add = async () => {
    setError(null);
    try {
      await mutations.addMember.mutateAsync({ email: email.trim(), role });
      setEmail('');
    } catch (e) {
      setError(errorText(e, 'No se pudo asignar el rol'));
    }
  };

  const remove = (member: ClubMember) =>
    confirm(
      'Quitar rol',
      `¿Quitar a ${member.user.name} como ${CLUB_ROLE_LABEL[member.role].toLowerCase()}?`,
      () => mutations.removeMember.mutate(member.id),
    );

  return (
    <Section title="Integrantes">
      {club.members.map((member) => (
        <View key={member.id} style={[styles.memberRow, { borderColor: theme.border }]}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{member.user.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {CLUB_ROLE_LABEL[member.role]}
            </ThemedText>
          </View>
          {canRemove(member) ? (
            <ThemedText type="linkPrimary" accessibilityRole="button" onPress={() => remove(member)}>
              Quitar
            </ThemedText>
          ) : null}
        </View>
      ))}
      {isAdmin ? (
        <View style={styles.form}>
          <ThemedText type="small" themeColor="textSecondary">
            {isOwner
              ? 'Puedes nombrar hasta 2 administradores más. Técnico, vocero y capitán: una persona cada uno.'
              : 'Técnico, vocero y capitán: una persona cada uno. Los administradores los nombra el creador.'}
          </ThemedText>
          <Segmented
            value={role}
            onChange={setRole}
            options={roles.map((value) => ({ value, label: CLUB_ROLE_LABEL[value] }))}
          />
          <View style={styles.inlineForm}>
            <View style={styles.flex}>
              <TextField
                placeholder="Correo de su cuenta"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <Button
              title="Asignar"
              disabled={!email.includes('@')}
              loading={mutations.addMember.isPending}
              onPress={add}
            />
          </View>
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </Section>
  );
}

function SquadSection({
  club,
  mutations,
  isAdmin,
}: {
  club: Club;
  mutations: ReturnType<typeof useClubMutations>;
  isAdmin: boolean;
}) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setError(null);
    const parsed = parseInt(number, 10);
    try {
      await mutations.addPlayer.mutateAsync({
        name: name.trim(),
        number: Number.isNaN(parsed) ? undefined : parsed,
      });
      setName('');
      setNumber('');
    } catch (e) {
      setError(errorText(e, 'No se pudo agregar el jugador'));
    }
  };

  return (
    <Section title="Plantilla">
      <ThemedText type="small" themeColor="textSecondary">
        Se copia a cada torneo al inscribir el equipo; allí se puede ajustar sin cambiar esta.
      </ThemedText>
      {club.players.map((player) => (
        <View key={player.id} style={[styles.memberRow, { borderColor: theme.border }]}>
          <ThemedText type="stat" themeColor="textSecondary" style={styles.number}>
            {player.number ?? '–'}
          </ThemedText>
          <ThemedText type="small" style={styles.flex}>
            {player.name}
          </ThemedText>
          {isAdmin ? (
            <ThemedText
              type="linkPrimary"
              accessibilityRole="button"
              onPress={() => mutations.removePlayer.mutate(player.id)}
            >
              Quitar
            </ThemedText>
          ) : null}
        </View>
      ))}
      {club.players.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Sin jugadores todavía.
        </ThemedText>
      ) : null}
      {isAdmin ? (
        <View style={styles.inlineForm}>
          <View style={styles.flex}>
            <TextField placeholder="Nombre del jugador" value={name} onChangeText={setName} />
          </View>
          <View style={styles.numberField}>
            <TextField
              placeholder="N.º"
              value={number}
              onChangeText={setNumber}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <Button
            title="Agregar"
            disabled={name.trim().length === 0}
            loading={mutations.addPlayer.isPending}
            onPress={add}
          />
        </View>
      ) : null}
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </Section>
  );
}

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const { data: club, isPending, isError, error } = useClub(id);
  const history = useClubHistory(id);
  const mutations = useClubMutations(id);
  const [crestError, setCrestError] = useState<string | null>(null);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  const isOwner = club.viewerRoles.includes('OWNER');
  const isAdmin = isOwner || club.viewerRoles.includes('ADMIN');
  const ownRoles = club.viewerRoles.map((role) => CLUB_ROLE_LABEL[role]).join(' · ');

  const changeCrest = async () => {
    setCrestError(null);
    try {
      const crest = await pickSquareImage();
      if (crest) await mutations.crest.mutateAsync(crest);
    } catch (e) {
      setCrestError(errorText(e, 'No se pudo cambiar el escudo'));
    }
  };

  const remove = () =>
    confirm('Eliminar equipo', `¿Eliminar ${club.name}? No se puede deshacer.`, async () => {
      try {
        await api.clubs.remove(club.id);
        router.back();
      } catch (e) {
        setCrestError(errorText(e, 'No se pudo eliminar'));
      }
    });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: club.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              disabled={!isAdmin || mutations.crest.isPending}
              onPress={changeCrest}
              accessibilityRole={isAdmin ? 'button' : 'image'}
              accessibilityLabel={isAdmin ? 'Cambiar escudo' : `Escudo de ${club.name}`}
              style={{ opacity: mutations.crest.isPending ? 0.5 : 1 }}
            >
              <Crest url={club.crestUrl} name={club.name} size={96} />
            </Pressable>
            <ThemedText type="subtitle" style={styles.center}>
              {club.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {history.data ? `${plural(history.data.length, 'torneo', 'torneos')} · ` : ''}
              Desde {new Date(club.createdAt).getFullYear()}
              {ownRoles ? ` · Eres ${ownRoles.toLowerCase()}` : ''}
            </ThemedText>
            {isAdmin ? (
              <ThemedText
                type="small"
                themeColor={crestError ? 'danger' : 'textSecondary'}
                style={styles.center}
              >
                {crestError ?? 'Toca el escudo para cambiarlo.'}
              </ThemedText>
            ) : null}
          </View>
          <HistorySection clubId={club.id} clubName={club.name} />
          {isAdmin ? <NameSection key={club.name} club={club} mutations={mutations} /> : null}
          <MembersSection club={club} mutations={mutations} viewerId={auth.user?.id ?? null} />
          <SquadSection club={club} mutations={mutations} isAdmin={isAdmin} />
          {isOwner && history.data?.length === 0 ? (
            <Button title="Eliminar equipo" variant="danger" onPress={remove} />
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  inlineForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  number: {
    width: 28,
    textAlign: 'center',
  },
  numberField: {
    width: 64,
  },
  flex: {
    flex: 1,
  },
});
