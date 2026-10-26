// Custom SVG editorial illustrations for Tassel advisory stories.
// Adheres strictly to: Custom SVG illustrations only (no emojis, no generic icons).
// Harmonious brand palette: forest (#2E6A4F), maize gold (#E2B33C), clay (#A8472A), ground (#101D16), paper (#F4F1E6).

import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type ArtProps = {
  size?: number;
  width?: number;
  height?: number;
};

export function SoilPrepArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="soilSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F4F1E6" />
          <Stop offset="100%" stopColor="#EAE5D5" />
        </LinearGradient>
        <LinearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8C6A3E" />
          <Stop offset="100%" stopColor="#5D4037" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#soilSky)" />
      {/* Furrow ridges */}
      <Path d="M0 75 Q40 60 80 75 T160 75 L160 120 L0 120 Z" fill="url(#soilGrad)" />
      <Path d="M0 85 Q40 70 80 85 T160 85 L160 120 L0 120 Z" fill="#4E342E" />
      <Path d="M0 98 Q40 85 80 98 T160 98 L160 120 L0 120 Z" fill="#3E2723" />
      {/* Spade tool */}
      <G transform="translate(100, 25) rotate(25)">
        <Rect x="16" y="0" width="5" height="50" rx="2" fill="#7A5B3A" />
        <Path d="M12 45 L25 45 L22 65 L15 65 Z" fill="#78909C" />
        <Path d="M10 0 H27 V8 H10 Z" fill="#5D4037" />
      </G>
      {/* Clods & tilth */}
      <Circle cx="35" cy="88" r="3.5" fill="#A1887F" />
      <Circle cx="55" cy="94" r="2.5" fill="#8D6E63" />
      <Circle cx="125" cy="90" r="3" fill="#A1887F" />
      <Circle cx="140" cy="98" r="2" fill="#8D6E63" />
      {/* Sun glow */}
      <Circle cx="30" cy="30" r="14" fill="#E2B33C" opacity={0.25} />
      <Circle cx="30" cy="30" r="8" fill="#E2B33C" />
    </Svg>
  );
}

export function PlantingSeedArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="plantSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F0F4EC" />
          <Stop offset="100%" stopColor="#E2EBE0" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#plantSky)" />
      {/* Trench furrow */}
      <Path d="M0 65 Q45 60 80 70 T160 62 L160 120 L0 120 Z" fill="#6D4C41" />
      <Path d="M0 80 Q50 85 80 92 Q110 85 160 80 L160 120 L0 120 Z" fill="#4E342E" />
      {/* Soil depth indicator line 5cm */}
      <Path d="M40 68 V88" stroke="#E2B33C" strokeWidth="2" strokeDasharray="3 3" />
      <Path d="M36 68 H44 M36 88 H44" stroke="#E2B33C" strokeWidth="2" />
      {/* Certified Seed placed in furrow */}
      <Ellipse cx="80" cy="85" rx="9" ry="6" fill="#E2B33C" />
      <Path d="M80 82 Q86 85 80 88" stroke="#C9973A" strokeWidth="1.5" fill="none" />
      {/* Root radicle sprout */}
      <Path d="M85 86 Q95 90 92 98" stroke="#C8E6C9" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Fertilizer granule placement in furrow */}
      <Circle cx="64" cy="86" r="3" fill="#90A4AE" />
      <Circle cx="60" cy="89" r="2.5" fill="#78909C" />
      <Circle cx="98" cy="87" r="3" fill="#90A4AE" />
      {/* Gentle moisture droplets */}
      <Path d="M78 40 Q80 34 82 40 Q84 45 80 47 Q76 45 78 40 Z" fill="#64B5F6" />
      <Path d="M110 32 Q112 28 114 32 Q116 36 112 37 Q108 36 110 32 Z" fill="#90CAF9" />
    </Svg>
  );
}

