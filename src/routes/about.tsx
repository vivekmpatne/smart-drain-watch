import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderCard } from "@/components/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Smart Drain" },
      { name: "description", content: "About the Smart Drain flood early-warning prototype for Bengaluru." },
      { property: "og:title", content: "About — Smart Drain" },
      { property: "og:description", content: "About the Smart Drain flood early-warning prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">About</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <PlaceholderCard title="Project background" />
        <PlaceholderCard title="Team" />
      </div>
    </div>
  ),
});
