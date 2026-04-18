import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, handleApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { has, ROLE_INFO } from "@/lib/permissions";
import Connections from "@/pages/Connections";
import toast from "react-hot-toast";
import { Save, Check, X, Sparkles, Info, AlertTriangle } from "lucide-react";

const TABS = [
  { key: "general", label: "General" },
  { key: "connections", label: "Connections" },
  { key: "notifications", label: "Notifications" },
  { key: "roles", label: "Team Roles" },
  { key: "ai", label: "AI" },
  { key: "billing", label: "Billing" },
];

/* ---------- GENERAL ---------- */
const GeneralTab = () => {
  const { user } = useAuth();
  const canEdit = has(user, "settings_edit");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then(({ data }) => setForm(data.general)).catch(handleApiError);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings/general", form);
      toast.success("Settings saved");
    } catch (e) { handleApiError(e); } finally { setSaving(false); }
  };

  if (!form) return <div className="h-6 bg-surface-secondary rounded w-40 animate-pulse" />;

  return (
    <div className="ch-card p-6 space-y-4 max-w-2xl">
      <div>
        <label className="text-xs text-ink-secondary">Workspace name</label>
        <input value={form.name || ""} onChange={e => set("name", e.target.value)} className="ch-input w-full mt-1 px-3 py-2 text-sm" disabled={!canEdit} data-testid="settings-workspace-name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-secondary">Currency</label>
          <select value={form.currency || "USD"} onChange={e => set("currency", e.target.value)} className="ch-input w-full mt-1 px-3 py-2 text-sm" disabled={!canEdit}>
            <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-secondary">Date format</label>
          <select value={form.date_format || "MM/DD/YYYY"} onChange={e => set("date_format", e.target.value)} className="ch-input w-full mt-1 px-3 py-2 text-sm" disabled={!canEdit}>
            <option>MM/DD/YYYY</option><option>DD/MM/YYYY</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-ink-secondary">Timezone</label>
        <input value={form.timezone || ""} onChange={e => set("timezone", e.target.value)} className="ch-input w-full mt-1 px-3 py-2 text-sm" disabled={!canEdit} />
      </div>
      <div className="flex items-center justify-between py-2 border-t border-edge pt-4">
        <div>
          <div className="text-sm font-medium">Auto-assign leads (round-robin)</div>
          <div className="text-xs text-ink-tertiary mt-0.5">Automatically assign new leads to team members in rotation.</div>
        </div>
        <button onClick={() => canEdit && set("auto_assign_leads", !form.auto_assign_leads)} data-testid="toggle-auto-assign" disabled={!canEdit} className={`w-9 h-5 rounded-full relative transition shrink-0 ${form.auto_assign_leads ? "bg-brand" : "bg-surface-tertiary"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.auto_assign_leads ? "left-4" : "left-0.5"}`} />
        </button>
      </div>
      {canEdit && (
        <button onClick={save} disabled={saving} data-testid="save-general" className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-60">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </div>
  );
};

/* ---------- NOTIFICATIONS ---------- */
const NOTIFY_ROWS = [
  ["overdue_tasks", "Overdue task alerts", "Push notification when a task is 1 hour overdue"],
  ["weekly_digest", "Weekly digest email", "Summary of your top metrics every Monday at 9am"],
  ["new_deal", "New brand deal enquiry", "When a new deal is added via the intake form"],
  ["post_performance", "Post performance alerts", "When a post reaches 10K views or doubles its average"],
  ["team_activity", "Team member activity", "When a team member completes a task or publishes a post"],
  ["sync_errors", "Sync errors", "If a platform connection fails or data sync errors occur"],
];

const NotificationsTab = () => {
  const { user } = useAuth();
  const canEdit = has(user, "settings_edit");
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then(({ data }) => setPrefs(data.notifications)).catch(handleApiError);
  }, []);

  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings/notifications", prefs);
      toast.success("Preferences saved");
    } catch (e) { handleApiError(e); } finally { setSaving(false); }
  };

  if (!prefs) return <div className="h-6 bg-surface-secondary rounded w-40 animate-pulse" />;

  return (
    <div className="ch-card p-6 max-w-2xl">
      <div className="space-y-1 divide-y divide-edge">
        {NOTIFY_ROWS.map(([key, label, desc]) => (
          <div key={key} className="flex items-center justify-between py-3 first:pt-0">
            <div className="min-w-0 flex-1 pr-3">
              <div className="text-sm font-medium">{label}</div>
              <div className="text-[11px] text-ink-tertiary mt-0.5">{desc}</div>
            </div>
            <button onClick={() => canEdit && set(key, !prefs[key])} data-testid={`notify-${key}`} disabled={!canEdit} className={`w-9 h-5 rounded-full relative transition shrink-0 ${prefs[key] ? "bg-brand" : "bg-surface-tertiary"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${prefs[key] ? "left-4" : "left-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
      {canEdit && (
        <button onClick={save} disabled={saving} data-testid="save-notifications" className="mt-5 bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-60">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save notification preferences"}
        </button>
      )}
    </div>
  );
};

/* ---------- TEAM ROLES ---------- */
const PERM_GROUPS = [
  { label: "Analytics", perms: [
    ["analytics_view", "View analytics & reports"],
    ["export", "Export data (CSV/PDF)"],
  ]},
  { label: "Posts & content", perms: [
    ["posts_view", "View posts"],
    ["posts_create", "Create & publish posts"],
    ["posts_edit", "Edit posts"],
    ["posts_delete", "Delete posts"],
  ]},
  { label: "Automations", perms: [
    ["automations_view", "View automations"],
    ["automations_create", "Create new rules"],
    ["automations_toggle", "Enable/disable rules"],
    ["automations_delete", "Delete rules"],
  ]},
  { label: "Tasks & calendar", perms: [
    ["tasks_view", "View tasks"],
    ["tasks_create", "Create tasks"],
    ["tasks_edit", "Edit & complete tasks"],
  ]},
  { label: "Brand deals", perms: [
    ["deals_view", "View brand deals"],
    ["deals_edit", "Edit & manage deals"],
  ]},
  { label: "Team & settings", perms: [
    ["team_view", "View team members"],
    ["team_edit", "Add/remove members"],
    ["settings_edit", "Edit settings & billing"],
  ]},
];

const ROLE_MATRIX = {
  admin: {
    analytics_view: true, export: true,
    posts_view: true, posts_create: true, posts_edit: true, posts_delete: true,
    automations_view: true, automations_create: true, automations_toggle: true, automations_delete: true,
    tasks_view: true, tasks_create: true, tasks_edit: true,
    deals_view: true, deals_edit: true,
    team_view: true, team_edit: true, settings_edit: true,
  },
  editor: {
    analytics_view: true, export: false,
    posts_view: true, posts_create: true, posts_edit: true, posts_delete: false,
    automations_view: true, automations_create: true, automations_toggle: true, automations_delete: false,
    tasks_view: true, tasks_create: true, tasks_edit: true,
    deals_view: true, deals_edit: false,
    team_view: false, team_edit: false, settings_edit: false,
  },
  analyst: {
    analytics_view: true, export: true,
    posts_view: true, posts_create: false, posts_edit: false, posts_delete: false,
    automations_view: true, automations_create: false, automations_toggle: false, automations_delete: false,
    tasks_view: true, tasks_create: false, tasks_edit: false,
    deals_view: true, deals_edit: false,
    team_view: false, team_edit: false, settings_edit: false,
  },
  scheduler: {
    analytics_view: false, export: false,
    posts_view: true, posts_create: true, posts_edit: true, posts_delete: false,
    automations_view: false, automations_create: false, automations_toggle: false, automations_delete: false,
    tasks_view: true, tasks_create: true, tasks_edit: false,
    deals_view: false, deals_edit: false,
    team_view: false, team_edit: false, settings_edit: false,
  },
  viewer: {
    analytics_view: true, export: false,
    posts_view: true, posts_create: false, posts_edit: false, posts_delete: false,
    automations_view: false, automations_create: false, automations_toggle: false, automations_delete: false,
    tasks_view: false, tasks_create: false, tasks_edit: false,
    deals_view: false, deals_edit: false,
    team_view: false, team_edit: false, settings_edit: false,
  },
};

const RolesTab = () => {
  const [selected, setSelected] = useState("admin");
  const [counts, setCounts] = useState({ admin: 0, editor: 0, analyst: 0, scheduler: 0, viewer: 0 });

  useEffect(() => {
    api.get("/team").then(({ data }) => {
      const c = { admin: 0, editor: 0, analyst: 0, scheduler: 0, viewer: 0 };
      data.members.forEach(m => { if (c[m.role] !== undefined) c[m.role]++; });
      setCounts(c);
    }).catch(() => {});
  }, []);

  const info = ROLE_INFO[selected];
  const matrix = ROLE_MATRIX[selected];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="roles-tab">
      <div className="space-y-2">
        {Object.entries(ROLE_INFO).map(([key, r]) => {
          const active = selected === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              data-testid={`role-card-${key}`}
              className={`w-full text-left p-4 rounded-lg border transition ${active ? "border-brand bg-brand/10" : "border-edge hover:border-edge-hover"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{r.label}</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-ink-secondary">{counts[key] || 0} user{counts[key] === 1 ? "" : "s"}</span>
              </div>
              <div className="text-[11px] text-ink-tertiary mt-1">{r.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-2 ch-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-display font-medium">{info.label} permissions</div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${info.color}`}>{info.label}</span>
            </div>
            <div className="text-xs text-ink-tertiary mt-0.5">{info.desc}</div>
          </div>
          <button
            data-testid="edit-role-btn"
            onClick={() => toast("Custom role editing coming soon", { icon: "✨" })}
            className="text-xs px-3 py-1.5 border border-edge hover:border-edge-hover rounded-md text-ink-secondary"
          >
            Edit role
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {PERM_GROUPS.map(g => (
            <div key={g.label}>
              <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">{g.label}</div>
              <div className="space-y-1.5">
                {g.perms.map(([key, label]) => {
                  const on = !!matrix[key];
                  return (
                    <div key={key} className="flex items-center justify-between py-1 border-b border-edge/50 last:border-none">
                      <span className="text-[13px]">{label}</span>
                      {on
                        ? <Check className="w-4 h-4 text-emerald-400" />
                        : <X className="w-4 h-4 text-red-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- AI ---------- */
const AITab = () => {
  const { user } = useAuth();
  const canEdit = has(user, "settings_edit");
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then(({ data }) => setPrefs(data.ai)).catch(handleApiError);
  }, []);

  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings/ai", prefs);
      toast.success("AI preferences saved");
    } catch (e) { handleApiError(e); } finally { setSaving(false); }
  };

  if (!prefs) return <div className="h-6 bg-surface-secondary rounded w-40 animate-pulse" />;

  const Toggle = ({ value, onChange, testid }) => (
    <button onClick={onChange} disabled={!canEdit} data-testid={testid} className={`w-9 h-5 rounded-full relative transition shrink-0 ${value ? "bg-brand" : "bg-surface-tertiary"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`} />
    </button>
  );

  return (
    <div className="ch-card p-6 max-w-2xl space-y-5">
      <div className="flex items-start justify-between py-1">
        <div>
          <div className="text-sm font-medium">Enable AI insights</div>
          <div className="text-[11px] text-ink-tertiary mt-0.5">Generate weekly AI recommendations based on your analytics.</div>
        </div>
        <Toggle value={prefs.enabled} onChange={() => set("enabled", !prefs.enabled)} testid="ai-toggle-enabled" />
      </div>
      <div className="py-1">
        <label className="text-sm font-medium block">Insight frequency</label>
        <select value={prefs.frequency} onChange={e => set("frequency", e.target.value)} disabled={!canEdit} className="ch-input w-full mt-2 px-3 py-2 text-sm" data-testid="ai-frequency">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="on_demand">On demand</option>
        </select>
      </div>
      <div className="py-1">
        <label className="text-sm font-medium block">AI model</label>
        <div className="mt-2 px-3 py-2 text-sm rounded-lg bg-surface-tertiary border border-edge text-ink-tertiary flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          Claude Sonnet (via Emergent)
        </div>
      </div>
      <div className="flex items-start justify-between py-1">
        <div>
          <div className="text-sm font-medium">Content health score</div>
          <div className="text-[11px] text-ink-tertiary mt-0.5">Calculate and display your content health score.</div>
        </div>
        <Toggle value={prefs.health_score} onChange={() => set("health_score", !prefs.health_score)} testid="ai-toggle-health" />
      </div>
      <div className="flex items-start justify-between py-1">
        <div>
          <div className="text-sm font-medium">Competitor benchmarking</div>
          <div className="text-[11px] text-ink-tertiary mt-0.5">Show how your metrics compare to category averages.</div>
        </div>
        <Toggle value={prefs.competitor_benchmark} onChange={() => set("competitor_benchmark", !prefs.competitor_benchmark)} testid="ai-toggle-benchmark" />
      </div>
      <div className="p-3 rounded-lg border border-brand/20 bg-brand/[0.06] flex items-start gap-2 text-xs text-brand/90">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>AI insights are generated using your real analytics data from connected platforms. The more data you have, the more accurate your recommendations.</span>
      </div>
      {canEdit && (
        <button onClick={save} disabled={saving} data-testid="save-ai" className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-60">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save AI preferences"}
        </button>
      )}
    </div>
  );
};

/* ---------- BILLING ---------- */
const BillingTab = () => {
  const [confirmCancel, setConfirmCancel] = useState(false);

  const proFeatures = [
    "Instagram + LinkedIn analytics",
    "Unlimited AutoDM",
    "Digital product sales (0% fees)",
    "Up to 3 team members",
    "Brand deals CRM",
    "AI insights (unlimited)",
    "Media Vault 50 GB",
  ];
  const bizFeatures = [
    "Everything in Pro",
    "Up to 10 creator accounts",
    "Unlimited team members",
    "White-label reports",
    "Webinar + event hosting",
    "Community hub (Telegram/Discord)",
    "Dedicated account manager",
  ];

  return (
    <div className="space-y-4 max-w-3xl" data-testid="billing-tab">
      <div className="ch-card p-6 border-brand/30 bg-brand/[0.04] relative">
        <div className="absolute top-4 right-4">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand text-white uppercase tracking-wider">Pro</span>
        </div>
        <div className="text-3xl font-display font-medium">Pro</div>
        <div className="text-sm text-ink-secondary mt-1">£29 / month</div>
        <div className="text-xs text-ink-tertiary mt-0.5">Next billing date: May 17, 2026</div>
        <ul className="mt-5 space-y-2">
          {proFeatures.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {f}</li>
          ))}
        </ul>
        <div className="mt-5">
          <button className="px-3 py-1.5 text-xs border border-edge hover:border-edge-hover rounded-md" data-testid="manage-billing">Manage billing</button>
        </div>
      </div>

      <div className="ch-card p-6">
        <div className="flex items-baseline gap-2">
          <div className="text-xl font-display font-medium">Business</div>
          <div className="text-sm text-ink-secondary">· £79 / month</div>
        </div>
        <div className="text-xs text-ink-tertiary mt-0.5">For agencies managing multiple creators.</div>
        <ul className="mt-4 space-y-2">
          {bizFeatures.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {f}</li>
          ))}
        </ul>
        <button
          onClick={() => toast.success("Redirecting to checkout…")}
          data-testid="upgrade-business"
          className="mt-5 bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Upgrade to Business
        </button>
      </div>

      <div className="text-center pt-2">
        <button onClick={() => setConfirmCancel(true)} data-testid="cancel-subscription" className="text-xs text-red-400 hover:text-red-300">Cancel subscription</button>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmCancel(false)}>
          <div className="ch-card bg-surface-secondary p-6 w-[90%] max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-amber-400 mb-2"><AlertTriangle className="w-4 h-4" /><div className="text-xs uppercase tracking-wider">Confirm cancel</div></div>
            <div className="text-lg font-display font-medium">Are you sure you want to cancel?</div>
            <div className="text-sm text-ink-tertiary mt-2">You'll lose access to all Pro features at the end of your billing period.</div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmCancel(false)} className="flex-1 border border-edge hover:border-edge-hover text-sm py-2 rounded-md">Cancel</button>
              <button
                onClick={() => { setConfirmCancel(false); toast.success("Cancellation request submitted. Your Pro access continues until May 17, 2026."); }}
                data-testid="confirm-cancel"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-md"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- MAIN ---------- */
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") || "general";
  const [tab, setTab] = useState(TABS.some(t => t.key === initial) ? initial : "general");

  useEffect(() => {
    const p = params.get("tab");
    if (p && p !== tab && TABS.some(t => t.key === p)) setTab(p);
    // eslint-disable-next-line
  }, [params]);

  const selectTab = (key) => {
    setTab(key);
    setParams({ tab: key }, { replace: true });
  };

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="settings-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium">Settings</h1>
        <p className="text-sm text-ink-tertiary mt-1">Configure your workspace to match your workflow.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-edge overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            data-testid={`settings-tab-${t.key}`}
            className={`px-4 py-2 text-sm border-b-2 transition -mb-[1px] whitespace-nowrap ${tab === t.key ? "border-brand text-white" : "border-transparent text-ink-secondary hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralTab />}
      {tab === "connections" && <div className="-mx-5 md:-mx-8 -mb-5 md:-mb-8"><Connections /></div>}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "roles" && <RolesTab />}
      {tab === "ai" && <AITab />}
      {tab === "billing" && <BillingTab />}
    </div>
  );
}
