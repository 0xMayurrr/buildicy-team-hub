# Buildicy Team Hub

## Build
- Replace the `/` placeholder with a polished light-theme team workspace inspired by the uploaded Tasker reference: compact sidebar, bright canvas, soft-gray surface, rounded white panels, and focused purple accents.
- Implement the Founder dashboard as the default screen, plus a Member dashboard, searchable/filterable Leads view, lead details with editable status and activity/discussion, Team Chat, Notifications, and Team Management.
- Use realistic in-memory mock data only. Keep the interface modular and functional: navigation, responsive sidebar, tabs, filters, dialogs/forms, message composer, and notification actions.
- Set app-specific page metadata and semantic purple/neutral design tokens; preserve the existing TanStack Start and shadcn conventions.

## Technical details
- Keep navigation inside the existing `/` route to avoid unnecessary URL changes; render each workspace screen from shared local view state.
- Organize the workspace shell, reusable UI, and mock data in `src/components/team-hub/`; do not add backend, persistence, authentication, or API calls.
- Validate with the existing route test, relevant interaction/browser checks, and current preview diagnostics.
