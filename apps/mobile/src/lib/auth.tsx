import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, type Role, type Session, type Tournament, type User } from './api';
import { loadToken, saveToken } from './session';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User };

type AuthContextValue = AuthState & {
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  // Restore the saved session; a token the API rejects counts as signed out
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await loadToken();
      if (!token) {
        if (!cancelled) setState({ status: 'signedOut', user: null });
        return;
      }
      try {
        const me = await api.auth.me();
        if (!cancelled) setState({ status: 'signedIn', user: me });
      } catch {
        await saveToken(null);
        if (!cancelled) setState({ status: 'signedOut', user: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (session: Session) => {
      await saveToken(session.token);
      setState({ status: 'signedIn', user: session.user });
      // Tournaments carry the viewer's likes and roles, so refetch them as this user
      await queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await saveToken(null);
    setState({ status: 'signedOut', user: null });
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** Runs the action when signed in; otherwise opens the login screen first. */
export function useRequireAuth() {
  const { status } = useAuth();
  return useCallback(
    (action: () => void) => {
      if (status === 'signedIn') action();
      else router.push('/login');
    },
    [status],
  );
}

/** What the signed-in user may do in a tournament, from its active memberships. */
export function tournamentAccess(tournament: Tournament | undefined) {
  const memberships = tournament?.viewer?.memberships ?? [];
  const active = memberships.filter((m) => m.status === 'ACTIVE');
  const has = (role: Role) => active.some((m) => m.role === role);
  return {
    memberships,
    isAdmin: has('ADMIN'),
    isReferee: has('REFEREE'),
    coachTeamIds: active.filter((m) => m.role === 'COACH').map((m) => m.teamId),
    playerIds: active.filter((m) => m.role === 'PLAYER').map((m) => m.playerId),
    pending: memberships.filter((m) => m.status === 'PENDING'),
  };
}
