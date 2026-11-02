import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { TournamentList } from '@/components/tournament/tournament-list';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useFollowedTournaments } from '@/lib/queries';

export default function FollowingScreen() {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';
  const { data, isPending, isError, error, refetch, isRefetching } =
    useFollowedTournaments(signedIn);

  if (auth.status === 'loading') return <LoadingView />;
  if (!signedIn) {
    return (
      <ThemedView style={styles.signedOut}>
        <EmptyView
          title="Sigue tus torneos"
          hint="Entra con tu cuenta y toca Seguir en un torneo para tenerlo siempre a mano aquí."
          action={<Button title="Entrar" onPress={() => router.push('/login')} />}
        />
      </ThemedView>
    );
  }
  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  return (
    <TournamentList
      tournaments={data}
      onRefresh={refetch}
      refreshing={isRefetching}
      empty={
        <EmptyView
          title="Aún no sigues torneos"
          hint="Toca Seguir en un torneo para verlo aquí."
          action={
            <Button
              title="Explorar torneos"
              variant="secondary"
              onPress={() => router.navigate('/')}
            />
          }
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  signedOut: {
    flex: 1,
    padding: Spacing.three,
  },
});
