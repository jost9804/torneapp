import type { Role } from './api';

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  REFEREE: 'Árbitro',
  COACH: 'Técnico',
  PLAYER: 'Jugador',
};
