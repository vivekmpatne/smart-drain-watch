// Pure risk engine ported from the Node-RED flow. No React imports.
import {
  BASE_THRESHOLDS,
  EMA_ALPHA,
  FLOAT_FORCES_CRITICAL,
  MEDIAN_WINDOW,
  MIN_RATE_GAP_SECONDS,
  WEATHER_STALE_AFTER_MINUTES,
} from "./config";

export type RiskState = "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";

export interface Thresholds {
  levelWatch: number;
  levelAlert: number;
  levelCritical: number;
  rateAlert: number;
  rateCritical: number;
}

export interface Weather {
  rainProb6h: number;
  rainVolume6h: number;
  rainVolume24h: number;
  humidity: number;
  clouds: number;
}

export const ZERO_WEATHER: Weather = {
  rainProb6h: 0,
  rainVolume6h: 0,
  rainVolume24h: 0,
  humidity: 0,
  clouds: 0,
};

export interface EngineMemory {
  buffer: number[];
  prevMedian: number | null;
  prevEma: number | null;
  prevSimTime: number | null;
  lastRate: number;
}

export const initialMemory = (): EngineMemory => ({
  buffer: [],
  prevMedian: null,
  prevEma: null,
  prevSimTime: null,
  lastRate: 0,
});

export interface EngineOutput {
  levelRaw: number;
  levelMedian: number;
  levelEma: number;
  rate: number;
  trend: string;
  state: RiskState;
  score: number;
  factors: string[];
  recommendation: string;
  timeToCritical: { minutes: number | null; rainFactor: number; message: string };
  weatherStale: boolean;
  weatherScore: number;
  thresholdsUsed: Thresholds;
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function trendLabel(rate: number): string {
  const a = Math.abs(rate);
  if (a < 1) return "Stable";
  if (rate > 0) return a < 3 ? "Rising Slowly" : a < 5 ? "Rising" : "Rising Rapidly";
  return a < 3 ? "Falling Slowly" : a < 5 ? "Falling" : "Falling Rapidly";
}

export function isWeatherStale(lastFetchedMs: number | null, nowMs: number): boolean {
  return lastFetchedMs === null || nowMs - lastFetchedMs > WEATHER_STALE_AFTER_MINUTES * 60_000;
}

export function weatherScore(w: Weather): number {
  let s = 0;
  s += w.rainProb6h >= 80 ? 3 : w.rainProb6h >= 60 ? 2 : w.rainProb6h >= 40 ? 1 : 0;
  s += w.rainVolume6h >= 10 ? 3 : w.rainVolume6h >= 5 ? 2 : w.rainVolume6h >= 2 ? 1 : 0;
  s += w.rainVolume24h >= 20 ? 2 : w.rainVolume24h >= 10 ? 1 : 0;
  if (w.humidity >= 85) s += 1;
  if (w.clouds >= 90) s += 1;
  return s;
}

export function adaptiveThresholds(score: number): Thresholds {
  if (score >= 6) return { levelWatch: 30, levelAlert: 50, levelCritical: 70, rateAlert: 2, rateCritical: 4 };
  if (score >= 4) return { levelWatch: 35, levelAlert: 55, levelCritical: 75, rateAlert: 2.5, rateCritical: 4.5 };
  if (score >= 2) return { levelWatch: 38, levelAlert: 58, levelCritical: 78, rateAlert: 2.8, rateCritical: 4.8 };
  return { ...BASE_THRESHOLDS };
}

export function classify(
  ema: number,
  rate: number,
  t: Thresholds,
  effRainProb6h: number,
  floatTripped: boolean,
): RiskState {
  if (ema >= t.levelCritical || rate >= t.rateCritical || (FLOAT_FORCES_CRITICAL && floatTripped)) return "CRITICAL";
  if (ema >= t.levelAlert || rate >= t.rateAlert) return "ALERT";
  if (ema >= t.levelWatch || effRainProb6h >= 60) return "WATCH";
  return "NORMAL";
}

export const BANDS: Record<RiskState, { min: number; max: number }> = {
  NORMAL: { min: 0, max: 39 },
  WATCH: { min: 40, max: 59 },
  ALERT: { min: 60, max: 79 },
  CRITICAL: { min: 80, max: 100 },
};

export function riskScore(state: RiskState, ema: number, rate: number, t: Thresholds): number {
  const band = BANDS[state];
  const levelP = Math.min(1, ema / t.levelCritical);
  const rateP = Math.min(1, Math.max(0, rate) / t.rateCritical);
  const p = Math.max(levelP, rateP);
  const raw = Math.round(band.min + p * (band.max - band.min));
  return Math.min(band.max, Math.max(band.min, raw));
}

const RECOMMENDATIONS: Record<RiskState, string> = {
  NORMAL: "Continue monitoring.",
  WATCH: "Monitor rainfall and water level closely.",
  ALERT: "Inspect drain and prepare response.",
  CRITICAL: "Immediate field inspection required.",
};
export const recommendation = (s: RiskState) => RECOMMENDATIONS[s];

function levelDescriptor(ema: number, t: Thresholds) {
  if (ema >= t.levelCritical) return "critical";
  if (ema >= t.levelAlert) return "elevated";
  if (ema >= t.levelWatch) return "moderate";
  return "normal";
}

function rateDescriptor(rate: number) {
  const a = Math.abs(rate);
  if (a < 1) return "stable";
  if (rate > 0) return a < 3 ? "slow" : a < 5 ? "moderate" : "rapid";
  return a < 3 ? "falling slowly" : a < 5 ? "falling" : "falling rapidly";
}

function rainDescriptor(p: number) {
  if (p >= 60) return "high impact";
  if (p >= 40) return "moderate impact";
  if (p >= 1) return "low impact";
  return "no impact";
}

export function explanationFactors(
  ema: number,
  rate: number,
  t: Thresholds,
  rawWeather: Weather,
  effWeather: Weather,
  stale: boolean,
): string[] {
  const sign = rate >= 0 ? "+" : "";
  const rain = `Rain forecast: ${Math.round(rawWeather.rainProb6h)}% probability, ${+rawWeather.rainVolume6h.toFixed(1)}mm (${rainDescriptor(effWeather.rainProb6h)})${stale ? " (forecast stale, not used)" : ""}`;
  return [
    `Water level: ${Math.round(ema)}% (${levelDescriptor(ema, t)})`,
    `Rise rate: ${sign}${rate.toFixed(1)}%/min (${rateDescriptor(rate)})`,
    rain,
  ];
}

export function timeToCritical(ema: number, rate: number, w: Weather) {
  const rainFactor =
    w.rainProb6h >= 80 || w.rainVolume6h >= 10
      ? 1.35
      : w.rainProb6h >= 60 || w.rainVolume6h >= 5
        ? 1.2
        : w.rainProb6h >= 40 || w.rainVolume6h >= 2
          ? 1.1
          : 1.0;
  let minutes: number | null = null;
  if (rate > 0 && ema < 80) minutes = (80 - ema) / rate / rainFactor;
  let message: string;
  if (ema >= 80) message = "CRITICAL: Water level already at critical level";
  else if (minutes !== null && rainFactor > 1)
    message = `Rain-adjusted critical level in approximately ${Math.round(minutes)} minutes`;
  else if (minutes !== null) message = `Critical level in approximately ${Math.round(minutes)} minutes`;
  else message = "Water level is not currently rising";
  return { minutes, rainFactor, message };
}

export interface SampleInput {
  reading: number;
  simTime: number; // simulated seconds
  weather: Weather; // raw values
  weatherLastFetchedMs: number | null;
  nowMs: number; // wall clock
  floatTripped: boolean;
}

export function processSample(
  mem: EngineMemory,
  input: SampleInput,
): { memory: EngineMemory; output: EngineOutput } {
  const buffer = [...mem.buffer, input.reading].slice(-MEDIAN_WINDOW);
  const levelMedian = median(buffer);
  const ema = mem.prevEma === null ? input.reading : EMA_ALPHA * levelMedian + (1 - EMA_ALPHA) * mem.prevEma;

  let rate = 0;
  if (mem.prevMedian !== null && mem.prevSimTime !== null) {
    const elapsed = input.simTime - mem.prevSimTime;
    rate = elapsed < MIN_RATE_GAP_SECONDS ? mem.lastRate : (levelMedian - mem.prevMedian) / (elapsed / 60);
  }

  const stale = isWeatherStale(input.weatherLastFetchedMs, input.nowMs);
  const eff = stale ? ZERO_WEATHER : input.weather;
  const ws = weatherScore(eff);
  const t = adaptiveThresholds(ws);
  const state = classify(ema, rate, t, eff.rainProb6h, input.floatTripped);

  return {
    memory: { buffer, prevMedian: levelMedian, prevEma: ema, prevSimTime: input.simTime, lastRate: rate },
    output: {
      levelRaw: input.reading,
      levelMedian,
      levelEma: ema,
      rate,
      trend: trendLabel(rate),
      state,
      score: riskScore(state, ema, rate, t),
      factors: explanationFactors(ema, rate, t, input.weather, eff, stale),
      recommendation: recommendation(state),
      timeToCritical: timeToCritical(ema, rate, eff),
      weatherStale: stale,
      weatherScore: ws,
      thresholdsUsed: t,
    },
  };
}
