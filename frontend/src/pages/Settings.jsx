import React, { useEffect, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import Connections from "@/pages/Connections";

const TABS = [
  { key: "general", label: "General" },
  { key: "connections", label: "Connections" },
  { key: "notifications", label: "Notifications" },
];

function General() {
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/workspace").then(({ data }) => setWs(data)).catch(handleApiError).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      await api.put("/workspace", { name: ws.name, currency: ws.currency, timezone: ws.timezone, date_format: ws.date_format });
      toast.success("Settings saved");
    } catch (e) { handleApiError(e); }
  };

  if (loading || !ws) return <div className="h-6 bg-surface-secondary rounded w-40 animate-pulse" />;

  return (
    <div className="ch-card p-6 space-y-4 max-w-2xl">
      <div>
        <label className="text-xs text-ink-secondary">Workspace name</label>
        <input value={ws.name || ""} onChange={e => setWs({ ...ws, name: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-secondary">Currency</label>
          <select value={ws.currency || "USD"} onChange={e => setWs({ ...ws, currency: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm">
            <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-secondary">Date format</label>
          <select value={ws.date_format || "MM/DD/YYYY"} onChange={e => setWs({ ...ws, date_format: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm">
            <option>MM/DD/YYYY</option><option>DD/MM/YYYY</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-ink-secondary">Timezone</label>
        <input value={ws.timezone || ""} onChange={e => setWs({ ...ws, timezone: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm" />
      </div>
      <button onClick={save} data-testid="save-settings" className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5">
        <Save className="w-3.5 h-3.5" /> Save changes
      </button>
    </div>
  );
}

function Notifications() {
  const [prefs, setPrefs] = useState({
    overdue_tasks: true,
    weekly_digest: true,
    new_deal: true,
    post_performance: false,
    team_activity: false,
  });
  const items = [
    ["overdue_tasks", "Overdue task alerts"],
    ["weekly_digest", "Weekly digest email"],
    ["new_deal", "New brand deal enquiry"],
    ["post_performance", "Post performance alerts"],
    ["team_activity", "Team member activity"],
  ];
  return (
    <div className="ch-card p-6 max-w-2xl">
      <div className="space-y-3">
        {items.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-1.5 border-b border-edge last:border-none">
            <div className="text-sm">{label}</div>
            <button onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))} className={`w-9 h-5 rounded-full relative transition ${prefs[key] ? "bg-brand" : "bg-surface-tertiary"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${prefs[key] ? "left-4" : "left-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState("general");

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="settings-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium">Settings</h1>
        <p className="text-sm text-ink-tertiary mt-1">Workspace, connections, and notification preferences.</p>
      </div>

      <div className="flex items-center border-b border-edge">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`settings-tab-${t.key}`}
            className={`px-4 py-2 text-sm border-b-2 transition -mb-[1px] ${tab === t.key ? "border-brand text-white" : "border-transparent text-ink-secondary hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <General />}
      {tab === "connections" && <div className="-mx-5 md:-mx-8 -mb-5 md:-mb-8"><Connections /></div>}
      {tab === "notifications" && <Notifications />}
    </div>
  );
}
