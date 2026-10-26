import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderCard } from "@/components/SiteLayout";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Smart Drain" },
      { name: "description", content: "How the ESP32 sensor node, MQTT broker and Node-RED risk engine fit together." },
      { property: "og:title", content: "Architecture — Smart Drain" },
      { property: "og:description", content: "ESP32 sensor node, MQTT and Node-RED risk engine architecture." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Architecture</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <PlaceholderCard title="Sensor node (ESP32)" />
        <PlaceholderCard title="MQTT broker" />
        <PlaceholderCard title="Node-RED risk engine" />
      </div>
    </div>
  ),
});
