import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Bell,
  Check,
  ChevronDown,
  Circle,
  CloudRain,
  Cpu,
  Gauge,
  Radio,
  RotateCcw,
  Waves,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { StateBadge } from "@/components/StateBadge";
import { NET_INFLOW_MAX, NET_INFLOW_MIN, SPEED_OPTIONS } from "@/lib/config";
import {
  indicatorState,
  ledColor,
  sensorStatus,
  systemHealth,
  useSimulation,
} from "@/store/simulationStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Municipal Control Room — Smart Drain" },
      { name: "description", content: "Live simulated telemetry and flood risk control room." },
    ],
  }),
  component: AdminControlRoom,
});

const LED: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
  off: "bg-muted-foreground/30",
};
const STATES = ["NORMAL", "WATCH", "ALERT", "CRITICAL"] as const;
const stateTone: Record<string, string> = {
  NORMAL: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  WATCH: "text-sky-700 bg-sky-500/10 border-sky-500/20",
  ALERT: "text-amber-700 bg-amber-500/10 border-amber-500/20",
  CRITICAL: "text-rose-700 bg-rose-500/10 border-rose-500/20",
  ESCALATED: "text-rose-700 bg-rose-500/10 border-rose-500/20",
};

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function AdminControlRoom() {
  const s = useSimulation();
  const state = s.escalated ? "ESCALATED" : (s.output?.state ?? "NORMAL");
  const health = systemHealth(s);
  const led = ledColor(s);
  const chartData = useMemo(() => s.history.slice(-60), [s.history]);
  const presets = [
    {
      name: "Heavy monsoon",
      icon: CloudRain,
      description: "Storm feed + rising inflow",
      apply: () => s.set({ stormOverride: true, netInflow: 16, running: true }),
    },
    {
      name: "Sensor glitch",
      icon: Activity,
      description: "Inject noisy outlier spikes",
      apply: () => s.set({ outliersEnabled: true, running: true }),
    },
    {
      name: "Flash flood",
      icon: Waves,
      description: "High water + rapid inflow",
      apply: () => s.set({ trueLevel: 68, netInflow: 32, stormOverride: true, running: true }),
    },
    {
      name: "Drain clogged",
      icon: AlertTriangle,
      description: "Sustained inflow, no relief",
      apply: () => s.set({ trueLevel: 52, netInflow: 8, stormOverride: false, running: true }),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Municipal operations · Bengaluru
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Drain Control Room</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live digital twin · Ward 152 / Koramangala
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              health === "SYSTEM HEALTHY" ? "bg-emerald-500" : "bg-amber-400",
            )}
          />
          {health}
          <span className="text-muted-foreground">· SIM {s.simTime.toFixed(0)}s</span>
        </div>
      </div>

      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border p-5 md:p-7",
          stateTone[state] ?? stateTone.NORMAL,
        )}
      >
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-current/10" />
        <div className="absolute -right-3 -top-11 h-44 w-44 rounded-full border border-current/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] opacity-70">
              <AlertTriangle className="h-4 w-4" />
              Flood risk status
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">{state}</h2>
              <StateBadge state={state} />
            </div>
            <p className="mt-2 max-w-xl text-sm opacity-80">
              {s.output?.reason ??
                "System is monitoring the drain. Increase inflow or choose a scenario to explore risk transitions."}
            </p>
          </div>
          <div className="flex items-center gap-5 rounded-2xl border border-current/10 bg-background/50 px-5 py-4 backdrop-blur">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-65">
                Filtered level
              </div>
              <div className="mt-1 text-4xl font-black tabular-nums">
                {(s.output?.levelEma ?? s.trueLevel).toFixed(1)}
                <span className="ml-1 text-lg">%</span>
              </div>
            </div>
            <div className="h-12 w-px bg-current/15" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-65">
                Rate of rise
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {(s.output?.rate ?? 0).toFixed(1)}
                <span className="ml-1 text-sm">%/min</span>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-4 gap-2">
          {STATES.map((item, i) => {
            const activeIndex = Math.max(
              0,
              STATES.indexOf((s.output?.state ?? "NORMAL") as (typeof STATES)[number]),
            );
            const active = item === (s.output?.state ?? "NORMAL");
            return (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-2 border-t-2 pt-2 text-[10px] font-bold uppercase tracking-wider sm:text-xs",
                  active
                    ? "border-current opacity-100"
                    : i <= activeIndex
                      ? "border-current/40 opacity-60"
                      : "border-current/15 opacity-40",
                )}
              >
                <span className="hidden sm:inline">0{i + 1}</span>
                {item}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <section className="card-soft min-w-0 p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Water level telemetry</h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Live
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Measured truth against EMA-filtered sensor estimate
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <Legend color="var(--color-water)" label="True level" />
              <Legend color="var(--color-primary)" label="EMA filtered" />
              <Legend color="var(--color-chart-5)" label="Raw sensor" dashed />
            </div>
          </div>
          <div className="h-[270px] w-full">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-water)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="var(--color-water)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v) => `${v}s`}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="true"
                    name="True level"
                    stroke="var(--color-water)"
                    strokeWidth={2}
                    fill="url(#trueFill)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="raw"
                    name="Raw sensor"
                    stroke="var(--color-chart-5)"
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ema"
                    name="EMA filtered"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-6 w-6 opacity-40" />
                Collecting first telemetry samples…
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{chartData.length}</span> samples ·
              latest 60 points
            </span>
            <span>Sample interval 3s · EMA α = 0.3</span>
          </div>
        </section>

        <section className="card-soft p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Hardware twin</h2>
              <p className="mt-1 text-xs text-muted-foreground">Dual ESP32 node health</p>
            </div>
            <Cpu className="h-5 w-5 text-muted-foreground" />
          </div>
          <NodeCard
            icon={<Radio className="h-4 w-4" />}
            name="Sensor Node"
            model="ESP32 · Ultrasonic + rain"
            online={s.sensorOnline}
            status={sensorStatus(s).split(" • ").at(-1) ?? "DATA FRESH"}
          >
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat
                icon={<BatteryCharging className="h-3.5 w-3.5" />}
                label="Battery"
                value="87%"
              />
              <MiniStat
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="MQTT QoS"
                value="1 · at least once"
              />
            </div>
          </NodeCard>
          <NodeCard
            icon={<Bell className="h-4 w-4" />}
            name="Actuator Node"
            model="ESP32 · RGB + buzzer"
            online={s.actuatorOnline}
            status={s.actuatorOnline ? "CONNECTED" : "DISCONNECTED"}
          >
            <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/70 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("h-2.5 w-2.5 rounded-full", LED[led])} />
                <span>Virtual LED · {led.toUpperCase()}</span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  led === "red" ? "text-rose-600" : "text-muted-foreground",
                )}
              >
                {led === "red" ? "Buzzer active" : "Buzzer idle"}
              </span>
            </div>
          </NodeCard>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                health === "SYSTEM HEALTHY" ? "bg-emerald-500" : "bg-amber-400",
              )}
            />
            <span className="font-semibold">{health}</span>
            <span className="ml-auto text-muted-foreground">Sensor + weather link</span>
          </div>
        </section>
      </div>

      <section className="card-soft p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Scenario injection</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Load a field condition into the digital twin
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            One click · reversible
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {presets.map(({ name, icon: Icon, description, apply }) => (
            <button
              key={name}
              onClick={apply}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {description}
                </span>
              </span>
              <ChevronDown className="ml-auto h-4 w-4 -rotate-90 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <details className="card-soft group">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5">
          <div>
            <h2 className="font-bold">Simulation controls & event log</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tune inputs, trigger faults, acknowledge and inspect engine events
            </p>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 border-t border-border p-5 lg:grid-cols-3">
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Net inflow</span>
                <span className="font-semibold">
                  {s.netInflow > 0 ? "+" : ""}
                  {s.netInflow} %/min
                </span>
              </div>
              <Slider
                min={NET_INFLOW_MIN}
                max={NET_INFLOW_MAX}
                step={1}
                value={[s.netInflow]}
                onValueChange={([v]) => s.set({ netInflow: v ?? 0 })}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              Speed
              {SPEED_OPTIONS.map((sp) => (
                <button
                  key={sp}
                  onClick={() => s.set({ speed: sp })}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    s.speed === sp ? "bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  {sp}×
                </button>
              ))}
            </div>
            <Toggle
              label="Simulation running"
              checked={s.running}
              onChange={(v) => s.set({ running: v })}
            />
            <Toggle
              label="Sensor node online"
              checked={s.sensorOnline}
              onChange={(v) => s.set({ sensorOnline: v })}
            />
            <Toggle
              label="Actuator node online"
              checked={s.actuatorOnline}
              onChange={(v) => s.set({ actuatorOnline: v })}
            />
            <Toggle
              label="Sensor outlier spikes"
              checked={s.outliersEnabled}
              onChange={(v) => s.set({ outliersEnabled: v })}
            />
            <Toggle
              label="Storm weather override"
              checked={s.stormOverride}
              onChange={(v) => s.set({ stormOverride: v })}
            />
            <Toggle
              label="Force weather stale"
              checked={s.forceWeatherStale}
              onChange={(v) => s.set({ forceWeatherStale: v })}
            />
            <Toggle
              label="Show float switch"
              checked={s.showFloatSwitch}
              onChange={(v) => s.set({ showFloatSwitch: v })}
            />
            <div className="flex gap-2">
              <button
                onClick={s.acknowledge}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Check className="h-3.5 w-3.5" />
                Acknowledge
              </button>
              <button
                onClick={s.reset}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Live engine output
            </h3>
            <Row k="True water level" v={`${s.trueLevel.toFixed(2)}%`} />
            <Row k="Sensor" v={sensorStatus(s)} />
            <Row k="Actuator" v={s.actuatorOnline ? "ONLINE" : "OFFLINE"} />
            <Row k="Indicator" v={indicatorState(s)} />
            <Row
              k="Escalation started"
              v={s.escalationStartedAt === null ? "—" : `${s.escalationStartedAt}s`}
            />
            <Row k="Acknowledged" v={String(s.ackReceived)} />
            {s.showFloatSwitch && <Row k="Float switch" v={s.trueLevel >= 95 ? "TRIPPED" : "OK"} />}
            <Row k="History buffer" v={`${s.history.length} points`} />
            {s.output && (
              <pre className="max-h-40 overflow-auto rounded-xl bg-secondary p-3 text-[10px]">
                {JSON.stringify(
                  {
                    ...s.output,
                    levelRaw: +s.output.levelRaw.toFixed(2),
                    levelMedian: +s.output.levelMedian.toFixed(2),
                    levelEma: +s.output.levelEma.toFixed(2),
                    rate: +s.output.rate.toFixed(2),
                  },
                  null,
                  1,
                )}
              </pre>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Recent events
            </h3>
            <ul className="mt-3 space-y-2">
              {s.events.length === 0 && (
                <li className="text-sm text-muted-foreground">No events yet.</li>
              )}
              {s.events.slice(0, 8).map((e, i) => (
                <li key={`${e.simTime}-${e.kind}-${i}`} className="flex items-center gap-3 text-xs">
                  <span className="w-12 text-muted-foreground">{e.simTime}s</span>
                  <StateBadge state={e.kind} />
                </li>
              ))}
            </ul>
            {s.outbox.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Simulated notification outbox
                </div>
                <div className="mt-2 text-xs font-semibold">
                  {s.outbox[0].subject}{" "}
                  <span className="font-normal text-muted-foreground">
                    @ {s.outbox[0].simTime}s
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.outbox[0].body}</p>
              </div>
            )}
          </div>
        </div>
      </details>
      <p className="text-center text-[11px] text-muted-foreground">
        Simulation twin for the SIC IoT capstone · Values shown are simulated, not live municipal
        sensor data.
      </p>
    </div>
  );
}

function Legend({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span
        className={cn("w-4 border-t-2", dashed && "border-dashed")}
        style={{ borderColor: color }}
      />
      {label}
    </span>
  );
}
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-soft">
      <div className="mb-1 text-[10px] text-muted-foreground">Simulation {label}s</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Circle className="h-2 w-2 fill-current" style={{ color: p.color }} />
            {p.name}
          </span>
          <span className="font-bold tabular-nums">{Number(p.value).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}
function NodeCard({
  icon,
  name,
  model,
  online,
  status,
  children,
}: {
  icon: ReactNode;
  name: string;
  model: string;
  online: boolean;
  status: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-border p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            online ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{name}</div>
          <div className="text-[10px] text-muted-foreground">{model}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-emerald-500" : "bg-rose-500")}
          />
          {status}
        </div>
      </div>
      {children}
    </div>
  );
}
function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xs font-bold">{value}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}
