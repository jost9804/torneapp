import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CardType, Match, Team } from '@/lib/api';
import { tournamentAccess, useAuth } from '@/lib/auth';
import {
  useAssignReferee,
  useMatches,
  useMembers,
  useRecordResult,
  useTeams,
  useTournament,
} from '@/lib/queries';

const CARD_LABEL: Record<CardType, string> = { YELLOW: 'Amarilla', RED: 'Roja' };

type DraftCard = { playerId: string; type: CardType };

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? theme.accent : theme.backgroundElement }]}
    >
      <ThemedText type="small" style={{ color: selected ? theme.onAccent : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Small card swatch, the way it looks in the referee's hand. */
function CardSwatch({ type }: { type: CardType }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={`Tarjeta ${CARD_LABEL[type].toLowerCase()}`}
      style={[styles.swatch, { backgroundColor: type === 'YELLOW' ? theme.caution : theme.danger }]}
    />
  );
}

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
  if (count === 0 || team.players.length === 0) return null;
  return (
    <View style={styles.group}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Goles de {team.name} ({selected.length}/{count})
      </ThemedText>
      <View style={styles.chips}>
        {team.players.map((player) => {
          const times = selected.filter((id) => id === player.id).length;
          return (
            <Chip
              key={player.id}
              selected={times > 0}
              onPress={() => onToggle(player.id)}
              label={`${player.number ? `${player.number} · ` : ''}${player.name}${
                times > 1 ? ` ×${times}` : ''
              }`}
            />
          );
        })}
      </View>
    </View>
  );
}

