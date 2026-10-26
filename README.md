# Smart Drain Watch

![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)
![TanStack Start](https://img.shields.io/badge/TanStack-Start-ff4154)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-16%20passing-6e9f18?logo=vitest&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![SIC Capstone](https://img.shields.io/badge/Samsung_Innovation_Campus-IoT_Capstone-1428a0)

An interactive browser digital twin for a Bengaluru urban-drain flood early-warning capstone. Explore sensor noise filtering, weather-aware risk thresholds, a four-state risk engine, node health and simulated actuator response.

> **Simulation notice:** This repository's web app runs a local simulation. It does not connect to physical ESP32 hardware, a live EMQX broker, Node-RED, Open-Meteo, BBMP or emergency services. The hardware design below is a proposed reference wiring plan, not a verified as-built schematic.

## At a glance

- **Capstone:** Smart Drain Flood Early-Warning System
- **Credits:** Samsung Innovation Campus · Team 10 · RNSIT, Bengaluru
- **Web stack:** React 19, TypeScript, TanStack Start/Router, Tailwind CSS, Recharts, Zustand
- **Proposed edge stack:** Dual ESP32, FreeRTOS, EMQX MQTT, Node-RED, Open-Meteo forecast context
- **Risk engine:** Pure TypeScript functions in `src/lib/riskEngine.ts`; tunable constants in `src/lib/config.ts`
- **Tests:** 16 current automated tests across engine logic, route UI and interactions

## System architecture

```text
PROPOSED FIELD SYSTEM
┌────────────────────────┐    MQTT QoS 1     ┌────────────────────────────┐
│ ESP32 Sensor Node      │ ────────────────► │ EMQX Broker                │
│ ultrasonic + rain      │                    └──────────────┬─────────────┘
│ FreeRTOS sample queue  │                                   │
└────────────────────────┘                                   ▼
                                               ┌────────────────────────────┐
                                               │ Node-RED Flow 3            │
                                               │ validate → median → EMA   │
                                               │ → rate → weather → FSM    │
                                               └──────────────┬─────────────┘
                                                              │ MQTT command
                                                              ▼
                                               ┌────────────────────────────┐
                                               │ ESP32 Actuator Node        │
                                               │ RGB + buzzer + float switch│
                                               └────────────────────────────┘

THIS REPOSITORY
┌─────────────────────┐   ┌──────────────────────────┐
│ Zustand simulation  │ → │ Pure TypeScript risk     │ → SCADA / Citizen UI
│ store + global tick │   │ engine + local weather   │   Architecture / About
└─────────────────────┘   └──────────────────────────┘
```

The web twin uses one Zustand store (`src/store/simulationStore.ts`) and a single simulation loop mounted in `SiteLayout`. It generates simulated water readings and weather values, then calls the pure risk engine. The site presents simulated values with a persistent Simulation badge.

## Features

- **Control Room (`/admin`):** live true/raw/EMA telemetry chart, risk-state banner, hardware status twin and scenario injection controls.
- **Architecture (`/architecture`):** selectable pipeline nodes with contracts and guardrails, dual-node FreeRTOS breakdown, MQTT topic/QoS table and adaptive threshold explorer.
- **Citizen Portal (`/citizen`):** risk-state safety guidance, drain cross-section, simulated rain outlook and a local report-dialog interaction.
- **Landing (`/`):** shared-store micro-twin, SCADA/architecture CTAs and heavy-rain/clear-drain scenarios.
- **About (`/about`):** capstone credits, six engineering interview defenses and deployment limitations.

## Project resources

- [GitHub repository](https://github.com/vivekmpatne/smart-drain-flood-warning-system)
- [Capstone poster](https://github.com/vivekmpatne/smart-drain-flood-warning-system/blob/main/docs/poster.jpeg)
- [Capstone presentation (PDF)](https://github.com/vivekmpatne/smart-drain-flood-warning-system/blob/main/docs/ppt_doc.pdf)
- [Demo videos (Google Drive)](https://drive.google.com/drive/folders/1869mVIRYLwwES12wQjYP1Cnl_X0ko-AE)

## Node-RED Flow 3 pipeline

```text
MQTT In (smartdrain/sensor/telemetry)
  → rolling median (configured window: 5 samples)
  → EMA (α = 0.3)
  → rate of rise (median delta per elapsed minute)
  → weather fusion (discrete score; stale weather excluded)
  → adaptive threshold selection
  → 4-state risk evaluator (NORMAL / WATCH / ALERT / CRITICAL)
  → actuator command + acknowledgement/escalation dispatch
```

The diagram documents the proposed Node-RED system and the web engine's current processing concepts. The repository does not include an executable Node-RED flow export or a live broker integration.

### MQTT topic contracts (proposed)

| Topic                         | Publisher → subscriber | Purpose                                                 | QoS |
| ----------------------------- | ---------------------- | ------------------------------------------------------- | --: |
| `smartdrain/sensor/telemetry` | Sensor → flow          | Level, timestamp/sequence and sensor health             |   1 |
| `smartdrain/actuator/command` | Flow → actuator        | Risk state and output command                           |   1 |
| `smartdrain/system/status`    | Nodes → flow           | Availability and diagnostics; use retained LWT presence |   1 |

QoS 1 is at-least-once delivery, so consumers should be idempotent and account for duplicates. QoS 2 adds protocol exchanges and state; choose it only when its extra guarantees justify the bandwidth and implementation cost. Production broker credentials, TLS, ACLs, retained-message policy and command expiry still need to be specified.

## Risk engine math

All tunable values live in `src/lib/config.ts`; the pure functions live in `src/lib/riskEngine.ts`.

### Median and EMA

For the configured 5-sample rolling buffer, sort a copy and select index `floor(n / 2)`. The implementation uses the current available samples during startup.

```text
Sₜ = αYₜ + (1 − α)Sₜ₋₁
α = 0.3
```

The first EMA is initialized from the raw reading. The median rejects isolated spikes; the EMA then smooths the remaining variation.

### Rate of rise

```text
rate = (medianₜ − medianₜ₋₁) / (elapsed_seconds / 60)
```

The current engine expresses level as percent, so the resulting unit is **percentage points per minute**. With no previous sample the rate is zero; a too-small time gap retains the previous valid rate.

### Weather score and adaptive thresholds

The current engine adds discrete points from 6-hour rain probability, 6-hour/24-hour volume, humidity and cloud-cover bands. A stale weather feed is excluded. It then selects one of four configured threshold sets:

| Weather score | WATCH level | ALERT level | CRITICAL level | ALERT rate | CRITICAL rate |
| ------------: | ----------: | ----------: | -------------: | ---------: | ------------: |
|         `< 2` |         40% |         60% |            80% |   3.0%/min |      5.0%/min |
|         `2–3` |         38% |         58% |            78% |   2.8%/min |      4.8%/min |
|         `4–5` |         35% |         55% |            75% |   2.5%/min |      4.5%/min |
|          `6+` |         30% |         50% |            70% |   2.0%/min |      4.0%/min |

CRITICAL predicates are evaluated first. Level, rate and physical-float input can independently elevate the state. An unacknowledged ALERT escalates after 60 seconds of **simulated** time.

## Proposed hardware BOM and reference pinout

The capstone repository contains no verified wiring diagram. This is a **starting point for schematic review**, not an as-built BOM. GPIO assignments are examples and must be checked against the exact ESP32 dev board, sensor datasheet, power design and enclosure before wiring.

| Item                                            |   Qty | Reference interface / notes                                                                              |
| ----------------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------- |
| ESP32-WROOM-32 development board                |     2 | One sensor node and one actuator node; board revision affects pin availability                           |
| JSN-SR04T **or** A02YYUW ultrasonic sensor      |     1 | Alternative sensors: JSN trigger/echo; A02YYUW UART. Do not share one pinout between them                |
| RGB LED strip/module                            |     1 | Use suitable MOSFET drivers and external supply for a strip; do not power a high-current strip from GPIO |
| 85dB active buzzer                              |     1 | Drive through a transistor/MOSFET matched to its current; add flyback protection if required by the load |
| Physical float switch                           |     1 | Normally-open/closed contact to a pulled-up input; validate interrupt/debounce behavior                  |
| Battery, regulator and ADC divider              | 1 set | Size for load and duty cycle; verify ADC attenuation, divider impedance and safe input range             |
| Waterproof enclosure, cable glands and mounting | 1 set | Select to site ingress, corrosion and maintenance requirements                                           |

### Example GPIO map (proposed only)

| Node     | Signal                 | Example ESP32 GPIO | Interface notes                                                               |
| -------- | ---------------------- | -----------------: | ----------------------------------------------------------------------------- |
| Sensor   | JSN-SR04T TRIG         |                  5 | 3.3V output; confirm module trigger requirements                              |
| Sensor   | JSN-SR04T ECHO         |                 18 | Many modules expose 5V echo; level shift/divide to a safe ESP32 input first   |
| Sensor   | A02YYUW TX → ESP32 RX2 |                 16 | Alternative to JSN; UART wiring/baud/framing from the exact sensor datasheet  |
| Sensor   | A02YYUW RX ← ESP32 TX2 |                 17 | Verify whether the selected A02YYUW variant uses/configures RX                |
| Sensor   | Battery divider → ADC1 |                 34 | Input-only pin; scale battery voltage and check ADC range on the target board |
| Actuator | RGB R / G / B PWM      |       25 / 26 / 27 | Use MOSFET drivers for strips and a shared ground with adequate supply        |
| Actuator | Active buzzer driver   |                 32 | GPIO controls transistor/MOSFET gate/base, not the buzzer load directly       |
| Actuator | Float switch interrupt |                 33 | Configure appropriate pull-up/down, debounce and safe local fail-state        |

## Local development

Requirements: Node.js 20+ and npm. Install and run:

```bash
npm install
npm run dev
```

Run the automated test suite and production build:

```bash
npm test
npm run build
```

Vite prints the local URL in the terminal. The configured port is provided by the Lovable TanStack Vite preset and may differ by environment.

## Test coverage

The current suite has 16 cases: 10 deterministic risk-engine tests plus routing, landing scenario interaction, citizen portal/report-dialog and About-page interview-content checks. These tests do not validate physical sensor accuracy, RF coverage, electrical isolation or municipal response procedures; use hardware-in-the-loop and field testing for those.

## Interview talking points

- **Why dual boards?** Spatial separation, reduced electrical coupling and bounded fault domains; the cost is additional power, firmware and network complexity.
- **Why median + EMA?** Median rejects impulse outliers; EMA provides constant-cost smoothing. Both add latency, which needs calibration against response requirements.
- **What if MQTT is unavailable?** Reconnect and buffer bounded telemetry, expose stale/offline status with LWT, and use a local float-switch fallback. Define buffer overflow and stale command policy.
- **Why Node-RED?** Visual, event-driven integration is easy to inspect and tune; production still requires versioned flows, tests, observability and rollback.
- **What does weather fusion change?** It selects more conservative discrete thresholds before runoff reaches the drain, while stale forecast data is ignored.
- **How is it validated?** Pure engine tests verify deterministic math; UI tests verify key flows. Hardware and field behavior remain outside the web test boundary.

## Team credits

Samsung Innovation Campus IoT Capstone · Team 10 · RNSIT, Bengaluru. Add individual member names and verified project links here when the team has approved the attribution.

## License

MIT. See [LICENSE](LICENSE).