export function HillingEmergenceArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="hillSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F9FBE7" />
          <Stop offset="100%" stopColor="#E8F5E9" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#hillSky)" />
      {/* Hilled mound */}
      <Path d="M0 90 Q40 85 60 70 Q80 55 100 70 Q120 85 160 90 L160 120 L0 120 Z" fill="#5D4037" />
      <Path d="M10 98 Q50 92 80 78 Q110 92 150 98 L160 120 L0 120 Z" fill="#4E342E" />
      {/* Plant emerging through ridge */}
      <Path d="M80 75 V30" stroke="#2E6A4F" strokeWidth="4" strokeLinecap="round" />
      {/* Lush leaves */}
      <Path d="M80 50 Q60 40 50 48 Q62 58 80 54 Z" fill="#4CAF50" />
      <Path d="M80 42 Q100 32 110 40 Q98 50 80 46 Z" fill="#388E3C" />
      <Path d="M80 32 Q65 18 55 24 Q68 32 80 32 Z" fill="#66BB6A" />
      <Path d="M80 30 Q95 16 105 22 Q92 30 80 30 Z" fill="#43A047" />
      {/* Hilling arrows showing earthing up around stem */}
      <Path d="M35 78 L52 70 M52 70 L48 76 M52 70 L45 68" stroke="#E2B33C" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M125 78 L108 70 M108 70 L112 76 M108 70 L115 68" stroke="#E2B33C" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function WeedingScoutingArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="scoutSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F4F8F4" />
          <Stop offset="100%" stopColor="#E4ECE4" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#scoutSky)" />
      {/* Healthy crop leaf */}
      <Path d="M30 90 Q50 30 110 35 Q130 65 70 95 Z" fill="#6E9B5A" />
      <Path d="M30 90 Q65 60 110 35" stroke="#4F7D5A" strokeWidth="2.5" fill="none" />
      <Path d="M55 72 Q70 65 78 52" stroke="#4F7D5A" strokeWidth="1.5" fill="none" />
      <Path d="M75 58 Q90 52 98 42" stroke="#4F7D5A" strokeWidth="1.5" fill="none" />
      {/* Magnifying scout loupe */}
      <G transform="translate(68, 20)">
        <Circle cx="30" cy="30" r="22" fill="#FFFFFF" fillOpacity={0.85} stroke="#2E6A4F" strokeWidth="4" />
        <Rect x="46" y="46" width="6" height="26" rx="3" transform="rotate(-45 46 46)" fill="#7A5B3A" />
        {/* Inspection target inside lens */}
        <Circle cx="30" cy="30" r="6" fill="#E2B33C" opacity={0.3} />
        <Circle cx="30" cy="30" r="3" fill="#2E6A4F" />
      </G>
    </Svg>
  );
}

export function SprayingSafetyArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="spraySky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F4F1E6" />
          <Stop offset="100%" stopColor="#ECE6D6" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#spraySky)" />
      {/* Safety shield */}
      <Path d="M80 18 Q120 18 120 50 Q120 85 80 102 Q40 85 40 50 Q40 18 80 18 Z" fill="#E8F5E9" stroke="#2E6A4F" strokeWidth="3" />
      {/* Spray lance & fine mist */}
      <Path d="M45 40 L75 55" stroke="#37474F" strokeWidth="3.5" strokeLinecap="round" />
      <Circle cx="76" cy="55.5" r="3" fill="#2E6A4F" />
      {/* Fine droplet cone */}
      <G opacity={0.85}>
        <Circle cx="86" cy="58" r="2" fill="#2E6A4F" />
        <Circle cx="94" cy="54" r="2.5" fill="#2E6A4F" />
        <Circle cx="96" cy="64" r="2" fill="#2E6A4F" />
        <Circle cx="104" cy="50" r="1.8" fill="#2E6A4F" />
        <Circle cx="105" cy="62" r="2.2" fill="#2E6A4F" />
        <Circle cx="106" cy="72" r="2" fill="#2E6A4F" />
      </G>
      {/* Safe protected plant leaf */}
      <Path d="M68 85 Q80 65 98 72 Q94 88 80 90 Z" fill="#66BB6A" />
      <Path d="M72 84 Q83 75 92 73" stroke="#2E7D32" strokeWidth="1.5" fill="none" />
    </Svg>
  );
}

export function TassellingArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="tasselSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFF8E1" />
          <Stop offset="100%" stopColor="#F9FBE7" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#tasselSky)" />
      {/* Tall maize stalk */}
      <Path d="M80 120 V35" stroke="#557F45" strokeWidth="5" strokeLinecap="round" />
      {/* Silking ear cob */}
      <Path d="M82 72 Q98 62 102 78 Q92 90 82 82 Z" fill="#E2B64A" />
      {/* Golden silks */}
      <Path d="M96 64 Q106 58 112 68 M98 68 Q110 65 116 76 M95 72 Q108 72 114 82" stroke="#C9973A" strokeWidth="1.5" strokeLinecap="round" />
      {/* Spreading golden tassel crown */}
      <Path d="M80 35 Q80 15 80 8" stroke="#E2B33C" strokeWidth="3" strokeLinecap="round" />
      <Path d="M80 30 Q70 18 55 15" stroke="#E2B33C" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M80 30 Q90 18 105 15" stroke="#E2B33C" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M80 32 Q66 25 50 28" stroke="#E2B33C" strokeWidth="2" strokeLinecap="round" />
      <Path d="M80 32 Q94 25 110 28" stroke="#E2B33C" strokeWidth="2" strokeLinecap="round" />
      {/* Arching broad leaves */}
      <Path d="M80 95 Q40 85 25 105 Q55 98 80 98 Z" fill="#4F7D5A" />
      <Path d="M80 82 Q120 72 135 92 Q105 85 80 85 Z" fill="#3F6A49" />
    </Svg>
  );
}

