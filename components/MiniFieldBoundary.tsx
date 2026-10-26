// SVG Field Boundary Mini-map renderer.
// Visualises GPS polygons of farmer fields with Sentinel-2 health tints.

import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

export type FieldVerdictTone = 'normal' | 'watch' | 'act' | 'none';

export function MiniFieldBoundary({
  polygon,
  tone = 'none',
  width = 150,
  height = 94,
}: {
  polygon: [number, number][] | null;
  tone?: FieldVerdictTone;
  width?: number;
  height?: number;
}) {
  const strokeColor =
    tone === 'normal' ? '#8FC2A5' : tone === 'watch' ? '#E8C25A' : tone === 'act' ? '#E2876A' : '#5E6B64';
  const fillColor =
    tone === 'normal'
      ? 'rgba(46, 106, 79, 0.45)'
      : tone === 'watch'
      ? 'rgba(217, 169, 58, 0.40)'
      : tone === 'act'
      ? 'rgba(168, 71, 42, 0.45)'
      : 'rgba(30, 58, 42, 0.45)';

  const points = useMemo(() => {
    if (!polygon || polygon.length < 3) {
      // Stylized default field contour
      return '18,34 56,16 126,24 138,72 96,86 28,78';
    }
    const lats = polygon.map((p) => p[0]);
    const lngs = polygon.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const spanLat = maxLat - minLat || 0.0001;
    const spanLng = maxLng - minLng || 0.0001;
    const pad = 12;
    const w = width - pad * 2;
    const h = height - pad * 2;

    return polygon
      .map(([lat, lng]) => {
        const x = pad + ((lng - minLng) / spanLng) * w;
        const y = pad + ((maxLat - lat) / spanLat) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [polygon, width, height]);

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.22)' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Coordinate grid lines */}
        <Line x1={width * 0.33} y1="0" x2={width * 0.33} y2={height} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <Line x1={width * 0.66} y1="0" x2={width * 0.66} y2={height} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <Line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* Drawn Polygon */}
        <Polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
