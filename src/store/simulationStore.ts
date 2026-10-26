import { create } from "zustand";
import {
  DEFAULT_SPEED,
  ESCALATION_SECONDS,
  EVENT_LOG_MAX,
  FLOAT_TRIP_LEVEL,
  HISTORY_MAX,
  OUTLIER_CHANCE,
  SAMPLE_INTERVAL_SIM_SECONDS,
  SENSOR_NOISE,
  SENSOR_STALE_AFTER_SECONDS,
} from "@/lib/config";
import {
  initialMemory,
  isWeatherStale,
  processSample,
  type EngineMemory,
  type EngineOutput,
  type RiskState,
  type Weather,
} from "@/lib/riskEngine";

export type EventKind = RiskState | "ESCALATED";
export interface LogEvent { simTime: number; wallTime: number; kind: EventKind }
export interface EmailEntry { simTime: number; wallTime: number; subject: string; body: string }
export type LedColor = "green" | "yellow" | "red" | "off";

const CALM_WEATHER: Weather = { rainProb6h: 20, rainVolume6h: 0.5, rainVolume24h: 2, humidity: 70, clouds: 50 };
const STORM_WEATHER: Weather = { rainProb6h: 90, rainVolume6h: 12, rainVolume24h: 25, humidity: 92, clouds: 95 };

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

interface SimState {
  simTime: number;
  running: boolean;
  speed: number;
  trueLevel: number;
  netInflow: number;
  sensorOnline: boolean;
  actuatorOnline: boolean;
  outliersEnabled: boolean;
  stormOverride: boolean;
  forceWeatherStale: boolean;
  showFloatSwitch: boolean;
  weather: Weather;
  weatherLastFetchedMs: number | null;
  memory: EngineMemory;
  output: EngineOutput | null;
  lastSampleSimTime: number | null;
  history: { t: number; ema: number; raw: number }[];
  processedState: RiskState | null;
  escalationStartedAt: number | null;
  ackReceived: boolean;
  escalated: boolean;
  events: LogEvent[];
  outbox: EmailEntry[];
  lastEmailedState: EventKind | null;

  tick: () => void;
  refreshWeather: () => void;
  acknowledge: () => void;
  set: (p: Partial<Pick<SimState, "running" | "speed" | "netInflow" | "sensorOnline" | "actuatorOnline" | "outliersEnabled" | "stormOverride" | "forceWeatherStale" | "showFloatSwitch" | "trueLevel">>) => void;
  reset: () => void;
}

const initial = () => ({
  simTime: 0,
  running: true,
  speed: DEFAULT_SPEED,
  trueLevel: 20,
  netInflow: 0,
  sensorOnline: true,
  actuatorOnline: true,
  outliersEnabled: true,
  stormOverride: false,
  forceWeatherStale: false,
  showFloatSwitch: true,
  weather: CALM_WEATHER,
  weatherLastFetchedMs: null as number | null,
  memory: initialMemory(),
  output: null as EngineOutput | null,
  lastSampleSimTime: null as number | null,
  history: [] as { t: number; ema: number; raw: number }[],
  processedState: null as RiskState | null,
  escalationStartedAt: null as number | null,
  ackReceived: false,
  escalated: false,
  events: [] as LogEvent[],
  outbox: [] as EmailEntry[],
  lastEmailedState: null as EventKind | null,
});

const emailFor = (kind: EventKind, simTime: number): EmailEntry => {
  const label = kind === "ESCALATED" ? "ESCALATED" : kind;
  return {
    simTime,
    wallTime: Date.now(),
    subject: `Drain Alert: ${label}`,
    body: `Flood risk state changed to ${label}. Please check the Smart Drain Monitoring dashboard for live water level, weather conditions, prediction, and node status.`,
  };
};

