import { Link } from 'expo-router';
import type { ReactElement } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Crest } from '@/components/ui/crest';
import { ListRow } from '@/components/ui/list-row';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Tournament } from '@/lib/api';
import { plural } from '@/lib/format';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'En juego',
  FINISHED: 'Finalizado',
};

function TournamentRow({ tournament }: { tournament: Tournament }) {
  const likes = tournament._count?.likes ?? 0;
  return (
    <Link href={{ pathname: '/tournaments/[id]', params: { id: tournament.id } }} asChild>
      <ListRow>
        <Crest url={tournament.imageUrl} name={tournament.name} size={48} />
        <View style={styles.rowText}>
          <ThemedText type="heading" numberOfLines={1}>
            {tournament.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {plural(tournament._count?.teams ?? 0, 'equipo', 'equipos')} ·{' '}
            {plural(likes, 'me gusta', 'me gusta')}
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

export type TournamentSection = { title?: string; data: Tournament[] };

/** The list is the screen's first child so the tab bar and header inset it on iOS. */
export function TournamentList({
  tournaments,
  sections,
  onRefresh,
  refreshing,
  header,
  empty,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  header?: ReactElement;
  empty: ReactElement;
} & (
  | { tournaments: Tournament[]; sections?: never }
  | { sections: TournamentSection[]; tournaments?: never }
)) {
  const theme = useTheme();
  const visible = (sections ?? [{ data: tournaments ?? [] }]).filter((s) => s.data.length > 0);
  return (
    <SectionList
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      sections={visible}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TournamentRow tournament={item} />}
      renderSectionHeader={({ section }) =>
        section.title ? (
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            accessibilityRole="header"
            style={styles.sectionTitle}
          >
            {section.title}
          </ThemedText>
        ) : null
      }
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
