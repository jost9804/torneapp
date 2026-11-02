import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A list row separated by a chalk line, like a line on the referee's sheet. */
export function ListRow({ style, onPress, ...rest }: PressableProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={(state) => [
        styles.row,
        { borderColor: theme.border },
        state.pressed && { backgroundColor: theme.backgroundSelected },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: 1,
  },
});
