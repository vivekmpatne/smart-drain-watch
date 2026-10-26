# Smart Drain Watch

Build a React + TypeScript + Vite + Tailwind CSS + shadcn/ui web app called "Smart Drain". It is a browser-based interactive SIMULATION of a real IoT flood early-warning prototype (ESP32 sensor node + MQTT + Node-RED risk engine) for urban drains in Bengaluru. Use React Router, Recharts and Zustand. No backend, no Supabase, no authentication. Everything runs client-side.

FRAMING RULES
- This is a simulation of real hardware. Never present simulated values as real sensor readings. Show a small persistent "Simulation" badge in the header.
- Do not invent statistics, news items, quotes or testimonials anywhere in the app. Use clearly marked placeholders where real content will be added later.

DESIGN SYSTEM (light theme only, matching attached screenshots)
- Page background #FAF7F5, cards white, 20px radius, very subtle border rgba(0,0,0,0.05), soft shadow 0 4px 24px rgba(20,20,20,0.06).
- Text charcoal #2B2A28, secondary #6B6A68. Font: Inter.
- State colors: NORMAL green #2FAE7B, WATCH blue #3B9FE0, ALERT amber #F0A93B (text #B5761F), CRITICAL red #E85D4E (text #C43F2E), ESCALATED coral with a 1px coral border.
- Primary accent coral #E85D4E. Water-related accents blue.
- State badges are small pills: tinted background (14% opacity of the state color), colored text, 12px bold, fully rounded.
- Clean, premium SaaS look, bento-style grid, generous whitespace. No dark mode, no heavy gradients, no neon.

ROUTES
/ (landing), /admin (control room), /citizen (citizen portal), /architecture, /about.
Shared layout: header with logo "Smart Drain", nav links, a role switcher ("Control Room" / "Citizen") that navigates between /admin and /citizen, and the Simulation badge. Footer with links: GitHub repo, demo videos, poster (use placeholder URLs in one config file). Make it responsive for desktop, tablet and mobile. Create simple placeholder content for each page for now.

FILES TO CREATE
- src/lib/config.ts: every tunable constant (below).
- src/lib/riskEngine.ts: PURE TypeScript functions, no React imports.
- src/store/simulationStore.ts: Zustand store.
- src/hooks/useSimulationLoop.ts: the tick loop.

CONFIG CONSTANTS (src/lib/config.ts)
SAMPLE_INTERVAL_SIM_SECONDS = 3
MEDIAN_WINDOW = 5
EMA_ALPHA = 0.3
MIN_RATE_GAP_SECONDS = 1
SENSOR_STALE_AFTER_SECONDS = 15
WEATHER_STALE_AFTER_MINUTES = 20
WEATHER_REFRESH_MINUTES = 15
ESCALATION_SECONDS = 60
EVENT_LOG_MAX = 20
FLOAT_FORCES_CRITICAL = true (float switch trips when true water level >= 95)
BASE_THRESHOLDS = level watch 40, alert 60, critical 80; rate alert 3, rate critical 5 (percent per minute)
SPEED_OPTIONS = 1, 3, 10, 30 (default 3)

SIMULATION CLOCK
Keep a simulated clock. Each tick advances simulated time by SAMPLE_INTERVAL_SIM_SECONDS. The real tick interval in milliseconds is 3000 / speed. All rate calculations, the sensor staleness check and the 60-second escalation timer use simulated time, not wall-clock time. The weather staleness check uses wall-clock time.

VIRTUAL DRAIN
- trueLevel (0-100 percent). A "net inflow" control in percent per minute (range -40 to +40). Each tick: trueLevel += netInflow * (SAMPLE_INTERVAL_SIM_SECONDS / 60), clamped to 0-100.
- Sensor reading = trueLevel + small random noise (+/-0.4), clamped to 0-100. Add a small chance of a one-sample outlier spike (to show the median filter working), toggleable.
- Controls the user can change: net inflow, speed, sensor online/offline, actuator node online/offline, "storm weather" override, "force weather stale", "float switch" display.

RISK ENGINE (riskEngine.ts), the exact logic to port from Node-RED flow:
Per sensor sample, in this order:
1. Median filter: push the reading into a buffer of the last MEDIAN_WINDOW readings, take the median (sort ascending, element at index floor(n/2)). Output level_median.
2. EMA: ema = first reading ? reading : EMA_ALPHA*level_median + (1-EMA_ALPHA)*previousEma.
3. Rate (percent per minute) = (level_median - previousLevelMedian) / (elapsedSimSeconds / 60). If elapsed < MIN_RATE_GAP_SECONDS keep the last rate. First sample rate = 0.
4. Trend label from rate: abs(rate) < 1 -> "Stable". Positive: < 3 "Rising Slowly", < 5 "Rising", otherwise "Rising Rapidly". Negative: abs < 3 "Falling Slowly", < 5 "Falling", otherwise "Falling Rapidly".
5. Weather freshness: weatherStale = no successful fetch yet OR (now - lastFetched) > WEATHER_STALE_AFTER_MINUTES. If stale, the weather values used for SCORING are all treated as 0 (raw values are still shown in the UI).
6. Weather score (effective values): rainProb6h >= 80 +3, >= 60 +2, >= 40 +1. rainVolume6h >= 10 +3, >= 5 +2, >= 2 +1. rainVolume24h >= 20 +2, >= 10 +1. humidity >= 85 +1. clouds >= 90 +1.
7. Adaptive thresholds from weatherScore:
   score >= 6: level watch 30 / alert 50 / critical 70, rate alert 2 / critical 4
   score >= 4: 35 / 55 / 75, rate 2.5 / 4.5
   score >= 2: 38 / 58 / 78, rate 2.8 / 4.8
   otherwise the base thresholds.