export function HarvestStorageArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="harvSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#EFEBE9" />
          <Stop offset="100%" stopColor="#D7CCC8" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#harvSky)" />
      {/* Hermetic storage bag */}
      <Path d="M100 45 Q125 43 130 70 L134 110 Q115 114 96 110 L100 45 Z" fill="#2E6A4F" />
      <Path d="M98 46 Q115 42 128 46" stroke="#E2B33C" strokeWidth="3" strokeLinecap="round" />
      <Rect x="106" y="65" width="16" height="24" rx="2" fill="#F4F1E6" opacity={0.9} />
      {/* Wooden crate */}
      <Rect x="20" y="60" width="70" height="48" rx="6" fill="#8D6E63" />
      <Rect x="22" y="64" width="66" height="10" rx="2" fill="#A1887F" />
      <Rect x="22" y="78" width="66" height="10" rx="2" fill="#A1887F" />
      <Rect x="22" y="92" width="66" height="10" rx="2" fill="#A1887F" />
      {/* Golden produce heaped in crate */}
      <Circle cx="38" cy="56" r="10" fill="#E2B64A" />
      <Circle cx="55" cy="52" r="11" fill="#E2B33C" />
      <Circle cx="72" cy="56" r="10" fill="#C9A26E" />
      <Circle cx="46" cy="46" r="9" fill="#D0603F" />
      <Circle cx="64" cy="44" r="9.5" fill="#E2B64A" />
    </Svg>
  );
}

export function WatchOutDiseaseArt({ size = 120, width = size, height = size * 0.75 }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" fill="none">
      <Defs>
        <LinearGradient id="warnSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FBE9E7" />
          <Stop offset="100%" stopColor="#FFCCBC" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="120" rx="16" fill="url(#warnSky)" />
      {/* Alert shield */}
      <Path d="M80 18 Q115 18 115 48 Q115 80 80 98 Q45 80 45 48 Q45 18 80 18 Z" fill="#FFF3E0" stroke="#A8472A" strokeWidth="3" />
      {/* Disease leaf with necrotic lesions */}
      <Path d="M62 72 Q75 45 98 48 Q94 66 82 72 Z" fill="#81C784" />
      {/* Blight lesion spots */}
      <Circle cx="84" cy="56" r="4.5" fill="#5D4037" />
      <Circle cx="83.5" cy="55.5" r="3" fill="#3E2723" />
      <Circle cx="75" cy="62" r="3" fill="#5D4037" />
      {/* Warning exclamation inside shield */}
      <Circle cx="80" cy="38" r="4" fill="#A8472A" />
      <Rect x="78" y="46" width="4" height="12" rx="2" fill="#A8472A" />
    </Svg>
  );
}

/** Get matching custom SVG editorial illustration for an activity or stage */
export function getActionIllustration(activityText: string, stageName: string, index: number) {
  const t = (activityText + ' ' + stageName).toLowerCase();

  if (/plough|harrow|tilth|soil sample|clear weed|residue|rotate/i.test(t)) {
    return <SoilPrepArt />;
  }
  if (/plant|seed|sow|transplant|tuber|hole|furrow/i.test(t)) {
    return <PlantingSeedArt />;
  }
  if (/hill|emergence|goti|ridge|weeding|knee/i.test(t)) {
    return <HillingEmergenceArt />;
  }
  if (/scout|inspect|caterpillar|armyworm|aphid|trap|whitefl/i.test(t)) {
    return <WeedingScoutingArt />;
  }
  if (/spray|fungicide|blight|protectant|copper|mancozeb/i.test(t)) {
    return <SprayingSafetyArt />;
  }
  if (/tassel|silk|flower|water|pollin/i.test(t)) {
    return <TassellingArt />;
  }
  if (/harvest|storage|dry|bag|crate|moisture/i.test(t)) {
    return <HarvestStorageArt />;
  }

  // Fallback cycled
  const cycled = [SoilPrepArt, PlantingSeedArt, HillingEmergenceArt, WeedingScoutingArt, SprayingSafetyArt, TassellingArt, HarvestStorageArt];
  const Comp = cycled[index % cycled.length];
  return <Comp />;
}
