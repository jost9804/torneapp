export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type TournamentFormat = 'ROUND_ROBIN' | 'ROUND_ROBIN_HOME_AWAY';
export type TournamentStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED';
export type MatchStatus = 'SCHEDULED' | 'PLAYED';

export interface Tournament {
  id: string;
  name: string;
  sport: 'FOOTBALL_11';
  format: TournamentFormat;
  status: TournamentStatus;
  rulesPdfPath: string | null;
  createdAt: string;
  _count?: { teams: number; matches: number };
}

export interface Player {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  crestUrl: string | null;
  tournamentId: string;
  players: Player[];
}

export interface MatchGoal {
  id: string;
  playerId: string;
  minute: number | null;
  player: { id: string; name: string; teamId: string };
}

export interface Match {
  id: string;
  round: number;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; crestUrl: string | null };
  awayTeam: { id: string; name: string; crestUrl: string | null };
  goals: MatchGoal[];
}

export interface StandingsRow {
  teamId: string;
  teamName: string;
  crestUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TopScorer {
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string | null;
  goals: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : undefined,
    ...init,
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  tournaments: {
    list: () => request<Tournament[]>('/tournaments'),
    get: (id: string) => request<Tournament>(`/tournaments/${id}`),
    create: (data: { name: string; format?: TournamentFormat }) =>
      request<Tournament>('/tournaments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    uploadRules: (id: string, form: FormData) =>
      request<Tournament>(`/tournaments/${id}/rules`, {
        method: 'POST',
        body: form,
      }),
    rulesUrl: (id: string) => `${API_URL}/tournaments/${id}/rules`,
  },
  teams: {
    list: (tournamentId: string) =>
      request<Team[]>(`/tournaments/${tournamentId}/teams`),
    create: (tournamentId: string, data: { name: string }) =>
      request<Team>(`/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  players: {
    create: (
      teamId: string,
      data: { name: string; number?: number; position?: string },
    ) =>
      request<Player>(`/teams/${teamId}/players`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  fixture: {
    generate: (tournamentId: string) =>
      request<Match[]>(`/tournaments/${tournamentId}/fixture`, { method: 'POST' }),
    matches: (tournamentId: string) =>
      request<Match[]>(`/tournaments/${tournamentId}/matches`),
  },
  matches: {
    recordResult: (
      matchId: string,
      data: {
        homeScore: number;
        awayScore: number;
        goals?: { playerId: string; minute?: number }[];
      },
    ) =>
      request<Match>(`/matches/${matchId}/result`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  standings: {
    table: (tournamentId: string) =>
      request<StandingsRow[]>(`/tournaments/${tournamentId}/standings`),
    topScorers: (tournamentId: string) =>
      request<TopScorer[]>(`/tournaments/${tournamentId}/top-scorers`),
  },
};
