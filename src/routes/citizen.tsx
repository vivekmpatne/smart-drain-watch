import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  CloudDrizzle,
  CloudRain,
  Clock3,
  Droplets,
  LocateFixed,
  MapPin,
  Phone,
  ShieldCheck,
  Waves,
  X,
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { useSimulation } from "@/store/simulationStore";
import type { RiskState } from "@/lib/riskEngine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen Flood Safety Portal — Smart Drain" },
      {
        name: "description",
        content: "Simulated flood risk and commuter safety advice for a Bengaluru drain.",
      },
      { property: "og:title", content: "Citizen Flood Safety Portal — Smart Drain" },
      {
        property: "og:description",
        content: "Live digital twin status and public safety guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CitizenPortal,
});

const riskInfo: Record<
  RiskState,
  {
    title: string;
    label: string;
    advice: string;
    street: string;
    action: string;
    theme: string;
    icon: typeof ShieldCheck;
  }
> = {
  NORMAL: {
    title: "Conditions are stable",
    label: "SAFE",
    advice: "Drain level is within normal range. Continue to watch for changes during rainfall.",
    street: "Koramangala 80ft Road",
    action: "Normal travel advised",
    theme: "emerald",
    icon: ShieldCheck,
  },
  WATCH: {
    title: "Water pooling possible",
    label: "WATCH",
    advice:
      "Rainfall or rising water may affect low-lying lanes. Slow down and avoid standing water.",
    street: "Koramangala 80ft Road",
    action: "Use caution near drains",
    theme: "sky",
    icon: Waves,
  },
  ALERT: {
    title: "Waterlogging risk elevated",
    label: "ALERT",
    advice:
      "Water is rising or the forecast is worsening. Avoid underpasses and choose a higher route.",
    street: "Koramangala 80ft Road",
    action: "Avoid underpasses",
    theme: "amber",
    icon: AlertTriangle,
  },
  CRITICAL: {
    title: "Flash flood danger",
    label: "CRITICAL",
    advice:
      "Move away from the drain and low-lying roads. Do not walk or drive through floodwater; follow local emergency instructions.",
    street: "Koramangala 80ft Road",
    action: "Move to higher ground",
    theme: "rose",
    icon: AlertTriangle,
  },
};

const themeClasses: Record<string, string> = {
  emerald: "border-emerald-500/25 bg-emerald-500/[.07] text-emerald-900",
  sky: "border-sky-500/25 bg-sky-500/[.07] text-sky-900",
  amber: "border-amber-500/25 bg-amber-500/[.08] text-amber-950",
  rose: "border-rose-500/25 bg-rose-500/[.08] text-rose-950",
};

