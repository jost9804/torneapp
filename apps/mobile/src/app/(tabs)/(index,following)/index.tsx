import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TournamentList } from '@/components/tournament/tournament-list';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { Spacing } from '@/constants/theme';
import type { Tournament } from '@/lib/api';
import { useTournaments } from '@/lib/queries';
import { useRecentlyViewed } from '@/lib/recently-viewed';

/** Splits the popular list into what this device opened lately and everything else. */
function splitRecent(all: Tournament[], recentIds: string[]) {
  const byId = new Map(all.map((t) => [t.id, t]));
  const recent = recentIds.flatMap((id) => byId.get(id) ?? []);
  const seen = new Set(recent.map((t) => t.id));
  return { recent, rest: all.filter((t) => !seen.has(t.id)) };
}

/** Explorar: tournaments this device opened lately, then every other one, the most liked first. */
export default function ExploreScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useTournaments('popular');
  const { data: recentIds = [] } = useRecentlyViewed();
  const { recent, rest } = useMemo(() => splitRecent(data ?? [], recentIds), [data, recentIds]);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  return (
    <TournamentList
      sections={[
        { title: 'Vistos recientemente', data: recent },
        { title: recent.length > 0 ? 'Más populares' : undefined, data: rest },
      ]}
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        data.length > 0 && recent.length === 0 ? (
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
