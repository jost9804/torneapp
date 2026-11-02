import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option = { id: string; name: string };

/** Single choice between a handful of named options (teams, roster players). */
export function TeamPicker({
  teams,
  value,
  onChange,
}: {
  teams: Option[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {teams.map((team) => {
        const selected = team.id === value;
        return (
          <Pressable
            key={team.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(selected ? null : team.id)}
            style={[
              styles.chip,
              { backgroundColor: selected ? theme.accent : theme.backgroundElement },
            ]}
          >
            <ThemedText type="small" style={{ color: selected ? theme.onAccent : theme.text }}>
              {team.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
});
