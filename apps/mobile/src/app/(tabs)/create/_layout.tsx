import { Stack } from 'expo-router';

import { STACK_SCREEN_OPTIONS } from '@/constants/theme';

export default function CreateStack() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Nuevo torneo' }} />
    </Stack>
  );
}
