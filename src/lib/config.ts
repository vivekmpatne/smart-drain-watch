// Every tunable constant for the Smart Drain simulation lives here.

export const SAMPLE_INTERVAL_SIM_SECONDS = 3;
export const MEDIAN_WINDOW = 5;
export const EMA_ALPHA = 0.3;
export const MIN_RATE_GAP_SECONDS = 1;
export const SENSOR_STALE_AFTER_SECONDS = 15;
export const WEATHER_STALE_AFTER_MINUTES = 20;
export const WEATHER_REFRESH_MINUTES = 15;
export const ESCALATION_SECONDS = 60;
export const EVENT_LOG_MAX = 20;
export const FLOAT_FORCES_CRITICAL = true;
export const FLOAT_TRIP_LEVEL = 95;

export const BASE_THRESHOLDS = {
  levelWatch: 40,
  levelAlert: 60,
  levelCritical: 80,
  rateAlert: 3,
  rateCritical: 5,
} as const;

export const SPEED_OPTIONS = [1, 3, 10, 30] as const;
export const DEFAULT_SPEED = 3;

export const NET_INFLOW_MIN = -40;
export const NET_INFLOW_MAX = 40;
export const SENSOR_NOISE = 0.4;
export const OUTLIER_CHANCE = 0.05;
export const HISTORY_MAX = 120;

// Public project resources.
export const LINKS = {
  github: "https://github.com/vivekmpatne/smart-drain-flood-warning-system",
  demoVideos: "https://drive.google.com/drive/folders/1869mVIRYLwwES12wQjYP1Cnl_X0ko-AE",
  poster: "https://github.com/vivekmpatne/smart-drain-flood-warning-system/blob/main/docs/poster.jpeg",
  presentation: "https://github.com/vivekmpatne/smart-drain-flood-warning-system/blob/main/docs/ppt_doc.pdf",
};
