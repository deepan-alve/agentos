import { StyleSheet, Text } from 'react-native';

import { F } from '@/src/theme/colors';

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

export function seedToAccent(seed: string): string {
  const hue = hashStr(seed) % 360;
  return `hsl(${hue}, 62%, 64%)`;
}

function firstLetter(name: string): string {
  const m = name.match(/[A-Za-z0-9]/);
  return (m?.[0] ?? '?').toUpperCase();
}

export function GeneratedIcon({
  seed,
  name,
  size,
}: {
  seed: string;
  name: string;
  size: number;
}) {
  const accent = seedToAccent(seed);
  const letter = firstLetter(name);
  const fontSize = Math.round(size * 1.6);

  return (
    <Text
      style={[
        styles.letter,
        {
          fontSize,
          lineHeight: fontSize * 1.0,
          color: accent,
        },
      ]}
      allowFontScaling={false}
    >
      {letter}
    </Text>
  );
}

const styles = StyleSheet.create({
  letter: {
    fontFamily: F.serifItalic,
    textAlign: 'center',
    letterSpacing: -2,
    includeFontPadding: false,
  },
});
