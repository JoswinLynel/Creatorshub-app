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
