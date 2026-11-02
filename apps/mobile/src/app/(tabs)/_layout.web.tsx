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
  settings:
    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
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
        <TabTrigger name="settings" href="/settings" asChild>
          <TabButton icon="settings" label="Ajustes" />
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
