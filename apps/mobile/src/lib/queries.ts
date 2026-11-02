import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CardType, type Role, type Tournament, TournamentFormat } from './api';

export const keys = {
  tournaments: ['tournaments'] as const,
  tournament: (id: string) => ['tournaments', id] as const,
  teams: (tournamentId: string) => ['tournaments', tournamentId, 'teams'] as const,
  matches: (tournamentId: string) => ['tournaments', tournamentId, 'matches'] as const,
  standings: (tournamentId: string) => ['tournaments', tournamentId, 'standings'] as const,
  topScorers: (tournamentId: string) => ['tournaments', tournamentId, 'top-scorers'] as const,
  members: (tournamentId: string) => ['tournaments', tournamentId, 'members'] as const,
  playerRequests: (tournamentId: string) =>
    ['tournaments', tournamentId, 'player-requests'] as const,
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
    mutationFn: (data: { name: string; format?: TournamentFormat }) => api.tournaments.create(data),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.teams(tournamentId) });
      queryClient.invalidateQueries({ queryKey: keys.playerRequests(tournamentId) });
    },
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
      cards?: { playerId: string; type: CardType; minute?: number }[];
      observations?: string;
    }) => api.matches.recordResult(matchId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.tournament(tournamentId).slice(0, 2) }),
  });
}

export function useAssignReferee(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, refereeId }: { matchId: string; refereeId: string | null }) =>
      api.matches.assignReferee(matchId, refereeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.matches(tournamentId) }),
  });
}

export function useUpdatePlayer(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; number?: number; position?: string }) =>
      api.players.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.teams(tournamentId) }),
  });
}

/** Like and follow update the tournament in place so the counts move immediately. */
export function useTournamentReaction(tournamentId: string) {
  const queryClient = useQueryClient();
  const onSuccess = (tournament: Tournament) => {
    queryClient.setQueryData(keys.tournament(tournamentId), tournament);
    queryClient.invalidateQueries({ queryKey: keys.tournaments, exact: true });
  };
  return {
    like: useMutation({
      mutationFn: (liked: boolean) => api.tournaments.setLike(tournamentId, liked),
      onSuccess,
    }),
    follow: useMutation({
      mutationFn: (followed: boolean) => api.tournaments.setFollow(tournamentId, followed),
      onSuccess,
    }),
  };
}

export function useMembers(tournamentId: string) {
  return useQuery({
    queryKey: keys.members(tournamentId),
    queryFn: () => api.members.list(tournamentId),
  });
}

export function usePlayerRequests(tournamentId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.playerRequests(tournamentId),
    queryFn: () => api.playerRequests.list(tournamentId),
    enabled,
  });
}

/** Membership changes alter the viewer's roles, so the tournament refetches too. */
function useMembershipMutation<TVars, TResult>(
  tournamentId: string,
  mutationFn: (vars: TVars) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.members(tournamentId) });
      queryClient.invalidateQueries({ queryKey: keys.tournament(tournamentId), exact: true });
      queryClient.invalidateQueries({ queryKey: keys.teams(tournamentId) });
    },
  });
}

export function useJoinTournament(tournamentId: string) {
  return useMembershipMutation(
    tournamentId,
    (data: { role: Exclude<Role, 'ADMIN'>; teamId?: string }) =>
      api.members.join(tournamentId, data),
  );
}

export function useInviteMember(tournamentId: string) {
  return useMembershipMutation(
    tournamentId,
    (data: { email: string; role: Role; teamId?: string }) =>
      api.members.invite(tournamentId, data),
  );
}

export function useApproveMember(tournamentId: string) {
  return useMembershipMutation(
    tournamentId,
    ({ id, playerId }: { id: string; playerId?: string }) => api.members.approve(id, { playerId }),
  );
}

export function useRemoveMember(tournamentId: string) {
  return useMembershipMutation(tournamentId, (id: string) => api.members.remove(id));
}

export function useReviewPlayerRequest(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      api.playerRequests.review(id, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.playerRequests(tournamentId) });
      queryClient.invalidateQueries({ queryKey: keys.teams(tournamentId) });
    },
  });
}