export function CitizenPortal() {
  const s = useSimulation();
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [description, setDescription] = useState("Water collecting beside the drain cover");
  const risk = (s.output?.state ?? "NORMAL") as RiskState;
  const config = riskInfo[risk];
  const Icon = config.icon;
  const level = s.output?.levelEma ?? s.trueLevel;
  const rate = s.output?.rate ?? 0;
  const minutes = s.output?.timeToCritical.minutes ?? null;
  const hours =
    s.weather.rainProb6h >= 60
      ? ["High", "Likely", "Elevated"]
      : s.weather.rainProb6h >= 35
        ? ["Possible", "Moderate", "Monitor"]
        : ["Low", "Unlikely", "Low"];
  const waterY = 185 - Math.min(100, Math.max(0, level)) * 1.25;

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReported(true);
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Bengaluru · Local safety bulletin
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Flood Safety Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Street-level drain status and practical travel guidance
          </p>
        </div>
        <span className="rounded-full border border-water/30 bg-water/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-water">
          Interactive simulation
        </span>
      </header>

      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border p-5 md:p-7",
          themeClasses[config.theme],
        )}
      >
        <div className="absolute -right-10 -top-16 h-60 w-60 rounded-full border border-current/10" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1 text-[10px] font-black tracking-[.14em]">
                <Icon className="h-3.5 w-3.5" />
                {config.label} RISK
              </span>
              <StateBadge state={risk} />
            </div>
            <h2 className="text-2xl font-bold md:text-3xl">{config.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">{config.advice}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {config.street}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Updated at sim {s.simTime.toFixed(0)}s
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-current/10 bg-background/70 p-5 text-center backdrop-blur">
            <div className="text-[10px] font-bold uppercase tracking-[.15em] opacity-60">
              Drain level
            </div>
            <div className="mt-1 text-5xl font-black tabular-nums">
              {level.toFixed(0)}
              <span className="text-2xl">%</span>
            </div>
            <div className="mt-1 text-xs opacity-70">filtered estimate</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="card-soft overflow-hidden p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Drain & street level</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Illustrative cross-section · Koramangala ward twin
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold">
              Overflow line · 80%
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl bg-sky-50/70 dark:bg-sky-950/20">
            <svg
              viewBox="0 0 620 260"
              role="img"
              aria-label={`Illustration of drain at ${level.toFixed(0)} percent water level`}
              className="h-auto w-full"
            >
              <defs>
                <linearGradient id="citizenWater" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#38bdf8" stopOpacity=".78" />
                  <stop offset="1" stopColor="#0284c7" stopOpacity=".95" />
                </linearGradient>
              </defs>
              <rect width="620" height="260" fill="transparent" />
              <path d="M0 75 H620 V118 H0Z" fill="#64748b" />
              <path d="M0 75 H620" stroke="#334155" strokeWidth="7" />
              <path d="M230 77 V219 Q230 236 247 236 H373 Q390 236 390 219 V77" fill="#334155" />
              <path d="M244 90 V216 Q244 222 250 222 H370 Q376 222 376 216 V90Z" fill="#e2e8f0" />
              <path
                d={`M244 ${Math.max(96, waterY)} H376 V216 Q376 222 370 222 H250 Q244 222 244 216Z`}
                fill="url(#citizenWater)"
              />
              <line
                x1="218"
                x2="402"
                y1="85"
                y2="85"
                stroke="#f97316"
                strokeDasharray="7 5"
                strokeWidth="3"
              />
              <text x="405" y="89" fill="#c2410c" fontSize="11" fontWeight="700">
                OVERFLOW 80%
              </text>
              <text
                x="310"
                y="62"
                fill="#0f172a"
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
              >
                ROAD SURFACE
              </text>
              <path
                d="M48 123 h106 l-20-20 m20 20-20 20"
                fill="none"
                stroke="#64748b"
                strokeWidth="3"
              />
              <path
                d="M464 123 h106 l-20-20 m20 20-20 20"
                fill="none"
                stroke="#64748b"
                strokeWidth="3"
              />
              <text x="310" y="251" fill="#475569" textAnchor="middle" fontSize="11">
                Drain chamber · live twin level {level.toFixed(0)}%
              </text>
              <text x="310" y="199" fill="white" textAnchor="middle" fontSize="16" fontWeight="800">
                {level.toFixed(0)}%
              </text>
            </svg>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric
              icon={<Droplets className="h-4 w-4" />}
              label="Filtered level"
              value={`${level.toFixed(1)}%`}
            />
            <Metric
              icon={
                rate >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
              }
              label="Water trend"
              value={`${rate > 0 ? "+" : ""}${rate.toFixed(1)}%/min`}
            />
            <Metric
              icon={<Clock3 className="h-4 w-4" />}
              label="Time to critical"
              value={minutes === null ? "Not rising" : `~${Math.max(0, Math.round(minutes))} min`}
            />
          </div>
          <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
            Trend and time estimate come from the simulated risk engine. This is a demonstration,
            not a municipal measurement.
          </p>
        </section>

        <section className="card-soft p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Commuter safety</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Guidance updates with the simulated risk state
          </p>
          <div className="mt-4 rounded-2xl bg-secondary/60 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Recommended action
            </div>
            <div className="mt-1 text-sm font-bold">{config.action}</div>
            <ul className="mt-3 space-y-2">
              {(risk === "NORMAL"
                ? ["Stay alert during heavy showers", "Do not block drain grates"]
                : risk === "WATCH"
                  ? [
                      "Reduce speed on waterlogged lanes",
                      "Keep distance from open drains",
                      "Check updates before starting your trip",
                    ]
                  : risk === "ALERT"
                    ? [
                        "Avoid low-lying roads and underpasses",
                        "Do not enter flowing water on foot or by vehicle",
                        "Choose a route on higher ground",
                      ]
                    : [
                        "Move to a safe, elevated location",
                        "Keep clear of the drain and electrical hazards",
                        "Call local emergency services if anyone is in immediate danger",
                      ]
              ).map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5">
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {risk === "CRITICAL" && (
            <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/[.06] p-4">
              <div className="text-xs font-bold text-rose-800">Emergency contacts</div>
              <a
                href="tel:1533"
                className="mt-2 flex items-center gap-2 text-sm font-bold text-rose-800"
              >
                <Phone className="h-4 w-4" />
                BBMP helpline · 1533
              </a>
              <p className="mt-1 text-[10px] text-muted-foreground">
                For immediate danger, contact local emergency services.
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setReportOpen(true);
              setReported(false);
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition-colors hover:bg-secondary"
          >
            <Camera className="h-4 w-4" />
            Report a drainage issue
          </button>
        </section>
      </div>

      <section className="card-soft p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-sky-600" />
              <h2 className="text-lg font-bold">Rain outlook · next 6 hours</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Simulated Open-Meteo-style forecast context · no live API connection
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold text-muted-foreground">
            Forecast twin
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ForecastCard
            title="Rain probability"
            value={`${Math.round(s.weather.rainProb6h)}%`}
            note="Next 6 hours"
            icon={<CloudDrizzle className="h-4 w-4" />}
          />
          <ForecastCard
            title="Expected rainfall"
            value={`${s.weather.rainVolume6h.toFixed(1)} mm`}
            note="Simulated 6h volume"
            icon={<Droplets className="h-4 w-4" />}
          />
          <ForecastCard
            title="Flood outlook"
            value={hours[1]}
            note={hours[2]}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-sky-500/[.06] p-3 text-xs text-sky-900">
          <CloudRain className="h-4 w-4 shrink-0" />
          Rain score contributes to adaptive thresholds and the WATCH state in the digital twin.
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>All ward readings, advisories and forecast values on this page are simulated.</span>
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Open-Meteo API reference <ArrowUpRight className="h-3 w-3" />
        </a>
      </footer>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReportOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">
                  Community report · simulation
                </div>
                <h2 id="report-title" className="mt-1 text-xl font-bold">
                  Report drainage issue
                </h2>
              </div>
              <button
                aria-label="Close report form"
                onClick={() => setReportOpen(false)}
                className="rounded-full p-2 hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {reported ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <h3 className="mt-3 text-lg font-bold">Report received</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Demo reference SDW-0153 · geotag attached · no report was sent to BBMP.
                </p>
                <button
                  onClick={() => setReportOpen(false)}
                  className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitReport} className="mt-5 space-y-4">
                <label className="block text-xs font-bold">
                  Issue details
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <div className="rounded-xl border border-border bg-secondary/50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <LocateFixed className="h-4 w-4 text-primary" />
                    Approximate location attached
                  </div>
                  <p className="mt-1 pl-6 text-xs text-muted-foreground">
                    {config.street} · simulated pin 12.9352° N, 77.6245° E
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    <Camera className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-xs font-bold">Photo attachment preview</div>
                    <div className="text-[10px] text-muted-foreground">
                      Mock image · drain-cover-waterlogging.jpg
                    </div>
                  </div>
                  <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-700">
                    READY
                  </span>
                </div>
                <p className="text-[10px] leading-4 text-muted-foreground">
                  This is a local demo only. It does not collect GPS, upload photos or contact city
                  services.
                </p>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  Submit simulated report <ArrowUpRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
function ForecastCard({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{note}</div>
    </div>
  );
}
