// Tassel — real weather and a weather-based late blight risk indicator.
//
// Weather: Open-Meteo forecast API (free, no API key).
// Blight risk: the Hutton Criteria (AHDB, UK, 2017) — a "Hutton period" is two
// consecutive days, each with a minimum temperature of at least 10 °C and at
// least 6 hours of relative humidity at or above 90%. It was developed for
// potato late blight in the UK, so here it is shown as a warning to protect the
// crop, not as a diagnosis. Replaces the hard-coded weather card and "LIVE"
// alerts in v1.0.

export type DayForecast = { date: string; code: number; tMax: number; tMin: number; rainMm: number; rainChance: number | null };
export type Weather = {
  temp: number;
  humidity: number;
  rainMm: number;
  wind: number;
  code: number;
  days: DayForecast[];
  blight: BlightRisk;
  spray: SprayDay[];
  fetchedAt: string;
};

/** Is a day good for spraying? Wind, rain and heat decide whether a spray stays on the leaf. */
export type SprayDay = {
  date: string;
  level: 'Good' | 'Fair' | 'Poor';
  window: string | null;
  reason: string;
  /** One entry per daylight hour from 06:00 to 17:00: can you spray in that hour? */
  hours?: boolean[];
};
export type BlightRisk = { level: 'Low' | 'Medium' | 'High'; reason: string; days: string[] };

export function describeCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear', icon: 'weather-sunny' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'weather-partly-cloudy' };
  if (code === 3) return { label: 'Cloudy', icon: 'weather-cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'weather-fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'weather-rainy' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'weather-pouring' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'weather-snowy' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'weather-rainy' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'weather-lightning-rainy' };
  return { label: 'Mixed', icon: 'weather-cloudy' };
}

type OpenMeteo = {
  current: { temperature_2m: number; relative_humidity_2m: number; precipitation: number; weather_code: number; wind_speed_10m: number };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    wind_speed_10m?: number[];
    precipitation?: number[];
    precipitation_probability?: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max?: (number | null)[];
  };
};

export function huttonRisk(hourly: OpenMeteo['hourly'], days: string[]): BlightRisk {
  const byDay = new Map<string, { minT: number; wetHours: number }>();
  hourly.time.forEach((t, i) => {
    const day = t.slice(0, 10);
    const rec = byDay.get(day) ?? { minT: Infinity, wetHours: 0 };
    rec.minT = Math.min(rec.minT, hourly.temperature_2m[i]);
    if (hourly.relative_humidity_2m[i] >= 90) rec.wetHours += 1;
    byDay.set(day, rec);
  });
  const qualifies = (d: string) => {
    const r = byDay.get(d);
    return Boolean(r && r.minT >= 10 && r.wetHours >= 6);
  };
  for (let i = 0; i < days.length - 1; i++) {
    if (qualifies(days[i]) && qualifies(days[i + 1])) {
      return {
        level: 'High',
        reason: 'Two warm, humid days in a row (Hutton criteria met). Late blight can spread fast — protect potatoes and tomatoes now.',
        days: [days[i], days[i + 1]],
      };
    }
  }
  const single = days.filter(qualifies);
  if (single.length) {
    return { level: 'Medium', reason: 'At least one warm, humid day ahead. Scout potatoes and tomatoes for blight.', days: single };
  }
  return { level: 'Low', reason: 'No blight-favouring weather in the next few days.', days: [] };
}

/**
 * Spray days from the hourly forecast (daylight 06:00–18:00). An hour is good when
 * wind is below 15 km/h (less drift), no rain is expected in that hour or the
 * next 6 hours (so the spray is not washed off), and it is 10–30 °C (less
 * evaporation and leaf scorch). These are general label guidelines — the
 * product label always wins.
 */
export function sprayDays(hourly: OpenMeteo['hourly'], days: string[]): SprayDay[] {
  const wind = hourly.wind_speed_10m ?? [];
  const rain = hourly.precipitation ?? [];
  const chance = hourly.precipitation_probability ?? [];
  const wet = (i: number) => (rain[i] ?? 0) > 0.1 || (chance[i] ?? 0) >= 40;
  return days.map((date) => {
    const good: number[] = [];
    let windy = 0;
    let rainy = 0;
    let hot = 0;
    hourly.time.forEach((t, i) => {
      if (!t.startsWith(date)) return;
      const hour = Number(t.slice(11, 13));
      if (hour < 6 || hour > 17) return;
      const rainSoon = [0, 1, 2, 3, 4, 5, 6].some((k) => wet(i + k));
      const tooWindy = (wind[i] ?? 0) >= 15;
      const temp = hourly.temperature_2m[i];
      const badTemp = temp < 10 || temp > 30;
      if (rainSoon) rainy += 1;
      if (tooWindy) windy += 1;
      if (badTemp) hot += 1;
      if (!rainSoon && !tooWindy && !badTemp) good.push(hour);
    });
    // Longest run of consecutive good hours
    let bestFrom = -1;
    let bestTo = -1;
    let runStart = -1;
    for (let idx = 0; idx < good.length; idx++) {
      const h = good[idx];
      if (idx === 0 || h !== good[idx - 1] + 1) runStart = h;
      if (bestFrom < 0 || h - runStart > bestTo - bestFrom) {
        bestFrom = runStart;
        bestTo = h;
      }
    }
    const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
    const window = bestFrom >= 0 ? `${fmt(bestFrom)}–${fmt(bestTo + 1)}` : null;
    const level: SprayDay['level'] = good.length >= 3 ? 'Good' : good.length >= 1 ? 'Fair' : 'Poor';
    const reason =
      level !== 'Poor'
        ? 'Calm and dry enough for the spray to stay on the leaves.'
        : rainy >= windy && rainy >= hot
        ? 'Rain is expected within 6 hours — it would wash the spray off.'
        : windy >= hot
        ? 'Too windy — the spray would drift.'
        : 'Too hot or too cold for spraying.';
    const hours = Array.from({ length: 12 }, (_, k) => good.includes(6 + k));
    return { date, level, window, reason, hours };
  });
}

export async function getWeather(lat: number, lng: number): Promise<Weather> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m' +
    '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,precipitation_probability' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max' +
    '&timezone=auto&forecast_days=5';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather service unavailable');
  const j = (await res.json()) as OpenMeteo;
  const days: DayForecast[] = j.daily.time.map((date, i) => ({
    date,
    code: j.daily.weather_code[i],
    tMax: j.daily.temperature_2m_max[i],
    tMin: j.daily.temperature_2m_min[i],
    rainMm: j.daily.precipitation_sum[i],
    rainChance: j.daily.precipitation_probability_max?.[i] ?? null,
  }));
  return {
    temp: j.current.temperature_2m,
    humidity: j.current.relative_humidity_2m,
    rainMm: j.current.precipitation,
    wind: j.current.wind_speed_10m,
    code: j.current.weather_code,
    days,
    blight: huttonRisk(j.hourly, j.daily.time),
    spray: sprayDays(j.hourly, j.daily.time),
    fetchedAt: new Date().toISOString(),
  };
}
