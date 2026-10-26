import { createFileRoute } from "@tanstack/react-router";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { StateBadge } from "@/components/StateBadge";
import { NET_INFLOW_MAX, NET_INFLOW_MIN, SPEED_OPTIONS } from "@/lib/config";
import { indicatorState, ledColor, sensorStatus, systemHealth, useSimulation } from "@/store/simulationStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Control Room — Smart Drain" },
      { name: "description", content: "Simulated control room for monitoring drain water level, risk state and alerts." },
      { property: "og:title", content: "Control Room — Smart Drain" },
      { property: "og:description", content: "Simulated control room for drain flood risk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDebug,
});

const LED: Record<string, string> = {
  green: "bg-state-normal",
  yellow: "bg-state-alert",
  red: "bg-state-critical",
  off: "bg-muted-foreground/30",
};

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function AdminDebug() {
  const s = useSimulation();
  const o = s.output;
  const led = ledColor(s);
  const ind = indicatorState(s);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Control Room — engine debug panel</h1>
        <StateBadge state={s.escalated ? "ESCALATED" : (o?.state ?? "NORMAL")} />
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", systemHealth(s) === "SYSTEM HEALTHY" ? "bg-state-normal/15 text-state-normal" : "bg-state-alert/15 text-state-alert-text")}>
          {systemHealth(s)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-soft space-y-5 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Controls</h2>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>Net inflow</span>
              <span className="font-semibold">{s.netInflow > 0 ? "+" : ""}{s.netInflow} %/min</span>
            </div>
            <Slider min={NET_INFLOW_MIN} max={NET_INFLOW_MAX} step={1} value={[s.netInflow]} onValueChange={([v]) => s.set({ netInflow: v })} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            Speed
            {SPEED_OPTIONS.map((sp) => (
              <button key={sp} onClick={() => s.set({ speed: sp })} className={cn("rounded-full px-3 py-1 text-xs font-semibold", s.speed === sp ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                {sp}×
              </button>
            ))}
          </div>
          <Toggle label="Running" checked={s.running} onChange={(v) => s.set({ running: v })} />
          <Toggle label="Sensor node online" checked={s.sensorOnline} onChange={(v) => s.set({ sensorOnline: v })} />
          <Toggle label="Actuator node online" checked={s.actuatorOnline} onChange={(v) => s.set({ actuatorOnline: v })} />
          <Toggle label="Outlier spikes" checked={s.outliersEnabled} onChange={(v) => s.set({ outliersEnabled: v })} />
          <Toggle label="Storm weather override" checked={s.stormOverride} onChange={(v) => s.set({ stormOverride: v })} />
          <Toggle label="Force weather stale" checked={s.forceWeatherStale} onChange={(v) => s.set({ forceWeatherStale: v })} />
          <Toggle label="Show float switch" checked={s.showFloatSwitch} onChange={(v) => s.set({ showFloatSwitch: v })} />
          <div className="flex gap-2">
            <button onClick={s.acknowledge} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Acknowledge</button>
            <button onClick={s.reset} className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold">Reset</button>
          </div>
        </div>

        <div className="card-soft space-y-3 p-6 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Simulation status</h2>
          <Row k="Sim time" v={`${s.simTime}s`} />
          <Row k="True level (hidden truth)" v={`${s.trueLevel.toFixed(2)}%`} />
          <Row k="Sensor node" v={sensorStatus(s)} />
          <Row k="Actuator node" v={s.actuatorOnline ? "ONLINE" : "OFFLINE"} />
          <Row k="Indicator" v={ind} />
          <Row k="Escalation timer start" v={s.escalationStartedAt === null ? "—" : `${s.escalationStartedAt}s`} />
          <Row k="Ack received" v={String(s.ackReceived)} />
          {s.showFloatSwitch && <Row k="Float switch" v={s.trueLevel >= 95 ? "TRIPPED" : "OK"} />}
          <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <span className={cn("h-5 w-5 rounded-full", LED[led])} />
            <span>Virtual LED: {led.toUpperCase()}</span>
            {led === "red" && <span className="ml-auto text-xs font-bold text-state-critical-text">BUZZER ON</span>}
          </div>
          <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weather (raw, simulated)</h3>
          <pre className="overflow-auto rounded-xl bg-secondary p-3 text-xs">{JSON.stringify(s.weather, null, 1)}</pre>
        </div>

        <div className="card-soft p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Engine output</h2>
          <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-secondary p-3 text-xs">
            {o ? JSON.stringify({ ...o, levelRaw: +o.levelRaw.toFixed(2), levelMedian: +o.levelMedian.toFixed(2), levelEma: +o.levelEma.toFixed(2), rate: +o.rate.toFixed(2) }, null, 1) : "Waiting for first sample…"}
          </pre>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-soft p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event log</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {s.events.length === 0 && <li className="text-muted-foreground">No events yet.</li>}
            {s.events.map((e, i) => (
              <li key={i} className="flex items-center gap-3"><span className="w-16 text-muted-foreground">{e.simTime}s</span><StateBadge state={e.kind} /></li>
            ))}
          </ul>
        </div>
        <div className="card-soft p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Simulated email outbox (nothing is sent)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {s.outbox.length === 0 && <li className="text-muted-foreground">Empty.</li>}
            {s.outbox.map((m, i) => (
              <li key={i} className="rounded-xl bg-secondary p-3"><div className="font-semibold">{m.subject} <span className="font-normal text-muted-foreground">@ {m.simTime}s</span></div><div className="text-xs text-muted-foreground">{m.body}</div></li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">History buffer: {s.history.length} points.</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="text-right font-semibold">{v}</span></div>
  );
}
