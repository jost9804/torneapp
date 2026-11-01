/**
 * TorneApp identity: the amateur matchday. Chalk-white pitch lines, referee-sheet ink,
 * synthetic-turf green, safety-orange training bibs, and yellow/red cards.
 * Every text/background pair below meets WCAG AA (4.5:1).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Referee-sheet ink */
    text: '#10243E',
    textSecondary: '#56657A',
    /** Chalk */
    background: '#F4F6F3',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3E8E4',
    border: '#D3DAD5',
    /** Bib orange: primary action fill. Too light for text, use `accentText`. */
    accent: '#FF5A1F',
    onAccent: '#10243E',
    accentText: '#B53A0C',
    /** Turf: tournament header surfaces */
    brand: '#1F5C4A',
    onBrand: '#F4F6F3',
    /** Yellow card */
    caution: '#F2C200',
    /** Red card */
    danger: '#C8213A',
    onDanger: '#FFFFFF',
  },
  dark: {
    text: '#EEF2EE',
    textSecondary: '#9FB0A8',
    /** Floodlit pitch at night */
    background: '#0F1C18',
    backgroundElement: '#172823',
    backgroundSelected: '#22352F',
    border: '#2A3D37',
    accent: '#FF6A2E',
    onAccent: '#10243E',
    accentText: '#FF8A57',
    brand: '#173A30',
    onBrand: '#EEF2EE',
    caution: '#F2C200',
    danger: '#FF6B78',
    onDanger: '#2A0A0F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Bundled families, loaded in the root layout. Static font files carry their own weight,
 * so styles set `fontFamily` and never `fontWeight`.
 */
export const FontFamily = {
  /** Big Shoulders: scores, positions, points and screen titles */
  display: 'BigShoulders_800ExtraBold',
  displayBold: 'BigShoulders_700Bold',
  /** Atkinson Hyperlegible Next: everything people read, built for legibility in sunlight */
  body: 'AtkinsonHyperlegibleNext_400Regular',
  bodyMedium: 'AtkinsonHyperlegibleNext_500Medium',
  bodySemiBold: 'AtkinsonHyperlegibleNext_600SemiBold',
} as const;

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  web: { mono: 'var(--font-mono)' },
  default: { mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
