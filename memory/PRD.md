# CreatorHub — Product Requirements Document

## Original problem statement
Build CreatorHub — an all-in-one analytics, automation and business management SaaS for Instagram & LinkedIn creators. Full-stack app with auth, permission-gated role-based sidebar, 11 product pages, and a 4-step team-member wizard with per-permission overrides.

## Architecture (v1 chosen with user)
- **Backend:** FastAPI + MongoDB (single `server.py` + `seed_data.py`)
- **Frontend:** React (JS, not TS per platform constraint) + Tailwind + Recharts + Zustand + shadcn/ui primitives + Outfit/Manrope typography
- **Auth:** JWT (HS256), 24h access + 30d refresh, bcrypt. Forced password change on first login for invited team members.
- **Permissions:** Server-side `require_permission(perm)` dependency on every protected route; client-side `<PermissionGate>` hides nav + buttons. Scheduler sees only Posts+Tasks; Analyst sees only Analytics+Posts+Tasks+Brand Deals.
- **Integrations:** Emergent LLM Key → Claude Sonnet 4.5 for AI Insights; Emergent object storage for Media Vault (v2). Instagram/LinkedIn OAuth is **mocked** (seeded demo data) pending real keys.

## User personas
1. **Owner** (Jane Doe) — creates workspace, has all permissions.
2. **Admin** — same as owner minus workspace deletion / ownership transfer.
3. **Editor** (Marcus) — content + tasks + deals, no team/settings.
4. **Scheduler** (Tom) — posts + tasks only.
5. **Analyst** (Priya) — analytics + read-only posts/tasks/deals.
6. **Viewer** — dashboard + posts view only.

## Core requirements (static)
- Dark-mode-only purple `#7c3aed` theme, 12px card radius, 0.5px borders, Outfit/Manrope 400/500.
- Persistent 200px sidebar collapsible to 56px, 48px topbar with Instagram↔LinkedIn switcher + date range + live sync.
- Tasks atomically create/update/delete paired calendar events.
- Every destructive action needs confirmation; every protected route 403s server-side and hides in UI.

## Implemented — 2026-04-18 (v1 ship)
- Auth: Owner signup with 3-step onboarding wizard; team login; forced password change.
- AppShell: collapsible sidebar with role-filtered nav, topbar with platform switcher, date range, live sync indicator, mobile bottom tabbar.
- Dashboard: greeting, 4 + 4 stat cards with sparklines, weekly views bar chart, today's tasks, upcoming events, top post, AI recommendation card.
- Analytics: reach/impressions/visits/clicks stats, 8-week bar chart, best times cards, content-type progress bars, top-countries, follower growth line, age/gender donut, CSV export button.
- Posts: search + type + sort filters + paginated table + slide-out detail drawer with caption/hashtags/stats grid.
- Tasks: Overdue/Today/Upcoming grouped lists, priority dots, Add Task modal (atomic calendar sync), toggle complete with strikethrough, stats sidebar with completion bar.
- Calendar: monthly grid with color-coded event pills (call/email/post/meeting/overdue), Today panel, prev/today/next nav, legend strip.
- Team: stats row, members list, pending invites, 4-step Add Member wizard (personal → role card-picker → permission toggles grouped by section → confirm), credentials copy modal, member detail modal with permission matrix + recent activity + edit mode + remove confirmation.
- Brand Deals: 5-column Kanban pipeline with 4 stat cards.
- AI Insights: LLM-generated recommendation cards (Claude Sonnet 4.5) + content health donut + 4 breakdown bars.
- Settings: workspace name / currency / timezone / date format.
- Seed: 1 workspace, 4 users + 1 pending invite, 2 platform connections, 15 posts, 7 tasks (3 overdue/2 today/2 upcoming), 13 events, 3 deals, 90 days analytics snapshots, 6 captions, 3 hashtag sets.

## Backlog (P0/P1/P2 for v2)
- **P0 (deferred)** Automations page (comment + scheduling rules), Media Vault UI (uploader wired to Emergent storage, already backend-ready), AI Insights refresh animation.
- **P1** Brand Deals detail drawer + Kanban drag-drop (@dnd-kit), Media Kit PDF export, CSV export for Posts.
- **P2** Real Instagram/LinkedIn OAuth, Resend email for invites, Billing tab, light-mode toggle, Recharts ResponsiveContainer width-1 warnings cleanup.

