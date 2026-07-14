import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, TournamentFormat } from './api';

export const keys = {
  tournaments: ['tournaments'] as const,
  tournament: (id: string) => ['tournaments', id] as const,
  teams: (tournamentId: string) => ['tournaments', tournamentId, 'teams'] as const,
  matches: (tournamentId: string) => ['tournaments', tournamentId, 'matches'] as const,
  standings: (tournamentId: string) => ['tournaments', tournamentId, 'standings'] as const,
  topScorers: (tournamentId: string) => ['tournaments', tournamentId, 'top-scorers'] as const,
};

export function useTournaments() {
  return useQuery({ queryKey: keys.tournaments, queryFn: api.tournaments.list });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: keys.tournament(id),
    queryFn: () => api.tournaments.get(id),
  });
}

export function useTeams(tournamentId: string) {
  return useQuery({
    queryKey: keys.teams(tournamentId),
    queryFn: () => api.teams.list(tournamentId),
  });
}

export function useMatches(tournamentId: string) {
  return useQuery({
    queryKey: keys.matches(tournamentId),
    queryFn: () => api.fixture.matches(tournamentId),
  });
}

export function useStandings(tournamentId: string) {
  return useQuery({
    queryKey: keys.standings(tournamentId),
    queryFn: () => api.standings.table(tournamentId),
  });
}

export function useTopScorers(tournamentId: string) {
  return useQuery({
    queryKey: keys.topScorers(tournamentId),
    queryFn: () => api.standings.topScorers(tournamentId),
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; format?: TournamentFormat }) =>
      api.tournaments.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.tournaments }),
  });
}

export function useUploadRules(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => api.tournaments.uploadRules(tournamentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tournament(tournamentId) });
      queryClient.invalidateQueries({ queryKey: keys.tournaments });
    },
  });
}

export function useCreateTeam(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.teams.create(tournamentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.teams(tournamentId) });
      queryClient.invalidateQueries({ queryKey: keys.tournament(tournamentId) });
    },
  });
}

export function useCreatePlayer(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      ...data
    }: {
      teamId: string;
      name: string;
      number?: number;
      position?: string;
    }) => api.players.create(teamId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.teams(tournamentId) }),
  });
}

export function useGenerateFixture(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.fixture.generate(tournamentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.tournament(tournamentId).slice(0, 2) }),
  });
}

export function useRecordResult(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      ...data
    }: {
      matchId: string;
      homeScore: number;
      awayScore: number;
      goals?: { playerId: string; minute?: number }[];
    }) => api.matches.recordResult(matchId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.tournament(tournamentId).slice(0, 2) }),
  });
}
