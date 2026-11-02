import { getToken } from './session';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type TournamentFormat = 'ROUND_ROBIN' | 'ROUND_ROBIN_HOME_AWAY';
export type TournamentStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED';
export type MatchStatus = 'SCHEDULED' | 'PLAYED';
export type Role = 'ADMIN' | 'REFEREE' | 'COACH' | 'PLAYER';
export type MembershipStatus = 'PENDING' | 'ACTIVE';
export type CardType = 'YELLOW' | 'RED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Session {
  token: string;
  user: User;
}

/** The signed-in user's relation to one tournament */
export interface ViewerMembership {
  id: string;
  role: Role;
  status: MembershipStatus;
  teamId: string | null;
  playerId: string | null;
}

export interface Membership extends ViewerMembership {
  tournamentId: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null; email?: string };
  team: { id: string; name: string } | null;
  player: { id: string; name: string; number: number | null } | null;
}

export interface PlayerRequest {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  team: { id: string; name: string };
  requestedBy: { id: string; name: string };
}

export interface Tournament {
  id: string;
  name: string;
  sport: 'FOOTBALL_11';
  format: TournamentFormat;
  status: TournamentStatus;
  rulesPdfPath: string | null;
  createdAt: string;
  _count?: { teams: number; matches: number; likes: number; follows: number };
  /** null when nobody is signed in */
  viewer?: {
    liked: boolean;
    followed: boolean;
    memberships: ViewerMembership[];
  } | null;
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

export interface MatchCard {
  id: string;
  playerId: string;
  type: CardType;
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
  cards: MatchCard[];
  observations: string | null;
  referee: { id: string; name: string } | null;
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
  let response: Response;
  try {
    const token = getToken();
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    // fetch only rejects when the server can't be reached
    throw new Error('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
  }
  if (!response.ok) {
    let message = `La solicitud falló (${response.status})`;
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

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export type AddPlayerResult =
  { status: 'ADDED'; player: Player } | { status: 'PENDING'; request: PlayerRequest };

export const api = {
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      request<Session>('/auth/register', json('POST', data)),
    login: (data: { email: string; password: string }) =>
      request<Session>('/auth/login', json('POST', data)),
    google: (idToken: string) => request<Session>('/auth/google', json('POST', { idToken })),
    facebook: (accessToken: string) =>
      request<Session>('/auth/facebook', json('POST', { accessToken })),
    me: () => request<User & { memberships: ViewerMembership[] }>('/auth/me'),
  },
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
    setLike: (id: string, liked: boolean) =>
      request<Tournament>(`/tournaments/${id}/like`, { method: liked ? 'PUT' : 'DELETE' }),
    setFollow: (id: string, followed: boolean) =>
      request<Tournament>(`/tournaments/${id}/follow`, {
        method: followed ? 'PUT' : 'DELETE',
      }),
  },
  members: {
    list: (tournamentId: string) => request<Membership[]>(`/tournaments/${tournamentId}/members`),
    join: (tournamentId: string, data: { role: Exclude<Role, 'ADMIN'>; teamId?: string }) =>
      request<Membership>(`/tournaments/${tournamentId}/join`, json('POST', data)),
    invite: (
      tournamentId: string,
      data: { email: string; role: Role; teamId?: string; playerId?: string },
    ) => request<Membership>(`/tournaments/${tournamentId}/members`, json('POST', data)),
    approve: (id: string, data: { playerId?: string } = {}) =>
      request<Membership>(`/memberships/${id}/approve`, json('PATCH', data)),
    remove: (id: string) => request<void>(`/memberships/${id}`, { method: 'DELETE' }),
  },
  playerRequests: {
    list: (tournamentId: string) =>
      request<PlayerRequest[]>(`/tournaments/${tournamentId}/player-requests`),
    review: (id: string, decision: 'APPROVED' | 'REJECTED') =>
      request<unknown>(`/player-requests/${id}`, json('PATCH', { decision })),
  },
  teams: {
    list: (tournamentId: string) => request<Team[]>(`/tournaments/${tournamentId}/teams`),
    create: (tournamentId: string, data: { name: string }) =>
      request<Team>(`/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  players: {
    create: (teamId: string, data: { name: string; number?: number; position?: string }) =>
      request<AddPlayerResult>(`/teams/${teamId}/players`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; number?: number; position?: string }) =>
      request<Player>(`/players/${id}`, json('PATCH', data)),
  },
  fixture: {
    generate: (tournamentId: string) =>
      request<Match[]>(`/tournaments/${tournamentId}/fixture`, { method: 'POST' }),
    matches: (tournamentId: string) => request<Match[]>(`/tournaments/${tournamentId}/matches`),
  },
  matches: {
    recordResult: (
      matchId: string,
      data: {
        homeScore: number;
        awayScore: number;
        goals?: { playerId: string; minute?: number }[];
        cards?: { playerId: string; type: CardType; minute?: number }[];
        observations?: string;
      },
    ) =>
      request<Match>(`/matches/${matchId}/result`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    assignReferee: (matchId: string, refereeId: string | null) =>
      request<Match>(`/matches/${matchId}/referee`, json('PATCH', { refereeId })),
  },
  standings: {
    table: (tournamentId: string) =>
      request<StandingsRow[]>(`/tournaments/${tournamentId}/standings`),
    topScorers: (tournamentId: string) =>
      request<TopScorer[]>(`/tournaments/${tournamentId}/top-scorers`),
  },
};
