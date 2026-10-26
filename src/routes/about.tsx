import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Battery,
  BookOpenCheck,
  Bug,
  CloudRain,
  Code2,
  Cpu,
  GitBranch,
  Radio,
  Shield,
  Waves,
  Wifi,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & SDE Interview Guide — Smart Drain" },
      {
        name: "description",
        content:
          "Samsung Innovation Campus Team 10 capstone background, system design decisions and interview defense guide.",
      },
      { property: "og:title", content: "About & SDE Interview Guide — Smart Drain" },
      {
        property: "og:description",
        content: "Project background and engineering trade-offs for the Smart Drain digital twin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const questions = [
  {
    q: "Why split the sensor and actuator across two ESP32 boards?",
    icon: Cpu,
    summary: "Separate placement, electrical noise and fault domains.",
    answer:
      "The ultrasonic sensor belongs at the drain while the alarm belongs where commuters can see and hear it. Keeping PWM loads such as LED strips and a buzzer off the sensing board reduces the chance that switching noise or a supply dip contaminates an ADC or resets acquisition. It also contains failures: a stuck actuator output does not stop the sensor task from reporting. The trade-off is another power budget, firmware image and networked component to provision and monitor.",
  },
  {
    q: "Why use both a median filter and an EMA?",
    icon: Waves,
    summary: "They address different noise shapes with bounded memory.",
    answer:
      "A rolling median is robust to isolated non-Gaussian spikes such as debris or ultrasonic multipath reflections. Its breakdown point approaches 0.5: nearly half the window must be contaminated to drag the middle value arbitrarily far. The EMA then smooths ordinary variation with constant update cost and one previous value: Sₜ = αYₜ + (1−α)Sₜ₋₁. Median filtering adds a short window of memory and can delay a real step; EMA adds lag too, so the window and α must be tuned against response time using field traces.",
  },
  {
    q: "How does the system behave when Wi-Fi or MQTT drops?",
    icon: Wifi,
    summary: "Reconnect, expose stale data and keep a local safety path.",
    answer:
      "On the sensor node, a bounded FreeRTOS queue decouples the sample task from network publishing. A reconnect state machine restores Wi-Fi and the MQTT session; a small ring buffer can preserve recent samples during outages, with sequence numbers and timestamps so the consumer can detect gaps and duplicates. EMQX Last Will and Testament marks an unexpectedly disconnected node offline. On the actuator node, the physical float switch provides a local fallback if the broker path is unavailable for more than 10 seconds. Buffer size, overflow policy and command expiry need explicit validation before field deployment.",
  },
  {
    q: "Why use Node-RED instead of a monolithic backend?",
    icon: GitBranch,
    summary: "A visible event pipeline helps integration and calibration.",
    answer:
      "Node-RED connects MQTT input, filtering, weather enrichment, risk evaluation and output actions as an inspectable stream. Operators can trace a sample through the flow, and small wiring or threshold changes can be reviewed and rolled out quickly. That is useful for a capstone prototype where hardware and logic are still being calibrated. It does not remove the need for version control, automated tests, deployment review, observability or rollback; a larger or high-assurance installation may move core policies into a strongly tested service.",
  },
  {
    q: "How can weather fusion help before runoff reaches the drain?",
    icon: CloudRain,
    summary: "It can make the system more cautious before local level rises.",
    answer:
      "Forecast rain probability and volume provide context that a level-only sensor cannot see. The current engine turns weather features into a discrete score and chooses lower level and rate thresholds at higher scores. This can move the warning earlier while runoff is still traveling across the catchment. Forecasts can be wrong or stale, so the implementation excludes stale weather from classification and reports freshness. Weather should raise preparedness; it should not replace local measurements or a fail-safe.",
  },
  {
    q: "How is the web simulation validated?",
    icon: BookOpenCheck,
    summary: "Pure risk math has deterministic unit tests; the UI has focused interaction tests.",
    answer:
      "Risk calculations live in pure TypeScript functions so tests can provide exact readings, times and weather without React or a running broker. Current unit tests cover median behavior, trend labels, weather scoring, adaptive threshold selection, state classification, risk score bounds, float switch behavior and time-to-critical estimates. UI tests exercise citizen report simulation and landing-page scenario controls. This validates logic contracts, not physical sensor calibration, radio reliability, actuator current draw or city response time; those require hardware-in-the-loop and field tests.",
  },
  {
    q: "What would you improve before a field deployment?",
    icon: Bug,
    summary: "Plan maintenance, power and prediction around real site data.",
    answer:
      "Add a service schedule and sensor diagnostics for biofouling, silt and changing drain geometry; validate mounting and echo behavior during debris and backwater conditions. Profile battery life before choosing deep-sleep intervals, and evaluate LoRaWAN only if coverage and payload cadence justify its added infrastructure. After collecting representative, labeled field traces, test a lightweight edge trend predictor against the transparent rate rules. Keep a fallback alarm and monitor model drift; TinyML is a future experiment, not a current capability.",
  },
];

