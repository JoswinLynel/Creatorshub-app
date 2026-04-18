import React, { useEffect, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

export default function Settings() {
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

  if (loading || !ws) return <div className="p-8"><div className="h-6 bg-surface-secondary rounded w-40 animate-pulse" /></div>;

  return (
    <div className="p-5 md:p-8 space-y-5 max-w-2xl fade-up" data-testid="settings-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium">Settings</h1>
        <p className="text-sm text-ink-tertiary mt-1">Workspace and general preferences.</p>
      </div>
      <div className="ch-card p-6 space-y-4">
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
    </div>
  );
}
