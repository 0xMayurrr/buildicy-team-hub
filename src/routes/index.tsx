import { createFileRoute } from "@tanstack/react-router";
import { TeamHubApp } from "@/components/team-hub/TeamHubApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buildicy Team Hub — Leads & Team Workspace" },
      { name: "description", content: "A focused workspace for Buildicy team performance, leads, follow-ups and conversations." },
      { property: "og:title", content: "Buildicy Team Hub" },
      { property: "og:description", content: "Track leads, team activity, follow-ups and conversations in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamHubApp,
});