export function AboutPage() {
  return (
    <div className="space-y-10 pb-12">
      <header className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0b1220] p-6 text-white shadow-soft md:p-10">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-sky-300/10" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-sky-200">
            <Code2 className="h-3.5 w-3.5" />
            Project notes · interview prep
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Explain the engineering.
            <br />
            <span className="text-sky-300">Defend the trade-offs.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            A capstone digital twin for urban drain monitoring, with the system boundaries,
            assumptions and next validation steps made explicit.
          </p>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="card-soft p-5 md:p-7">
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">
            Samsung Innovation Campus
          </div>
          <h2 className="mt-2 text-2xl font-bold">Smart Drain Flood Early-Warning System</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            IoT capstone · Team 10 · RNSIT, Bengaluru. The browser project is a simulation of the
            proposed edge-to-cloud system, created to make its sensing, risk logic and response
            behavior explorable.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Fact
              icon={<Cpu className="h-4 w-4" />}
              label="Edge hardware"
              value="Dual ESP32 · FreeRTOS · C++"
            />
            <Fact
              icon={<Radio className="h-4 w-4" />}
              label="Messaging"
              value="EMQX · MQTT QoS 1"
            />
            <Fact
              icon={<GitBranch className="h-4 w-4" />}
              label="Stream processing"
              value="Node-RED · Open-Meteo context"
            />
            <Fact
              icon={<Code2 className="h-4 w-4" />}
              label="Digital twin"
              value="React 19 · TypeScript · TanStack Start"
            />
            <Fact
              icon={<Waves className="h-4 w-4" />}
              label="UI stack"
              value="Tailwind CSS · Recharts · Zustand"
            />
            <Fact
              icon={<Shield className="h-4 w-4" />}
              label="Verification"
              value="Pure engine functions · Vitest"
            />
          </div>
          <div className="mt-5 rounded-xl bg-secondary/70 p-4">
            <div className="text-xs font-bold">Simulation boundary</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This website does not connect to deployed hardware or dispatch public alerts. Team
              attribution and hardware design describe the capstone context; production claims
              require supporting field evidence.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <MiniPanel
            icon={<Battery className="h-4 w-4" />}
            title="Deployment risks"
            text="Biofouling, silt buildup, sensor mounting variance, power budget and weather-feed staleness need field validation."
          />
          <MiniPanel
            icon={<ArrowRight className="h-4 w-4" />}
            title="Next engineering steps"
            text="Measure current draw; define offline queue and overflow behavior; add hardware-in-the-loop tests; document calibration and maintenance procedures."
          />
          <MiniPanel
            icon={<CloudRain className="h-4 w-4" />}
            title="Future experiments"
            text="Evaluate LoRaWAN for low-power links and test edge rate prediction only after collecting labeled, representative site data."
          />
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[.06] p-5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Shield className="h-4 w-4 text-sky-700" />
              Senior engineer framing
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Describe what is implemented, identify assumptions, name failure modes and explain how
              you would test them. Distinguish the web simulation from verified hardware behavior.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 max-w-3xl">
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">
            Interview cross-questioning
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Six engineering decisions, with trade-offs
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Open each answer to rehearse a concise explanation and the limitation a senior engineer
            may ask about next.
          </p>
        </div>
        <div className="space-y-3">
          {questions.map((item, i) => {
            const Icon = item.icon;
            return (
              <details
                key={item.q}
                className="group rounded-2xl border border-border bg-card shadow-soft"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 p-4 md:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-[.16em] text-primary">
                      Q{i + 1} · Design reasoning
                    </span>
                    <span className="mt-1 block text-sm font-bold md:text-base">{item.q}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.summary}</span>
                  </span>
                  <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="border-t border-border px-4 pb-5 pt-4 md:ml-14 md:px-5">
                  <p className="text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/50 p-5">
        <div>
          <div className="text-sm font-bold">Keep the claims testable.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Risk thresholds and simulation behavior are inspectable in the project architecture.
          </div>
        </div>
        <a
          href="/architecture"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
        >
          Review system architecture <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </footer>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-xs font-semibold">{value}</div>
      </div>
    </div>
  );
}
function MiniPanel({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="card-soft flex gap-3 p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
