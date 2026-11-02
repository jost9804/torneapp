import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { BigShoulders_700Bold, BigShoulders_800ExtraBold } from '@expo-google-fonts/big-shoulders';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, STACK_SCREEN_OPTIONS } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { restoreAppearance } from '@/lib/preferences';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

function navigationTheme(scheme: 'light' | 'dark'): typeof DefaultTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accentText,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [fontsLoaded, fontError] = useFonts({
    BigShoulders_700Bold,
    BigShoulders_800ExtraBold,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    restoreAppearance();
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navigationTheme(colorScheme)}>
          {/* Tabs sit at the root; the modals below open over whichever tab is active */}
          <Stack screenOptions={STACK_SCREEN_OPTIONS}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="matches/[id]"
              options={{ title: 'Partido', presentation: 'modal' }}
            />
            <Stack.Screen
              name="join/[id]"
              options={{ title: 'Unirme al torneo', presentation: 'modal' }}
            />
            <Stack.Screen name="login" options={{ title: 'Entrar', presentation: 'modal' }} />
            <Stack.Screen
              name="register"
              options={{ title: 'Crear cuenta', presentation: 'modal' }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