8. State:
   CRITICAL if ema >= levelCritical OR rate >= rateCritical (or the float switch has tripped and FLOAT_FORCES_CRITICAL is true)
   else ALERT if ema >= levelAlert OR rate >= rateAlert
   else WATCH if ema >= levelWatch OR effectiveRainProb6h >= 60
   else NORMAL.
   (Only positive rates trigger; a rapidly falling level does not.)
9. Risk score 0-100: bands NORMAL 0-39, WATCH 40-59, ALERT 60-79, CRITICAL 80-100. levelPressure = min(1, ema / levelCritical). ratePressure = min(1, max(0, rate) / rateCritical). pressure = max of the two. score = round(band.min + pressure * (band.max - band.min)), then clamp inside the band of the CURRENT state. The score must never contradict the state.
10. Explanation factors (generated from live values, never hardcoded strings):
   "Water level: 64% (elevated)" with descriptor critical / elevated / moderate / normal by comparing to levelCritical / levelAlert / levelWatch.
   "Rise rate: +3.5%/min (moderate)" with descriptors stable / slow / moderate / rapid (rising) or falling / falling slowly / falling rapidly.
   "Rain forecast: 60% probability, 2.1mm (high impact)" with descriptors: >= 60 high impact, >= 40 moderate impact, >= 1 low impact, else no impact. If weather is stale add "(forecast stale, not used)".
   Recommendation: NORMAL "Continue monitoring." WATCH "Monitor rainfall and water level closely." ALERT "Inspect drain and prepare response." CRITICAL "Immediate field inspection required."
11. Time to critical: if rate > 0 and ema < 80: base = (80 - ema) / rate minutes. rainFactor = 1.35 if effective rainProb6h >= 80 or rainVolume6h >= 10; 1.20 if >= 60 or >= 5; 1.10 if >= 40 or >= 2; else 1.0. adjusted = base / rainFactor. Messages: ema >= 80 "CRITICAL: Water level already at critical level"; adjusted exists and rainFactor > 1 "Rain-adjusted critical level in approximately X minutes"; adjusted exists "Critical level in approximately X minutes"; otherwise "Water level is not currently rising".
12. Overall output object: { levelRaw, levelMedian, levelEma, rate, trend, state, score, factors, recommendation, timeToCritical, weatherStale, weatherScore, thresholdsUsed }.

ALERT / ESCALATION / EMAIL (in the store)
- State changes are only processed when the state actually changes (change filter).
- Entering ALERT starts an escalation timer of ESCALATION_SECONDS simulated seconds and resets ackReceived to false. Pressing Acknowledge sets ackReceived = true. If the timer fires and ackReceived is false: log an ESCALATED event, show an indicator state of "ESCALATED, treated as Critical", force the virtual red LED on. Returning to NORMAL clears the timer and resets acknowledgement. Do not restart the timer on ALERT/WATCH/CRITICAL wobble without passing through NORMAL.
- Email: when the state changes to ALERT or CRITICAL, and on escalation, append an entry to a "simulated email outbox" (subject "Drain Alert: ALERT", body "Flood risk state changed to ALERT. Please check the Smart Drain Monitoring dashboard for live water level, weather conditions, prediction, and node status."). No real email is sent anywhere. Do not send the same state twice in a row.
- Event log: last EVENT_LOG_MAX events {time, state or ESCALATED}, newest first.

SENSOR HEALTH
- Sensor node status text: "ONLINE • DATA FRESH" if samples arrive; "ONLINE • DATA STALE" if no sample for SENSOR_STALE_AFTER_SECONDS simulated seconds while the node is still marked online; "OFFLINE • DATA UNAVAILABLE" if the user turns the sensor node offline.
- System Health: "SYSTEM DEGRADED" if the sensor is offline or stale OR weather is stale, else "SYSTEM HEALTHY". This is separate from the flood risk state and must never be merged with it.
- Actuator node: ONLINE / OFFLINE toggle; does not affect system health.

ACTUATOR (virtual on-site node)
Green LED for NORMAL and WATCH, yellow for ALERT, red for CRITICAL or escalated (plus a buzzer indicator on red). Show it as a small virtual device card.

Wire everything so the store exposes the current pipeline output and history (last ~120 points of ema level for charts). Do NOT build the full dashboards yet, only a simple verification debug panel on /admin printing the current engine output and a net-inflow slider so I can verify the logic. Keep all engine code pure and typed.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ad29cddd-c361-46fd-adf5-05e12cb4a66d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
