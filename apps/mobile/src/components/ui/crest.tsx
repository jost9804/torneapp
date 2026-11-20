import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { imageUrl } from '@/lib/images';

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 2 || /^[A-Z0-9]/.test(w));
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

/**
 * A tournament's picture or a team's crest, square with soft corners.
 * Without one it shows the initials on the turf colour, so lists keep their rhythm.
 */
export function Crest({
  url,
  name,
  size = 44,
  localUri,
}: {
  url?: string | null;
  name: string;
  size?: number;
  /** A just-picked picture that is not uploaded yet */
  localUri?: string | null;
}) {
  const theme = useTheme();
  const source = localUri ?? imageUrl(url);
  const box = { width: size, height: size, borderRadius: Math.max(Radius.sm, size * 0.22) };

  if (source) {
    return (
      <Image
        source={source}
        style={[box, { backgroundColor: theme.backgroundSelected }]}
        contentFit="cover"
        transition={150}
        accessible={false}
      />
    );
  }
  return (
    <View style={[box, styles.fallback, { backgroundColor: theme.brand }]} accessible={false}>
      <ThemedText
        style={{
          color: theme.onBrand,
          fontFamily: FontFamily.display,
          fontSize: size * 0.4,
          lineHeight: size * 0.48,
        }}
      >
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