export const useSimulation = create<SimState>((set, get) => ({
  ...initial(),

  refreshWeather: () =>
    set((s) => ({ weather: s.stormOverride ? STORM_WEATHER : CALM_WEATHER, weatherLastFetchedMs: Date.now() })),

  acknowledge: () => set({ ackReceived: true }),

  set: (p) => {
    set(p);
    if ("stormOverride" in p) get().refreshWeather();
  },

  reset: () => {
    set(initial());
    get().refreshWeather();
  },

  tick: () => {
    const s = get();
    const simTime = s.simTime + SAMPLE_INTERVAL_SIM_SECONDS;
    const trueLevel = clamp(s.trueLevel + s.netInflow * (SAMPLE_INTERVAL_SIM_SECONDS / 60));
    const patch: Partial<SimState> = { simTime, trueLevel };

    let { events, outbox, lastEmailedState, escalationStartedAt, ackReceived, escalated, processedState } = s;
    const pushEvent = (kind: EventKind) => {
      events = [{ simTime, wallTime: Date.now(), kind }, ...events].slice(0, EVENT_LOG_MAX);
    };
    const sendEmail = (kind: EventKind) => {
      if (lastEmailedState === kind) return;
      outbox = [emailFor(kind, simTime), ...outbox];
      lastEmailedState = kind;
    };

    if (s.sensorOnline) {
      let reading = clamp(trueLevel + (Math.random() * 2 - 1) * SENSOR_NOISE);
      if (s.outliersEnabled && Math.random() < OUTLIER_CHANCE) reading = clamp(reading + (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 20));
      const forceStale = s.forceWeatherStale;
      const { memory, output } = processSample(s.memory, {
        reading,
        simTime,
        weather: s.weather,
        weatherLastFetchedMs: forceStale ? null : s.weatherLastFetchedMs,
        nowMs: Date.now(),
        floatTripped: trueLevel >= FLOAT_TRIP_LEVEL,
      });
      patch.memory = memory;
      patch.output = output;
      patch.lastSampleSimTime = simTime;
      patch.history = [...s.history, { t: simTime, ema: +output.levelEma.toFixed(2), raw: +reading.toFixed(2) }].slice(-HISTORY_MAX);

      // Change filter: only act when state actually changes.
      if (output.state !== processedState) {
        processedState = output.state;
        pushEvent(output.state);
        if (output.state === "NORMAL") {
          escalationStartedAt = null;
          ackReceived = false;
          escalated = false;
        } else if (output.state === "ALERT" && escalationStartedAt === null) {
          escalationStartedAt = simTime;
          ackReceived = false;
        }
        if (output.state === "ALERT" || output.state === "CRITICAL") sendEmail(output.state);
      }
    }

    // Escalation timer runs on simulated time.
    if (escalationStartedAt !== null && !escalated && !ackReceived && simTime - escalationStartedAt >= ESCALATION_SECONDS) {
      escalated = true;
      pushEvent("ESCALATED");
      sendEmail("ESCALATED");
    }

    set({ ...patch, events, outbox, lastEmailedState, escalationStartedAt, ackReceived, escalated, processedState });
  },
}));

// ---- Derived selectors ----
export type SensorStatus = "ONLINE • DATA FRESH" | "ONLINE • DATA STALE" | "OFFLINE • DATA UNAVAILABLE";

export function sensorStatus(s: Pick<SimState, "sensorOnline" | "simTime" | "lastSampleSimTime">): SensorStatus {
  if (!s.sensorOnline) return "OFFLINE • DATA UNAVAILABLE";
  if (s.lastSampleSimTime === null || s.simTime - s.lastSampleSimTime >= SENSOR_STALE_AFTER_SECONDS) return "ONLINE • DATA STALE";
  return "ONLINE • DATA FRESH";
}

export function systemHealth(s: SimState): "SYSTEM HEALTHY" | "SYSTEM DEGRADED" {
  const sensorBad = sensorStatus(s) !== "ONLINE • DATA FRESH";
  const weatherBad = s.forceWeatherStale || isWeatherStale(s.weatherLastFetchedMs, Date.now());
  return sensorBad || weatherBad ? "SYSTEM DEGRADED" : "SYSTEM HEALTHY";
}

export function indicatorState(s: SimState): string {
  if (s.escalated) return "ESCALATED, treated as Critical";
  return s.output?.state ?? "NORMAL";
}

export function ledColor(s: SimState): LedColor {
  if (!s.actuatorOnline) return "off";
  if (s.escalated) return "red";
  const st = s.output?.state ?? "NORMAL";
  return st === "CRITICAL" ? "red" : st === "ALERT" ? "yellow" : "green";
}
