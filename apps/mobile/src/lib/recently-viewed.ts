import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const KEY = 'torneapp.recentlyViewed';
const MAX_ITEMS = 10;
const queryKey = ['recentlyViewed'] as const;

/** Tournament ids this device opened, most recent first. Kept on the device, not the account. */
async function load(): Promise<string[]> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(KEY) ?? null)
        : await SecureStore.getItemAsync(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function save(ids: string[]) {
  const raw = JSON.stringify(ids);
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {
    // Not remembered on the next launch; the list still works for this run
  }
}

export function useRecentlyViewed() {
  return useQuery({ queryKey, queryFn: load, staleTime: Infinity });
}

/** Moves the tournament to the front of the list once it is open. */
export function useRecordView(tournamentId: string | undefined) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: async (id: string) => {
      const current = queryClient.getQueryData<string[]>(queryKey) ?? (await load());
      const next = [id, ...current.filter((other) => other !== id)].slice(0, MAX_ITEMS);
      queryClient.setQueryData(queryKey, next);
      await save(next);
    },
  });

  useEffect(() => {
    if (tournamentId) mutate(tournamentId);
  }, [tournamentId, mutate]);
}
