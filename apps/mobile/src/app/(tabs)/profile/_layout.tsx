import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Spacing, STACK_SCREEN_OPTIONS } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const openSettings = () => router.push('/profile/settings');

/** Android and web header button; iOS uses the native toolbar item instead. */
function SettingsButton() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ajustes"
      hitSlop={Spacing.two}
      onPress={openSettings}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
    >
      <SymbolView
        name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
        size={24}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

export default function ProfileStack() {
  const isIOS = Platform.OS === 'ios';
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="index"
        options={{ title: 'Perfil', headerRight: isIOS ? undefined : () => <SettingsButton /> }}
      >
        {isIOS ? (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="gearshape"
              accessibilityLabel="Ajustes"
              onPress={openSettings}
            />
          </Stack.Toolbar>
        ) : null}
      </Stack.Screen>
      <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.one,
    marginHorizontal: Spacing.two,
  },
});
