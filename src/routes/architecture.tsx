import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Cable,
  Check,
  ChevronRight,
  CloudRain,
  Cpu,
  Database,
  Gauge,
  GitBranch,
  Radio,
  RotateCcw,
  Shield,
  Waves,
  Wifi,
  Zap,
} from "lucide-react";
import { EMA_ALPHA, MEDIAN_WINDOW, BASE_THRESHOLDS } from "@/lib/config";
import { adaptiveThresholds } from "@/lib/riskEngine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Smart Drain" },
      {
        name: "description",
        content:
          "Interactive systems engineering breakdown of the Smart Drain edge-to-cloud flood warning pipeline.",
      },
      { property: "og:title", content: "Architecture — Smart Drain" },
      {
        property: "og:description",
        content: "ESP32, MQTT and Node-RED risk pipeline architecture.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArchitecturePage,
});

const pipeline = [
  {
    id: "mqtt",
    title: "Water level",
    sub: "MQTT input",
    icon: Radio,
    color: "text-sky-600",
    input: "sensor/telemetry JSON",
    output: "validated level sample",
    logic:
      "Subscribe to smartdrain/sensor/telemetry and normalize level, sequence and timestamp fields into a typed sample.",
    guards: "Reject malformed payloads; detect missing timestamps and stale sensor updates.",
    sample: '{ "level": 42.6, "seq": 1842, "ts": 1730000000 }',
  },
  {
    id: "median",
    title: "Median filter",
    sub: `${MEDIAN_WINDOW}-sample buffer`,
    icon: Activity,
    color: "text-indigo-600",
    input: "current reading + rolling buffer",
    output: "median level",
    logic: `Append the new reading to a rolling ${MEDIAN_WINDOW}-sample buffer, sort a copy and take the middle value. This removes isolated spikes before smoothing.`,
    guards:
      "Copy before sorting so buffer order is preserved; startup uses the samples collected so far.",
    sample: "[42, 43, 96, 44, 45] → 44%",
  },
  {
    id: "ema",
    title: "EMA smoother",
    sub: `α = ${EMA_ALPHA}`,
    icon: Waves,
    color: "text-violet-600",
    input: "median + previous EMA",
    output: "filtered level",
    logic: `Sₜ = αYₜ + (1 − α)Sₜ₋₁, where α = ${EMA_ALPHA}. First sample initializes the EMA from the raw reading.`,
    guards: "A lower alpha damps noise but adds lag; preserve numeric units and sample ordering.",
    sample: `0.3 × 44 + 0.7 × 41.8 = 42.46%`,
  },
  {
    id: "rate",
    title: "Rate of rise",
    sub: "dh / dt",
    icon: Gauge,
    color: "text-cyan-700",
    input: "current + previous median/time",
    output: "% level / minute",
    logic:
      "Rate = (medianₜ − medianₜ₋₁) / (elapsed seconds / 60). The latest median is used as the level delta.",
    guards:
      "For the first sample rate is zero; if elapsed time is too short, retain the last valid rate.",
    sample: "(44 − 41) / (3 / 60) = 60%/min",
  },
  {
    id: "weather",
    title: "Weather fusion",
    sub: "Open-Meteo rain score",
    icon: CloudRain,
    color: "text-blue-600",
    input: "forecast + freshness metadata",
    output: "effective weather + score",
    logic:
      "Score forecast bands for 6h rain probability/volume, 24h volume, humidity and cloud cover. Stale weather is excluded from classification.",
    guards:
      "Weather older than the configured freshness window becomes zero-impact input; expose stale status to operators.",
    sample: "90% rain + 12mm/6h + 25mm/24h → score 8",
  },
  {
    id: "threshold",
    title: "Adaptive thresholds",
    sub: "weather-aware bands",
    icon: GitBranch,
    color: "text-amber-600",
    input: "weather score",
    output: "state thresholds",
    logic:
      "Select threshold bands from the discrete weather score: score <2 uses base; 2+, 4+ and 6+ progressively lower level and rate thresholds.",
    guards:
      "Bound decisions to explicit score bands; keep all tunable constants centralized in config.ts.",
    sample: "score 6+ → WATCH 30 · ALERT 50 · CRITICAL 70%",
  },
  {
    id: "fsm",
    title: "Four-state FSM",
    sub: "risk evaluator",
    icon: Shield,
    color: "text-orange-600",
    input: "EMA, rate, thresholds, rain, float",
    output: "NORMAL / WATCH / ALERT / CRITICAL",
    logic:
      "Evaluate in severity order: CRITICAL, ALERT, WATCH, then NORMAL. Rate thresholds and a tripped physical float switch can elevate risk independently of level.",
    guards:
      "Critical and alert checks take precedence; clamp the displayed score to the selected state's score band.",
    sample: "EMA ≥ critical OR rate ≥ critical → CRITICAL",
  },
  {
    id: "actuate",
    title: "Actuate & escalate",
    sub: "command dispatcher",
    icon: BellRing,
    color: "text-rose-600",
    input: "state + acknowledgement + timer",
    output: "LED / buzzer / notification",
    logic:
      "Map the current risk state to actuator output; emit state-change events. Unacknowledged ALERT escalates after the configured simulated-time interval.",
    guards:
      "Handle actuator offline state; prevent repeated notifications for an unchanged state; NORMAL clears escalation timer.",
    sample: "ALERT + 60s unacknowledged → ESCALATED",
  },
];

