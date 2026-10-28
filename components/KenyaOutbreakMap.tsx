// Kenya Outbreak Map — custom SVG visualization of Kenya counties.
// Highlights the farmer's county and shows pulsing outbreak markers for active outbreaks (>= 2 farmers).
// Pure SVG implementation using react-native-svg (no third-party heavy map views).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { C, FONT } from '../lib/theme';
import type { Outbreak } from '../lib/data';
import { useLang } from '../lib/i18n';

type Props = {
  farmerCounty?: string | null;
  outbreaks: Outbreak[];
  onSelectCounty?: (county: string) => void;
};

// Kenyan county centroids (approximate agricultural centroids)
export const COUNTY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Uasin Gishu': { lat: 0.5143, lng: 35.2698 },
  'Trans Nzoia': { lat: 1.0157, lng: 35.0062 },
  'Nakuru': { lat: -0.3031, lng: 36.0800 },
  'Kiambu': { lat: -1.1714, lng: 36.8356 },
  'Meru': { lat: 0.0463, lng: 37.6559 },
  'Nyandarua': { lat: -0.1804, lng: 36.5230 },
  'Nandi': { lat: 0.1836, lng: 35.1269 },
  'Kericho': { lat: -0.3677, lng: 35.2831 },
  'Kakamega': { lat: 0.2827, lng: 34.7519 },
  'Bungoma': { lat: 0.5695, lng: 34.5584 },
  'Machakos': { lat: -1.5177, lng: 37.2634 },
  'Nyeri': { lat: -0.4201, lng: 36.9476 },
  'Kisumu': { lat: -0.0917, lng: 34.7680 },
  'Kirinyaga': { lat: -0.4989, lng: 37.2803 },
  "Murang'a": { lat: -0.7839, lng: 37.0400 },
  'Embu': { lat: -0.5344, lng: 37.4566 },
  'Bomet': { lat: -0.7813, lng: 35.3416 },
  'Narok': { lat: -1.0783, lng: 35.8601 },
  'Kajiado': { lat: -2.0981, lng: 36.7820 },
  'Makueni': { lat: -1.8041, lng: 37.6300 },
  'Kilifi': { lat: -3.5107, lng: 39.9093 },
  'Mombasa': { lat: -4.0435, lng: 39.6682 },
  'Kwale': { lat: -4.1744, lng: 39.4606 },
  'Taita-Taveta': { lat: -3.3161, lng: 38.3582 },
  'Kitui': { lat: -1.3683, lng: 38.0106 },
  'Tharaka-Nithi': { lat: -0.2970, lng: 37.8739 },
  'Laikipia': { lat: 0.3606, lng: 36.7820 },
  'Baringo': { lat: 0.5200, lng: 35.9600 },
  'Elgeyo-Marakwet': { lat: 0.6700, lng: 35.5300 },
  'West Pokot': { lat: 1.6200, lng: 35.1200 },
  'Turkana': { lat: 3.1167, lng: 35.5967 },
  'Marsabit': { lat: 2.3344, lng: 37.9900 },
  'Samburu': { lat: 1.2500, lng: 36.9000 },
  'Isiolo': { lat: 0.3546, lng: 37.5822 },
  'Garissa': { lat: -0.4532, lng: 39.6460 },
  'Wajir': { lat: 1.7471, lng: 40.0573 },
  'Mandera': { lat: 3.9373, lng: 41.8569 },
  'Tana River': { lat: -1.5000, lng: 39.8000 },
  'Lamu': { lat: -2.2717, lng: 40.9020 },
  'Busia': { lat: 0.4608, lng: 34.1115 },
  'Siaya': { lat: 0.0607, lng: 34.2882 },
  'Homa Bay': { lat: -0.5273, lng: 34.4571 },
  'Migori': { lat: -1.0634, lng: 34.4731 },
  'Kisii': { lat: -0.6817, lng: 34.7667 },
  'Nyamira': { lat: -0.5633, lng: 34.9358 },
  'Vihiga': { lat: 0.0767, lng: 34.7222 },
  'Nairobi': { lat: -1.2921, lng: 36.8219 },
};

const MAP_W = 320;
const MAP_H = 260;
const MIN_LON = 33.8;
const MAX_LON = 42.0;
const MIN_LAT = -4.8;
const MAX_LAT = 5.0;

function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = Math.max(10, Math.min(MAP_W - 10, ((lng - MIN_LON) / (MAX_LON - MIN_LON)) * MAP_W));
  const y = Math.max(10, Math.min(MAP_H - 10, ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * MAP_H));
  return { x, y };
}

