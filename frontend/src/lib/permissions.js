// Permission catalog and sidebar visibility rules.
export const PERMISSIONS = [
  "dashboard_view", "analytics_view",
  "posts_view", "posts_edit",
  "tasks_view", "tasks_edit",
  "calendar_view",
  "automations_view", "automations_edit",
  "brand_deals_view", "brand_deals_edit",
  "ai_insights_view",
  "media_vault_view", "media_vault_edit",
  "team_view", "team_edit",
  "settings_view", "settings_edit",
];

export const PERMISSION_LABELS = {
  dashboard_view: "View dashboard",
  analytics_view: "View analytics",
  posts_view: "View posts",
  posts_edit: "Create / edit posts",
  tasks_view: "View tasks",
  tasks_edit: "Create / edit tasks",
  calendar_view: "View calendar",
  automations_view: "View automations",
  automations_edit: "Create / edit automations",
  brand_deals_view: "View brand deals",
  brand_deals_edit: "Manage brand deals",
  ai_insights_view: "View AI insights",
  media_vault_view: "View media vault",
  media_vault_edit: "Upload / delete media",
  team_view: "View team",
  team_edit: "Invite / remove members",
  settings_view: "View settings",
  settings_edit: "Edit settings",
};

export const PERMISSION_GROUPS = {
  "Analytics": ["dashboard_view", "analytics_view"],
  "Posts & content": ["posts_view", "posts_edit"],
  "Automations": ["automations_view", "automations_edit"],
  "Tasks & calendar": ["tasks_view", "tasks_edit", "calendar_view"],
  "Brand deals": ["brand_deals_view", "brand_deals_edit"],
  "AI & media": ["ai_insights_view", "media_vault_view", "media_vault_edit"],
  "Team & settings": ["team_view", "team_edit", "settings_view", "settings_edit"],
};

export const ROLE_DEFAULTS = {
  admin: PERMISSIONS,
  editor: [
    "dashboard_view", "analytics_view",
    "posts_view", "posts_edit",
    "tasks_view", "tasks_edit",
    "calendar_view",
    "automations_view", "automations_edit",
    "brand_deals_view", "brand_deals_edit",
    "ai_insights_view",
    "media_vault_view", "media_vault_edit",
  ],
  scheduler: ["posts_view", "posts_edit", "tasks_view", "tasks_edit"],
  analyst: ["analytics_view", "posts_view", "tasks_view", "brand_deals_view"],
  viewer: ["dashboard_view", "posts_view"],
};

export const ROLE_INFO = {
  admin: { label: "Admin", desc: "Full access, same as owner except cannot delete workspace or transfer ownership.", color: "bg-brand/20 text-brand border-brand/40" },
  editor: { label: "Editor", desc: "Create posts, automations, manage tasks. Cannot manage team or billing.", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  scheduler: { label: "Scheduler", desc: "Schedule and publish posts only. No automations or analytics.", color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  analyst: { label: "Analyst", desc: "Read-only access to analytics and reports. Cannot post or edit anything.", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  viewer: { label: "Viewer", desc: "Dashboard and posts view only. No editing access at all.", color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" },
};

export function has(user, perm) {
  if (!user) return false;
  if (user.role === "owner") return true;
  return (user.permissions || []).includes(perm);
}

export function canSee(user, nav) {
  return nav.permission ? has(user, nav.permission) : true;
}
