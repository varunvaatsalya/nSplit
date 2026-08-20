import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Tight crop around the mark (original canvas was 698×513). */
const VIEWBOX = '158 56 376 421';
const ASPECT = 376 / 421;

const LOGO_PATH =
  'M346 142 L269 74 C251 59 232 56 213 60 C193 64 177 78 166 96 C160 106 158 117 158 126 L158 407 C158 430 169 450 188 462 C204 472 225 477 243 472 C255 469 265 463 272 457 L347 393 L420 456 C437 471 458 477 477 473 C498 469 515 455 526 437 C532 426 534 414 534 402 L534 121 C534 100 525 84 510 73 C495 62 477 58 461 60 C445 61 431 68 420 77 L346 142 Z M346 142 L439 223 C450 233 455 247 455 261 C455 278 451 292 442 307 C436 317 427 325 418 329 L347 268 L347 391 L253 311 C243 302 238 290 238 276 C238 260 242 245 250 231 C256 221 265 212 274 205 L346 265 Z';

type LogoProps = {
  color: string;
  size?: number;
};

export function NsplitLogo({ color, size = 28 }: LogoProps) {
  const height = size;
  const width = Math.round(size * ASPECT);

  return (
    <Svg
      width={width}
      height={height}
      viewBox={VIEWBOX}
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="nSplit">
      <Path d={LOGO_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );
}

type BrandProps = {
  color: string;
  logoSize?: number;
  fontSize?: number;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
};

export function NsplitBrand({
  color,
  logoSize = 32,
  fontSize = 28,
  align = 'left',
  style,
}: BrandProps) {
  return (
    <View style={[styles.brand, align === 'center' && styles.brandCenter, style]}>
      <NsplitLogo color={color} size={logoSize} />
      <Text style={[styles.wordmark, { color, fontSize }]}>nSplit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandCenter: {
    justifyContent: 'center',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.6,
  },
});