export function KenyaOutbreakMap({ farmerCounty, outbreaks }: Props) {
  const { t } = useLang();
  // Aggregate outbreaks by county
  const countyOutbreakCounts = new Map<string, { farmers: number; diseases: string[] }>();
  outbreaks.forEach((o) => {
    const existing = countyOutbreakCounts.get(o.county) ?? { farmers: 0, diseases: [] };
    existing.farmers += o.farmers;
    if (!existing.diseases.includes(o.disease)) existing.diseases.push(o.disease);
    countyOutbreakCounts.set(o.county, existing);
  });

  const farmerPos = farmerCounty && COUNTY_COORDS[farmerCounty] ? geoToSvg(COUNTY_COORDS[farmerCounty].lat, COUNTY_COORDS[farmerCounty].lng) : null;

  return (
    <View style={st.container}>
      <Svg width="100%" height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Defs>
          <LinearGradient id="kenyaBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1E3A2A" />
            <Stop offset="100%" stopColor="#101D16" />
          </LinearGradient>
          <LinearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#2A4B37" />
            <Stop offset="100%" stopColor="#1F382A" />
          </LinearGradient>
        </Defs>

        {/* Dark Map Canvas */}
        <Rect width={MAP_W} height={MAP_H} rx={16} fill="url(#kenyaBg)" />

        {/* Simplified Kenya Country Boundary Geometry */}
        <Path
          d="M 68 32 L 140 18 L 220 22 L 295 40 L 290 95 L 260 140 L 245 190 L 210 245 L 180 250 L 140 215 L 105 210 L 65 190 L 40 155 L 45 105 L 60 70 Z"
          fill="url(#landGrad)"
          stroke="#385F47"
          strokeWidth="1.5"
        />

        {/* Indian Ocean indication */}
        <Path d="M 210 245 L 245 190 L 260 140 L 310 170 L 310 250 Z" fill="#172920" opacity={0.6} />

        {/* Lake Victoria indication */}
        <Path d="M 40 145 Q 25 155 35 175 Q 55 180 50 160 Z" fill="#172920" />
        <SvgText x="28" y="165" fill="#8FC2A5" fontSize="8" fontFamily={FONT.body} opacity={0.6}>
          L. Victoria
        </SvgText>

        {/* Outbreak pins for each reporting county */}
        {[...countyOutbreakCounts.entries()].map(([cName, data]) => {
          const coords = COUNTY_COORDS[cName];
          if (!coords) return null;
          const { x, y } = geoToSvg(coords.lat, coords.lng);
          return (
            <G key={cName}>
              {/* Pulsing halo */}
              <Circle cx={x} cy={y} r={14} fill={C.error} opacity={0.25} />
              {/* Outer ring */}
              <Circle cx={x} cy={y} r={8} fill={C.error} opacity={0.8} />
              {/* Core point */}
              <Circle cx={x} cy={y} r={4} fill="#FFFFFF" />
              {/* Label */}
              <SvgText x={x + 10} y={y + 4} fill="#FFFFFF" fontSize="10" fontFamily={FONT.bodyBold}>
                {cName} ({data.farmers})
              </SvgText>
            </G>
          );
        })}

        {/* Farmer's County Highlight */}
        {farmerPos ? (
          <G>
            <Circle cx={farmerPos.x} cy={farmerPos.y} r={18} fill="none" stroke={C.brandGold} strokeWidth="2.5" strokeDasharray="4 2" />
            <Circle cx={farmerPos.x} cy={farmerPos.y} r={5} fill={C.brandGold} />
            {/* one string: two text children were drawn on top of each other ("Uasin Gishu" over "(You)") */}
            {/* anchored away from the nearer edge: centred, "Uasin Gishu (wewe)" was cut at the left */}
            <SvgText
              x={farmerPos.x < MAP_W * 0.35 ? farmerPos.x - 14 : farmerPos.x > MAP_W * 0.65 ? farmerPos.x + 14 : farmerPos.x}
              y={farmerPos.y - 26}
              fill={C.brandGold}
              fontSize="13"
              fontFamily={FONT.bodyBold}
              textAnchor={farmerPos.x < MAP_W * 0.35 ? 'start' : farmerPos.x > MAP_W * 0.65 ? 'end' : 'middle'}
            >
              {t('{county} (you)', { county: farmerCounty ?? '' })}
            </SvgText>
          </G>
        ) : null}

        {/* Compass & Legend */}
        <G transform="translate(18, 20)">
          <Circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.3)" />
          <SvgText x="12" y="16" fill="#8FC2A5" fontSize="10" fontFamily={FONT.bodyBold} textAnchor="middle">
            N
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A4B37',
  },
});
