import { TabList, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Material Symbols outlines, the same family Android uses for the native tab bar
const ICON_PATHS = {
  explore:
    'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
  following:
    'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  create:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  profile:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z',
} as const;

// The trigger's ref types predate RN 0.88's element refs; the button doesn't need one
type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & {
  icon: keyof typeof ICON_PATHS;
  label: string;
};

function TabButton({ icon, label, isFocused, ...props }: TabButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.accentText : theme.textSecondary;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={styles.tab}
    >
      <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
        <path d={ICON_PATHS[icon]} fill={color} />
      </svg>
      <ThemedText type="smallBold" style={{ color, fontSize: 12, lineHeight: 16 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Browsers get a plain bottom bar; phones use the native tab bar in `_layout.tsx`. */
export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList
        style={[styles.bar, { backgroundColor: theme.background, borderColor: theme.border }]}
      >
        <TabTrigger name="(index)" href="/(tabs)/(index)" asChild>
          <TabButton icon="explore" label="Explorar" />
        </TabTrigger>
        <TabTrigger name="(following)" href="/(tabs)/(following)/following" asChild>
          <TabButton icon="following" label="Siguiendo" />
        </TabTrigger>
        <TabTrigger name="create" href="/create" asChild>
          <TabButton icon="create" label="Crear" />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton icon="profile" label="Perfil" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
});
