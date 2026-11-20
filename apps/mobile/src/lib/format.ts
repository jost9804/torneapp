import type { ClubRole, Role } from './api';

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export const CLUB_ROLE_LABEL: Record<ClubRole, string> = {
  OWNER: 'Creador',
  ADMIN: 'Administrador',
  COACH: 'Técnico',
  SPOKESPERSON: 'Vocero',
  CAPTAIN: 'Capitán',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  REFEREE: 'Árbitro',
  COACH: 'Técnico',
  PLAYER: 'Jugador',
};
