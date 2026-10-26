import { createFileRoute, Link } from "@tanstack/react-router";
import { PlaceholderCard } from "@/components/SiteLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Drain — Urban Flood Early-Warning Simulation" },
      { name: "description", content: "Explore a browser simulation of an ESP32 + MQTT + Node-RED flood early-warning prototype for Bengaluru drains." },
      { property: "og:title", content: "Smart Drain — Urban Flood Early-Warning Simulation" },
      { property: "og:description", content: "Interactive simulation of an IoT drain monitoring and flood risk engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="space-y-8">
      <section className="card-soft p-8 md:p-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-water">Interactive simulation</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          Early flood warnings for urban drains, simulated in your browser.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          This app simulates a real prototype: an ESP32 sensor node, MQTT messaging and a Node-RED risk engine. All values shown are simulated, not live sensor readings.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/admin" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Open Control Room</Link>
          <Link to="/citizen" className="rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-secondary">Citizen Portal</Link>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <PlaceholderCard title="How it works" />
        <PlaceholderCard title="Hardware" />
        <PlaceholderCard title="Project media" />
      </div>
    </div>
  );
}
