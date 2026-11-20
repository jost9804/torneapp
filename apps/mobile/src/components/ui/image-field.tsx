import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Crest } from '@/components/ui/crest';
import { Spacing } from '@/constants/theme';
import { type PickedImage, pickSquareImage } from '@/lib/images';

/** Square picture picker: tapping the preview or the link opens the photo library. */
export function ImageField({
  label,
  hint,
  name,
  value,
  onChange,
  size = 88,
}: {
  label: string;
  hint?: string;
  /** Used for the initials placeholder */
  name: string;
  value: PickedImage | null;
  onChange: (image: PickedImage) => void;
  size?: number;
}) {
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);
    try {
      const image = await pickSquareImage();
      if (image) onChange(image);
    } catch {
      setError('No se pudo abrir la imagen. Prueba con otra.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value ? `Cambiar ${label.toLowerCase()}` : `Elegir ${label.toLowerCase()}`}
          onPress={pick}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Crest name={name.trim() || '?'} localUri={value?.uri} size={size} />
        </Pressable>
        <View style={styles.text}>
          <ThemedText type="linkPrimary" onPress={pick} accessibilityRole="button">
            {value ? 'Cambiar imagen' : 'Elegir imagen'}
          </ThemedText>
          {hint ? (
            <ThemedText type="small" themeColor="textSecondary">
              {hint}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