function CardsEditor({
  teams,
  cards,
  onChange,
}: {
  teams: Team[];
  cards: DraftCard[];
  onChange: (cards: DraftCard[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const players = teams.flatMap((team) => team.players);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? 'Jugador';

  const add = (type: CardType) => {
    if (!playerId) return;
    onChange([...cards, { playerId, type }]);
    setPlayerId(null);
    setAdding(false);
  };

  return (
    <View style={styles.group}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Tarjetas
      </ThemedText>
      {cards.map((card, index) => (
        <View key={`${card.playerId}-${index}`} style={styles.cardRow}>
          <CardSwatch type={card.type} />
          <ThemedText type="small" style={styles.flex}>
            {nameOf(card.playerId)}
          </ThemedText>
          <ThemedText
            type="linkPrimary"
            accessibilityRole="button"
            onPress={() => onChange(cards.filter((_, i) => i !== index))}
          >
            Quitar
          </ThemedText>
        </View>
      ))}
      {cards.length === 0 && !adding ? (
        <ThemedText type="small" themeColor="textSecondary">
          Sin tarjetas.
        </ThemedText>
      ) : null}
      {adding ? (
        <>
          {teams.map((team) =>
            team.players.length > 0 ? (
              <View key={team.id} style={styles.group}>
                <ThemedText type="small" themeColor="textSecondary">
                  {team.name}
                </ThemedText>
                <View style={styles.chips}>
                  {team.players.map((player) => (
                    <Chip
                      key={player.id}
                      selected={player.id === playerId}
                      onPress={() => setPlayerId(player.id === playerId ? null : player.id)}
                      label={`${player.number ? `${player.number} · ` : ''}${player.name}`}
                    />
                  ))}
                </View>
              </View>
            ) : null,
          )}
          <View style={styles.cardButtons}>
            <Button
              title="Amarilla"
              variant="secondary"
              disabled={!playerId}
              onPress={() => add('YELLOW')}
              style={styles.flex}
            />
            <Button
              title="Roja"
              variant="danger"
              disabled={!playerId}
              onPress={() => add('RED')}
              style={styles.flex}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Elige un jugador y luego el color de la tarjeta.
          </ThemedText>
          <ThemedText
            type="linkPrimary"
            accessibilityRole="button"
            onPress={() => {
              setAdding(false);
              setPlayerId(null);
            }}
          >
            Cancelar
          </ThemedText>
        </>
      ) : (
        <Button title="Agregar tarjeta" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </View>
  );
}

/** Starts from what's already filed, so the referee can correct a report. */
function ReportForm({
  match,
  teams,
  tournamentId,
}: {
  match: Match;
  teams: Team[];
  tournamentId: string;
}) {
  const recordResult = useRecordResult(tournamentId);
  const homeTeam = teams.find((t) => t.id === match.homeTeam.id);
  const awayTeam = teams.find((t) => t.id === match.awayTeam.id);
  const goalsOf = (teamId: string) =>
    match.goals.filter((g) => g.player.teamId === teamId).map((g) => g.playerId);

  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '');
  const [homeScorers, setHomeScorers] = useState<string[]>(goalsOf(match.homeTeam.id));
  const [awayScorers, setAwayScorers] = useState<string[]>(goalsOf(match.awayTeam.id));
  const [cards, setCards] = useState<DraftCard[]>(
    match.cards.map(({ playerId, type }) => ({ playerId, type })),
  );
  const [observations, setObservations] = useState(match.observations ?? '');
  const [error, setError] = useState<string | null>(null);

  const parsedHome = parseInt(homeScore, 10);
  const parsedAway = parseInt(awayScore, 10);
  const valid = !Number.isNaN(parsedHome) && !Number.isNaN(parsedAway);

  const makeToggle =
    (list: string[], set: (v: string[]) => void, max: number) => (playerId: string) => {
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
        cards,
        observations: observations.trim(),
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({ pathname: '/tournaments/[id]', params: { id: tournamentId } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el informe');
    }
  };

  return (
    <>
      <View style={styles.scoreRow}>
        <View style={styles.scoreTeam}>
          <ThemedText type="heading" numberOfLines={2} style={styles.centered}>
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
        <ThemedText type="score" themeColor="textSecondary" style={styles.dash}>
          –
        </ThemedText>
        <View style={styles.scoreTeam}>
          <ThemedText type="heading" numberOfLines={2} style={styles.centered}>
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
      {homeTeam && awayTeam ? (
        <CardsEditor teams={[homeTeam, awayTeam]} cards={cards} onChange={setCards} />
      ) : null}
      <TextField
        label="Observaciones del partido"
        placeholder="Incidentes, lesiones, comportamiento, estado de la cancha…"
        value={observations}
        onChangeText={setObservations}
        multiline
        maxLength={2000}
        style={styles.notes}
      />
      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
      <Button
        title="Guardar informe"
        disabled={!valid}
        loading={recordResult.isPending}
        onPress={submit}
      />
    </>
  );
}

function ReportView({ match }: { match: Match }) {
  const played = match.status === 'PLAYED';
  const teamName = (teamId: string) =>
    teamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name;

  return (
    <>
      <View style={styles.scoreRow}>
        <ThemedText type="heading" numberOfLines={2} style={[styles.flex, styles.centered]}>
          {match.homeTeam.name}
        </ThemedText>
        <ThemedText type="score">
          {played ? `${match.homeScore} – ${match.awayScore}` : 'vs'}
        </ThemedText>
        <ThemedText type="heading" numberOfLines={2} style={[styles.flex, styles.centered]}>
          {match.awayTeam.name}
        </ThemedText>
      </View>
      {!played ? (
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          Este partido todavía no tiene informe.
        </ThemedText>
      ) : null}
      {match.goals.length > 0 ? (
        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Goles
          </ThemedText>
          {match.goals.map((goal) => (
            <ThemedText key={goal.id} type="small">
              {goal.minute ? `${goal.minute}' · ` : ''}
              {goal.player.name} ({teamName(goal.player.teamId)})
            </ThemedText>
          ))}
        </View>
      ) : null}
      {match.cards.length > 0 ? (
        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Tarjetas
          </ThemedText>
          {match.cards.map((card) => (
            <View key={card.id} style={styles.cardRow}>
              <CardSwatch type={card.type} />
              <ThemedText type="small" style={styles.flex}>
                {card.minute ? `${card.minute}' · ` : ''}
                {card.player.name} ({teamName(card.player.teamId)})
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      {match.observations ? (
        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Observaciones del árbitro
          </ThemedText>
          <ThemedText>{match.observations}</ThemedText>
        </View>
      ) : null}
    </>
  );
}

/** The admin picks which of the tournament's referees runs this match. */
function RefereePicker({ match, tournamentId }: { match: Match; tournamentId: string }) {
  const members = useMembers(tournamentId);
  const assign = useAssignReferee(tournamentId);
  const referees = (members.data ?? []).filter(
    (m) => m.role === 'REFEREE' && m.status === 'ACTIVE',
  );

  if (members.isPending) return null;
  if (referees.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Todavía no hay árbitros en el torneo. Invítalos desde Gestionar miembros.
      </ThemedText>
    );
  }
  return (
    <View style={styles.chips}>
      {referees.map((referee) => {
        const selected = match.referee?.id === referee.user.id;
        return (
          <Chip
            key={referee.id}
            selected={selected}
            label={referee.user.name}
            onPress={() =>
              assign.mutate({ matchId: match.id, refereeId: selected ? null : referee.user.id })
            }
          />
        );
      })}
    </View>
  );
}

export default function MatchScreen() {
  const { id, tournamentId } = useLocalSearchParams<{
    id: string;
    tournamentId: string;
  }>();
  const auth = useAuth();
  const tournament = useTournament(tournamentId);
  const matches = useMatches(tournamentId);
  const { data: teams } = useTeams(tournamentId);

  if (matches.isPending || tournament.isPending) return <LoadingView />;
  if (matches.isError) return <ErrorView message={matches.error.message} />;

  const match = matches.data.find((m) => m.id === id);
  if (!match) return <ErrorView message="No encontramos este partido." />;

  const access = tournamentAccess(tournament.data);
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  const isAssignedReferee = userId !== null && match.referee?.id === userId;
  const canReport = access.isAdmin || (access.isReferee && isAssignedReferee);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.group}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              Fecha {match.round} ·{' '}
              {match.referee ? `Árbitro: ${match.referee.name}` : 'Sin árbitro asignado'}
            </ThemedText>
            {access.isAdmin ? <RefereePicker match={match} tournamentId={tournamentId} /> : null}
          </View>
          {canReport && teams ? (
            <ReportForm match={match} teams={teams} tournamentId={tournamentId} />
          ) : (
            <ReportView match={match} />
          )}
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
  flex: {
    flex: 1,
  },
  group: {
    gap: Spacing.two,
  },
  scoreRow: {
    flexDirection: 'row',
    // Bottom-aligned so the score boxes line up when one team name wraps
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  scoreTeam: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  scoreInput: {
    width: 80,
    minHeight: 72,
    textAlign: 'center',
    fontFamily: FontFamily.display,
    fontSize: 44,
  },
  centered: {
    textAlign: 'center',
  },
  dash: {
    // Centres the dash on the 72pt score boxes
    paddingBottom: (72 - 50) / 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  swatch: {
    width: 14,
    height: 20,
    borderRadius: 2,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  notes: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