## Implemented — 2026-04-18 (v2 ship)
- **Automations** (`/automations`) — two-column layout (Comment / Scheduling), six seeded default rules, per-row edit + toggle, full Automation log with Success/Failed pills. New Rule Modal with Platform pills, 2x2 Trigger/Action cards, conditional keyword or schedule fields, Message template with variable chips + colour-coded live preview, char counter (amber >=350, red >=450), rule name + max/day + activate + skip-repeat, live rule-preview sentence.
- **Connections** (`/connections` standalone + Settings tab) — two cards (IG pink, LI blue), Sync now + Disconnect with confirmation, Mock OAuth modal for reconnect, auto-sync toggle + Sync all now.
- **Media Vault** (`/media-vault`) — files grid, caption library with search + copy + Top-engagement badges, hashtag sets with copy, storage-usage bar.
- **Settings tabs** — General / Connections / Notifications.
- **Sidebar overhaul** — correct order, live badges via `/api/nav/counts` every 60s (Tasks red, Calendar green, AI Insights/Team purple). Automations + Media Vault + Connections now fully enabled.
- **Backend additions** — Automations CRUD + toggle + logs + auto-seed, `/api/nav/counts`, `/api/connections/sync-all`, `/api/deals/:id` PUT. Tests: 37/37 pass.

## Backlog (v3 / future)
- P0: Brand Deals Kanban drag-drop (@dnd-kit) + detail drawer + Media Kit PDF export.
- P1: Real IG Graph API + LinkedIn OAuth wiring when credentials provided.
- P1: Light-mode toggle.
- P2: Real automation rule evaluator / webhook processor.
- P2: Split server.py into /routes subpackage; Billing tab; Resend email for invites.

## Implemented — 2026-04-18 (v2.1 settings overhaul)
- **Settings page** — full 6-tab layout: General / Connections / Notifications / Team Roles / AI / Billing with URL-param persistence (`/settings?tab=ai`).
- **General tab** — workspace name, currency+date-format side-by-side, timezone, new Auto-assign-leads (round-robin) toggle, Save changes.
- **Connections tab** — reuses standalone Connections component (platform cards + sync-all + auto-sync toggle).
- **Notifications tab** — 6 labelled toggle rows (Overdue, Weekly digest, New deal, Post performance, Team activity, Sync errors) with Save button.
- **Team Roles tab** — 5 role cards left column with user counts, permission matrix right column (6 grouped permission categories x 19 individual permissions, green check / red X), "Edit role" teaser button.
- **AI tab** — Enable toggle, frequency select, read-only AI model display (Claude Sonnet via Emergent), Health score + Competitor benchmark toggles, purple info box, Save AI preferences.
- **Billing tab** — Pro plan card (£29/mo + 7 features + Manage billing), Business upgrade card (£79/mo + 7 features + Upgrade CTA), Cancel subscription link with confirmation dialog.
- **Backend** — `GET /api/settings` (returns general/notifications/ai/plan), `PUT /api/settings/general|notifications|ai` all persisting to workspace doc.
- **Sidebar refined** — removed standalone Connections nav (Connections now lives inside Settings tab), removed AI Insights badge per final spec. Final order: Overview{Dashboard, Analytics, Posts} / Productivity{Tasks red badge, Calendar green badge} / Growth{Automations, Brand Deals, AI Insights} / Workspace{Media Vault, Team purple badge, Settings}.

## Implemented — 2026-04-18 (v3 ship)
- **Brand Deals Kanban with drag-drop** (@dnd-kit) — drag any card between the 5 stage columns (New Enquiry → Negotiating → Contract Sent → Signed → Completed), optimistic UI with rollback on API failure, column highlight on hover-over, drag overlay preview.
- **Deal detail drawer** — right-side slide-out with brand avatar + contact + email, Value/Deadline/Platforms summary, editable Stage dropdown, Description, Notes timeline (free-text), "Mark complete" quick action + "Save changes".
- **Media Kit PDF export** — one-click jsPDF generation of branded media kit (creator name + date header, Audience block with per-platform handle + follower count, Performance snapshot with pipeline/signed/avg deal size, footer). Downloads as `MediaKit-<name>.pdf`.
- **Automations Simulate Fire** — new amber lightning-bolt button on each automation row (edit-permission only). Calls `POST /api/automations/:id/simulate` which picks a sample user, runs the message_template through variable replacement ({name}/{link}/{product}/{handle}/{post_title}), inserts a real persisted entry into `automation_logs`, increments trigger_count, and toasts back a preview of the generated DM.
- **Persisted automation logs** — `/api/automations/logs` now returns real stored entries when available, falling back to synthesised demo entries only when the collection is empty for a workspace.
- **Light-mode toggle** in TopBar (sun/moon) — palette fully driven by CSS custom properties (`--bg-primary/secondary/tertiary`, `--text-primary/secondary/tertiary`, `--border-default`, shadcn tokens). Theme persisted in zustand+localStorage, applied via `html.light` class. Purple brand accent preserved in both modes.

## Remaining backlog
- P0: Real Instagram Graph API + LinkedIn OAuth wiring (awaiting credentials from user)
- P1: Light-mode polish for Recharts axes/tooltips (bars still use platform pink/blue which is intentional; only tooltip backgrounds might warrant a lighter variant)
- P2: Real automation rule evaluator / webhook processor (currently simulate-only)
- P2: Split server.py into /routes subpackage