const topics = [
  {
    topic: "smartdrain/sensor/telemetry",
    direction: "Sensor → Flow",
    qos: "QoS 1",
    detail:
      "Water level, sequence/timestamp and sensor health. At-least-once delivery helps the pipeline receive telemetry through brief Wi-Fi loss; consumers should tolerate duplicates.",
  },
  {
    topic: "smartdrain/actuator/command",
    direction: "Flow → Actuator",
    qos: "QoS 1",
    detail:
      "Risk state and output command. Acknowledgement is useful for important commands without QoS 2's extra handshake overhead.",
  },
  {
    topic: "smartdrain/system/status",
    direction: "Nodes → Flow",
    qos: "QoS 1",
    detail:
      "Node online/offline and diagnostic state. Configure a retained Last Will and Testament so broker disconnects can update presence.",
  },
];

export function ArchitecturePage() {
  const [selected, setSelected] = useState(pipeline[0].id);
  const [score, setScore] = useState(0);
  const active = pipeline.find((node) => node.id === selected) ?? pipeline[0];
  const thresholds = adaptiveThresholds(score);

  return (
    <div className="space-y-10 pb-12">
      <header className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0b1220] px-6 py-8 text-white shadow-soft md:px-10 md:py-11">
        <div className="absolute -right-16 -top-20 h-80 w-80 rounded-full border border-sky-300/10" />
        <div className="absolute -right-3 -top-8 h-56 w-56 rounded-full border border-sky-300/10" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">
            <Cpu className="h-3.5 w-3.5" />
            Systems engineering · edge to cloud
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            From ultrasonic echo
            <br className="hidden md:block" /> to flood response.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Explore how sensing, filtering, weather context and a risk state machine combine into an
            auditable early-warning pipeline.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Dual ESP32", "FreeRTOS", "EMQX MQTT", "Node-RED", "Pure TypeScript engine"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                >
                  {tag}
                </span>
              ),
            )}
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="01 · Streaming analytics"
          title="Node-RED Flow 3 pipeline"
          description="Select a stage to inspect its contract, transformation and failure guards. This interactive view follows the risk-engine processing order."
        />
        <div className="overflow-x-auto rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex min-w-[1180px] items-stretch gap-2">
            {pipeline.map((node, i) => {
              const Icon = node.icon;
              const isSelected = node.id === selected;
              return (
                <div key={node.id} className="flex flex-1 items-center gap-2">
                  <button
                    onClick={() => setSelected(node.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "group flex min-h-[116px] min-w-0 flex-1 flex-col items-start justify-between rounded-2xl border p-3 text-left transition-all",
                      isSelected
                        ? "border-sky-500 bg-slate-900 text-white shadow-lg shadow-sky-900/15"
                        : "border-border bg-background hover:border-sky-500/40 hover:bg-sky-500/[.03]",
                    )}
                  >
                    <span className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          isSelected ? "bg-white/10 text-sky-200" : "bg-secondary",
                          !isSelected && node.color,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider",
                          isSelected ? "text-slate-400" : "text-muted-foreground",
                        )}
                      >
                        N{i + 1}
                      </span>
                    </span>
                    <span>
                      <span className="block text-xs font-bold leading-tight">{node.title}</span>
                      <span
                        className={cn(
                          "mt-1 block text-[9px]",
                          isSelected ? "text-slate-400" : "text-muted-foreground",
                        )}
                      >
                        {node.sub}
                      </span>
                    </span>
                  </button>
                  {i < pipeline.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-soft md:grid-cols-[1.1fr_.9fr]">
          <div className="p-5 md:p-7">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-secondary",
                  active.color,
                )}
              >
                <active.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">
                  Selected node ·{" "}
                  {String(pipeline.findIndex((n) => n.id === active.id) + 1).padStart(2, "0")}
                </div>
                <h3 className="text-lg font-bold">{active.title}</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Input" value={active.input} />
              <InfoBlock label="Output" value={active.output} />
            </div>
            <div className="mt-4">
              <InfoBlock label="Logic contract" value={active.logic} />
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[.06] p-4">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Edge-case guardrails
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{active.guards}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border bg-slate-950 p-5 text-slate-100 md:border-l md:border-t-0 md:p-7">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">
              <Cable className="h-3.5 w-3.5" />
              Example payload transform
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-emerald-200">
              {active.sample}
            </pre>
            <div className="mt-7 border-t border-white/10 pt-4 text-[10px] text-slate-400">
              Select another node above to inspect its transformation.
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="02 · Deterministic edge"
          title="Dual ESP32 FreeRTOS architecture"
          description="Separate telemetry acquisition from physical response to contain faults and place each node where its hardware belongs."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                  <Radio className="h-3 w-3" />
                  Node 1 · Sensor
                </div>
                <h3 className="mt-3 text-xl font-bold">ESP32-WROOM-32</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Drain-side telemetry acquisition
                </p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <Waves className="h-5 w-5 text-sky-700" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <TaskCard
                priority="P2 · Core 1"
                title="Task A · Sensor sampling"
                detail="JSN-SR04T / A02YYUW ultrasonic ranging on a 500ms cadence. Timer-driven scheduling reads echo time and converts distance to water-level telemetry."
                icon={<Activity className="h-4 w-4" />}
              />
              <div className="flex justify-center">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <TaskCard
                priority="P1 · Core 0"
                title="Task B · Network & publish"
                detail="Queue ingestion decouples sampling from Wi-Fi. Reconnection FSM restores the EMQX session and publishes telemetry to smartdrain/sensor/telemetry at QoS 1."
                icon={<Wifi className="h-4 w-4" />}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniCard
                title="Power strategy"
                text="Use deep sleep where measurement cadence allows; monitor battery through ADC and report health."
              />
              <MiniCard
                title="Queue contract"
                text="Bounded FreeRTOS queue isolates sensor cadence from variable network latency."
              />
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                  <Zap className="h-3 w-3" />
                  Node 2 · Actuator
                </div>
                <h3 className="mt-3 text-xl font-bold">ESP32 actuator node</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Roadside pole · independent response path
                </p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <BellRing className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Radio className="h-4 w-4 text-sky-600" />
                Command subscriber
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                smartdrain/actuator/command · QoS 1
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Translate the received risk state into a local alarm pattern. Command receipt and
                current node status remain visible to the monitoring flow.
              </p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MiniCard
                title="PWM outputs"
                text="Hardware PWM controls RGB LED strip and 85dB active buzzer by risk state."
              />
              <MiniCard
                title="Local fail-safe"
                text="Physical float-switch interrupt triggers a local fallback if MQTT is unavailable for more than 10 seconds."
              />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/[.06] p-3 text-xs text-rose-800">
              <Shield className="h-4 w-4 shrink-0" />
              Local float-switch response can operate without a cloud round trip.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-3 py-1.5 font-semibold text-foreground">
            Sensor node
          </span>
          <ArrowRight className="h-4 w-4" />
          <span>EMQX · MQTT broker</span>
          <ArrowRight className="h-4 w-4" />
          <span>Node-RED risk flow</span>
          <ArrowRight className="h-4 w-4" />
          <span>Actuator command</span>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="03 · Message contracts"
          title="EMQX MQTT topic topology"
          description="QoS 1 provides at-least-once delivery. Consumers should be idempotent because retransmission can produce duplicates."
        />
        <div className="grid gap-3">
          {topics.map((item) => (
            <div
              key={item.topic}
              className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft md:grid-cols-[1.25fr_.7fr_100px]"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold text-sky-800">{item.topic}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpRight className="h-4 w-4" />
                {item.direction}
              </div>
              <span className="w-fit self-center rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-700">
                {item.qos}
              </span>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MiniCard
            title="QoS 0"
            text="Best effort; suitable for frequent disposable updates where occasional loss is acceptable."
          />
          <MiniCard
            title="QoS 1 · used here"
            text="At least once; reliability with modest overhead. Deduplicate or make handlers idempotent."
          />
          <MiniCard
            title="QoS 2"
            text="Exactly once protocol handshake; extra traffic and state can be costly for constrained links."
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="04 · Signal processing"
          title="Math behind the risk decision"
          description="Interactive weather-score control previews the same discrete adaptive threshold bands used by the pure TypeScript engine."
        />
        <div className="grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-3xl border border-border bg-[#101827] p-5 text-white shadow-soft md:p-6">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CloudRain className="h-4 w-4 text-sky-300" />
              Weather score explorer
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              The engine scores rainfall bands, 24h volume, humidity and cloud cover. Use the slider
              to inspect threshold selection.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <input
                aria-label="Weather score"
                type="range"
                min="0"
                max="10"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-sky-400"
              />
              <span className="w-8 text-right text-xl font-bold tabular-nums">{score}</span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { k: "WATCH", v: thresholds.levelWatch },
                { k: "ALERT", v: thresholds.levelAlert },
                { k: "CRITICAL", v: thresholds.levelCritical },
              ].map((x) => (
                <div key={x.k} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[9px] font-bold tracking-wider text-slate-400">{x.k}</div>
                  <div className="mt-1 text-lg font-bold">
                    {x.v}
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
              <RotateCcw className="h-3 w-3" />
              Base alert {BASE_THRESHOLDS.levelAlert}% · score bands: &lt;2, 2+, 4+, 6+
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormulaCard
              icon={<Waves className="h-4 w-4" />}
              title="Median then EMA"
              formula={`EMAₜ = ${EMA_ALPHA} × Medianₜ + ${1 - EMA_ALPHA} × EMAₜ₋₁`}
              detail={`Rolling ${MEDIAN_WINDOW}-sample median rejects isolated spikes; EMA smooths remaining variation.`}
            />
            <FormulaCard
              icon={<Activity className="h-4 w-4" />}
              title="Rate of rise"
              formula="r = (Medianₜ − Medianₜ₋₁) / Δt"
              detail="Time normalized to minutes; engine compares rise rate with weather-adapted thresholds."
            />
            <FormulaCard
              icon={<CloudRain className="h-4 w-4" />}
              title="Weather score"
              formula="Σ rainfall bands + humidity + cloud bands"
              detail="6h probability, 6h/24h rain volume, humidity and cloud cover contribute discrete points."
            />
            <FormulaCard
              icon={<Database className="h-4 w-4" />}
              title="Risk FSM"
              formula="CRITICAL → ALERT → WATCH → NORMAL"
              detail="Highest-severity predicates win; float switch may force CRITICAL independent of calculated level."
            />
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/50 px-5 py-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          Architecture descriptions are aligned to the current simulation contracts and configured
          risk engine.
        </span>
        <a
          className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary"
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo forecast API <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <p className="mt-1 text-xs leading-5">{value}</p>
    </div>
  );
}
function TaskCard({
  priority,
  title,
  detail,
  icon,
}: {
  priority: string;
  title: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-bold">
        {icon}
        {title}
        <span className="ml-auto rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-muted-foreground">
          {priority}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
function MiniCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-bold">{title}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
function FormulaCard({
  icon,
  title,
  formula,
  detail,
}: {
  icon: ReactNode;
  title: string;
  formula: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-bold">
        {icon}
        {title}
      </div>
      <div className="mt-3 rounded-xl bg-secondary/70 px-3 py-2 font-mono text-xs font-semibold">
        {formula}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
