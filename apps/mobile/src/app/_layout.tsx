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

import { Colors, FontFamily } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';

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

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navigationTheme(colorScheme)}>
          <Stack
            screenOptions={{
              // iOS 26 defaults to a see-through Liquid Glass bar that content scrolls under;
              // keep the solid matchday header so nothing hides behind the title.
              headerTransparent: false,
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: FontFamily.displayBold, fontSize: 22 },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'TorneApp' }} />
            <Stack.Screen
              name="new-tournament"
              options={{ title: 'Nuevo torneo', presentation: 'modal' }}
            />
            <Stack.Screen name="tournaments/[id]" options={{ title: 'Torneo' }} />
            <Stack.Screen
              name="matches/[id]"
              options={{ title: 'Partido', presentation: 'modal' }}
            />
            <Stack.Screen name="members/[id]" options={{ title: 'Miembros' }} />
            <Stack.Screen
              name="join/[id]"
              options={{ title: 'Unirme al torneo', presentation: 'modal' }}
            />
            <Stack.Screen name="login" options={{ title: 'Entrar', presentation: 'modal' }} />
            <Stack.Screen
              name="register"
              options={{ title: 'Crear cuenta', presentation: 'modal' }}
            />
            <Stack.Screen name="account" options={{ title: 'Mi cuenta' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
