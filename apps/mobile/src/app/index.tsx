import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Tournament } from '@/lib/api';
import { useTournaments } from '@/lib/queries';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  DRAFT: 'Draft',
  ACTIVE: 'In progress',
  FINISHED: 'Finished',
};

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const theme = useTheme();
  return (
    <Link href={{ pathname: '/tournaments/[id]', params: { id: tournament.id } }} asChild>
      <Pressable
        style={StyleSheet.flatten([
          styles.card,
          { backgroundColor: theme.backgroundElement },
        ])}
      >
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">{tournament.name}</ThemedText>
          <ThemedText type="small" themeColor="accent">
            {STATUS_LABEL[tournament.status]}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Football 11 · {tournament._count?.teams ?? 0} teams ·{' '}
          {tournament._count?.matches ?? 0} matches
        </ThemedText>
      </Pressable>
    </Link>
  );
}

export default function TournamentsScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useTournaments();

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorView message={error.message} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TournamentCard tournament={item} />}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyView
              title="No tournaments yet"
              hint="Create your first tournament to get started."
            />
          }
        />
        <Link href="/new-tournament" asChild>
          <Button title="New tournament" />
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
