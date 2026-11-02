import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TournamentList } from '@/components/tournament/tournament-list';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import { useTournaments } from '@/lib/queries';

/** Explorar: every tournament, the most liked first. */
export default function ExploreScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useTournaments('popular');

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  return (
    <TournamentList
      tournaments={data}
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        data.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
            Los torneos con más me gusta aparecen primero.
          </ThemedText>
        ) : undefined
      }
      empty={
        <EmptyView
          title="Todavía no hay torneos"
          hint="Crea el primero y comparte el enlace con tus equipos."
          action={<Button title="Crear torneo" onPress={() => router.navigate('/create')} />}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    paddingBottom: Spacing.one,
  },
});
