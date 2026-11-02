import { Link } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/status-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Tournament } from '@/lib/api';
import { plural } from '@/lib/format';
import { useTournaments } from '@/lib/queries';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  DRAFT: 'Draft',
  ACTIVE: 'In progress',
  FINISHED: 'Finished',
};

function TournamentRow({ tournament }: { tournament: Tournament }) {
  return (
    <Link href={{ pathname: '/tournaments/[id]', params: { id: tournament.id } }} asChild>
      <ListRow>
        <View style={styles.rowText}>
          <ThemedText type="heading" numberOfLines={1}>
            {tournament.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Football 11 · {plural(tournament._count?.teams ?? 0, 'team', 'teams')} ·{' '}
            {plural(tournament._count?.matches ?? 0, 'match', 'matches')}
          </ThemedText>
        </View>
        <ThemedText
          type="smallBold"
          themeColor={tournament.status === 'ACTIVE' ? 'accentText' : 'textSecondary'}
        >
          {STATUS_LABEL[tournament.status]}
        </ThemedText>
      </ListRow>
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
          renderItem={({ item }) => <TournamentRow tournament={item} />}
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
    flexGrow: 1,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
