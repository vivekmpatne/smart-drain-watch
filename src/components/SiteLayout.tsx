import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Droplets } from "lucide-react";
import { LINKS } from "@/lib/config";
import { useSimulationLoop } from "@/hooks/useSimulationLoop";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/admin", label: "Control Room" },
  { to: "/citizen", label: "Citizen" },
  { to: "/architecture", label: "Architecture" },
  { to: "/about", label: "About" },
] as const;

function RoleSwitcher() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const opts = [
    { to: "/admin" as const, label: "Control Room" },
    { to: "/citizen" as const, label: "Citizen" },
  ];
  return (
    <div className="flex rounded-full bg-secondary p-1 text-xs font-semibold">
      {opts.map((o) => (
        <button
          key={o.to}
          onClick={() => navigate({ to: o.to })}
          className={cn(
            "rounded-full px-3 py-1.5 transition-colors",
            pathname.startsWith(o.to) ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  useSimulationLoop();
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Droplets className="h-4 w-4" />
            </span>
            Smart Drain
          </Link>
          <span className="rounded-full border border-water/40 bg-water/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-water">
            Simulation
          </span>
          <nav className="order-last flex w-full gap-1 overflow-x-auto text-sm md:order-none md:ml-6 md:w-auto">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-card text-foreground shadow-soft" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <RoleSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-6 text-sm text-muted-foreground md:px-6">
          <span>Smart Drain — interactive simulation of an IoT flood early-warning prototype.</span>
          <div className="ml-auto flex gap-4">
            <a href={LINKS.github} target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub repo</a>
            <a href={LINKS.demoVideos} target="_blank" rel="noreferrer" className="hover:text-foreground">Demo videos</a>
            <a href={LINKS.poster} target="_blank" rel="noreferrer" className="hover:text-foreground">Poster</a>
            <a href={LINKS.presentation} target="_blank" rel="noreferrer" className="hover:text-foreground">Capstone PPT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PlaceholderCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card-soft p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2 text-sm text-muted-foreground">{children ?? "[Placeholder — content to be added]"}</div>
    </div>
  );
}
