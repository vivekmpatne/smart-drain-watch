import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CloudRain,
  Cpu,
  Gauge,
  Radio,
  Shield,
  Waves,
  Zap,
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { EMA_ALPHA, ESCALATION_SECONDS, MEDIAN_WINDOW } from "@/lib/config";
import { useSimulation } from "@/store/simulationStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Drain — Urban Flood Early-Warning Digital Twin" },
      {
        name: "description",
        content:
          "Interactive digital twin of an ESP32, FreeRTOS, MQTT and Node-RED urban flood early-warning system.",
      },
      { property: "og:title", content: "Smart Drain — Urban Flood Early-Warning Digital Twin" },
      {
        property: "og:description",
        content:
          "Explore the live simulated drain telemetry, weather-aware risk engine and actuator response.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

export function Index() {
  const sim = useSimulation();
  const state = sim.escalated ? "ESCALATED" : (sim.output?.state ?? "NORMAL");
  const level = sim.output?.levelEma ?? sim.trueLevel;
  const trend = sim.output?.rate ?? 0;
  const isRisk = state === "ALERT" || state === "CRITICAL" || state === "ESCALATED";

  return (
    <div className="space-y-12 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0b1220] px-6 py-8 text-white shadow-soft md:px-10 md:py-12 lg:px-14">
        <div className="absolute -right-16 -top-28 h-[34rem] w-[34rem] rounded-full border border-sky-300/[.08]" />
        <div className="absolute -right-2 -top-14 h-[26rem] w-[26rem] rounded-full border border-sky-300/[.08]" />
        <div className="absolute -right-2 bottom-0 h-52 w-[40%] bg-gradient-to-t from-sky-500/[.08] to-transparent" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              SIC IoT capstone · Team 10
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.06] tracking-tight md:text-6xl">
              Real-Time Urban Flood Early-Warning{" "}
              <span className="text-sky-300">Telemetry & Digital Twin</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
              A systems engineering demonstration combining dual ESP32 FreeRTOS edge telemetry,
              Node-RED streaming analytics and weather-aware risk decisions for Bengaluru drains.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-300"
              >
                Launch SCADA Control Room <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/architecture"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Explore System Architecture <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-[10px] text-slate-400">
              Interactive simulation · no live municipal readings
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-6 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[.05] p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                    Live micro-twin
                  </div>
                  <div className="mt-1 text-sm font-semibold">Ward 152 · Koramangala</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Sim running
                </span>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
                  <div
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-600/80 to-cyan-300/70 transition-all duration-700"
                    style={{ height: `${Math.min(100, Math.max(8, level))}%` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-cyan-200/80" />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Waves className="h-5 w-5 text-sky-100 drop-shadow" />
                    <span className="mt-1 text-3xl font-black tabular-nums text-white drop-shadow">
                      {level.toFixed(0)}%
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/75">
                      Filtered water level
                    </span>
                  </div>
                  <div className="absolute right-2 top-[20%] text-[8px] font-bold text-rose-300">
                    80% CRITICAL
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                    <div className="text-[9px] uppercase tracking-wide text-slate-400">
                      FSM state
                    </div>
                    <div className="mt-1">
                      <StateBadge state={state} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                    <div className="text-[9px] uppercase tracking-wide text-slate-400">
                      Rise / min
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm font-bold">
                      {trend >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-amber-300" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-sky-300" />
                      )}
                      {trend.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <TwinStat
                  label="Sensor node"
                  value={sim.sensorOnline ? "ONLINE" : "OFFLINE"}
                  ok={sim.sensorOnline}
                />
                <TwinStat
                  label="Actuator"
                  value={sim.actuatorOnline ? "ARMED" : "OFFLINE"}
                  ok={sim.actuatorOnline}
                />
                <TwinStat
                  label="Weather"
                  value={sim.stormOverride ? "STORM" : "CALM"}
                  ok={!sim.stormOverride}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <button
                  onClick={() => sim.set({ stormOverride: true, netInflow: 16, running: true })}
                  className="rounded-full bg-sky-400/10 px-3 py-2 text-[10px] font-bold text-sky-200 transition hover:bg-sky-400/20"
                >
                  <CloudRain className="mr-1 inline h-3.5 w-3.5" />
                  Simulate heavy rain
                </button>
                <button
                  onClick={() =>
                    sim.set({ stormOverride: false, trueLevel: 12, netInflow: -8, running: true })
                  }
                  className="rounded-full bg-white/[.07] px-3 py-2 text-[10px] font-bold text-slate-200 transition hover:bg-white/[.12]"
                >
                  <Waves className="mr-1 inline h-3.5 w-3.5" />
                  Clear drain
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="max-w-2xl">
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">
            01 · Closed-loop system
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            From field signal to local action
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Three stages keep noisy telemetry understandable, risk decisions explainable and
            warnings actionable.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Edge sensing",
              icon: Cpu,
              text: "Dual ESP32 nodes separate ultrasonic acquisition from roadside actuation. FreeRTOS tasks and queues keep sampling independent of Wi-Fi latency.",
            },
            {
              n: "02",
              title: "Condition & fuse",
              icon: Activity,
              text: `Rolling ${MEDIAN_WINDOW}-sample median rejects spikes, EMA α=${EMA_ALPHA} smooths the signal, and rainfall context adapts the risk thresholds.`,
            },
            {
              n: "03",
              title: "Decide & actuate",
              icon: Zap,
              text: `A four-state risk evaluator drives local RGB/buzzer outputs. An unacknowledged ALERT escalates after ${ESCALATION_SECONDS} simulated seconds.`,
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.n} className="card-soft relative p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-[.16em] text-primary">
                    STEP {step.n}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">
              02 · Engineering properties
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              Designed for messy field signals
            </h2>
          </div>
          <Link
            to="/architecture"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Inspect architecture <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Feature
            icon={<Activity className="h-4 w-4" />}
            title="Spike-resistant signal"
            text={`Median window (${MEDIAN_WINDOW} samples) rejects isolated outliers before EMA smoothing.`}
            accent="sky"
          />
          <Feature
            icon={<CloudRain className="h-4 w-4" />}
            title="Weather-aware thresholds"
            text="Discrete rainfall score bands lower the level and rate limits as storm risk increases."
            accent="violet"
          />
          <Feature
            icon={<Radio className="h-4 w-4" />}
            title="Separated edge nodes"
            text="Sensor telemetry and physical actuation stay on distinct ESP32 failure domains."
            accent="amber"
          />
          <Feature
            icon={<Shield className="h-4 w-4" />}
            title="Timed escalation"
            text={`${ESCALATION_SECONDS}s simulated unacknowledged alert escalates the response state.`}
            accent="rose"
          />
        </div>
      </section>

      <section className="grid gap-5 rounded-3xl border border-border bg-secondary/40 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">
            Explore the digital twin
          </div>
          <h2 className="mt-1 text-xl font-bold">Inspect the system from both sides.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operate the SCADA controls or inspect the state machine and message contracts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/citizen"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-secondary"
          >
            Citizen safety view <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-secondary"
          >
            Project & SDE guide <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
      <p className="flex items-center justify-center gap-2 text-center text-[10px] text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        Samsung Innovation Campus · Team 10 · RNSIT, Bengaluru · All browser values are simulated
      </p>
    </div>
  );
}

function TwinStat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.04] p-2">
      <div className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-[9px] font-black",
          ok ? "text-emerald-300" : "text-rose-300",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-rose-400")} />
        {value}
      </div>
    </div>
  );
}
function Feature({
  icon,
  title,
  text,
  accent,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  accent: string;
}) {
  const colors: Record<string, string> = {
    sky: "bg-sky-500/10 text-sky-700",
    violet: "bg-violet-500/10 text-violet-700",
    amber: "bg-amber-500/10 text-amber-700",
    rose: "bg-rose-500/10 text-rose-700",
  };
  return (
    <div className="card-soft p-4">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", colors[accent])}>
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-bold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
