import { Stack } from 'expo-router';

import { STACK_SCREEN_OPTIONS } from '@/constants/theme';

const TITLES: Record<string, string> = { index: 'Explorar', following: 'Siguiendo' };

// Each copy of this shared group starts on its own screen; without this both open `index`
export const unstable_settings = {
  anchor: 'index',
  following: { anchor: 'following' },
};

/** Shared by the Explorar and Siguiendo tabs so both open tournaments inside their own tab. */
export default function TournamentsStack({ segment }: { segment: string }) {
  const screen = segment.match(/\((.*)\)/)?.[1] ?? 'index';

  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name={screen} options={{ title: TITLES[screen] }} />
      <Stack.Screen name="tournaments/[id]" options={{ title: 'Torneo' }} />
      <Stack.Screen name="members/[id]" options={{ title: 'Miembros' }} />
    </Stack>
  );
}
