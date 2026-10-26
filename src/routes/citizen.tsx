import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderCard } from "@/components/SiteLayout";

export const Route = createFileRoute("/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen Portal — Smart Drain" },
      { name: "description", content: "Simulated public view of drain flood risk for residents." },
      { property: "og:title", content: "Citizen Portal — Smart Drain" },
      { property: "og:description", content: "Simulated public view of drain flood risk for residents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Citizen Portal</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <PlaceholderCard title="Local flood risk" />
        <PlaceholderCard title="Safety guidance" />
      </div>
    </div>
  ),
});
