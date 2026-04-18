import React, { useEffect, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { has } from "@/lib/permissions";
import { fmtNumber, relativeTime } from "@/lib/format";
import toast from "react-hot-toast";
import { Link2, RefreshCw, Plus, X, AlertTriangle, Instagram as IgIcon, Linkedin as LiIcon } from "lucide-react";

const ConfirmDialog = ({ title, body, confirmLabel = "Confirm", onConfirm, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
    <div className="ch-card bg-surface-secondary p-6 w-[90%] max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="text-lg font-display font-medium">{title}</div>
      <div className="text-sm text-ink-tertiary mt-2">{body}</div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 border border-edge hover:border-edge-hover text-sm py-2 rounded-md">Cancel</button>
        <button onClick={onConfirm} data-testid="confirm-disconnect" className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-md">{confirmLabel}</button>
      </div>
    </div>
  </div>
);

const MockOAuthModal = ({ platform, onCancel, onAuthorize, authorizing }) => {
  const isIg = platform === "instagram";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="ch-card bg-surface-secondary p-6 w-[90%] max-w-md" data-testid="oauth-modal">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isIg ? "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)" : "#0A66C2" }}>
            <span className="text-white text-xs font-medium">{isIg ? "IG" : "Li"}</span>
          </div>
          <div className="text-lg font-display font-medium">Connect {isIg ? "Instagram" : "LinkedIn"}</div>
        </div>
        <p className="text-sm text-ink-secondary mt-4">
          You'll be redirected to {isIg ? "Instagram" : "LinkedIn"} to authorise CreatorHub. We request read-only access to your posts, insights, and profile.
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 border border-edge hover:border-edge-hover text-sm py-2 rounded-md">Cancel</button>
          <button
            onClick={onAuthorize}
            disabled={authorizing}
            data-testid="oauth-authorize"
            className="flex-1 text-white text-sm font-medium py-2 rounded-md disabled:opacity-60"
            style={{ background: isIg ? "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)" : "#0A66C2" }}
          >
            {authorizing ? "Connecting…" : `Authorise with ${isIg ? "Instagram" : "LinkedIn"}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const PlatformCard = ({ connection, platform, onChange }) => {
  const { user } = useAuth();
  const canManage = has(user, "settings_edit");
  const isIg = platform === "instagram";
  const accent = isIg ? "#C13584" : "#0A66C2";
  const [syncing, setSyncing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [oauth, setOauth] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);

  const connected = connection && connection.status === "connected";

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post(`/connections/${platform}/sync`);
      toast.success(`${isIg ? "Instagram" : "LinkedIn"} synced`);
      onChange();
    } catch (e) { handleApiError(e); } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };
  const doDisconnect = async () => {
    try {
      await api.delete(`/connections/${platform}`);
      toast.success(`${isIg ? "Instagram" : "LinkedIn"} disconnected`);
      setConfirm(false);
      onChange();
    } catch (e) { handleApiError(e); }
  };
  const doConnect = async () => {
    setAuthorizing(true);
    await new Promise(r => setTimeout(r, 1400));
    try {
      await api.post(`/connections/${platform}/connect`);
      toast.success(`${isIg ? "Instagram" : "LinkedIn"} connected successfully`);
      setOauth(false);
      onChange();
    } catch (e) { handleApiError(e); } finally { setAuthorizing(false); }
  };

  return (
    <div
      className="ch-card p-5 relative overflow-hidden"
      style={{ borderLeft: `4px solid ${accent}` }}
      data-testid={`connection-card-${platform}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}1a` }}>
          {isIg ? <IgIcon className="w-5 h-5" style={{ color: accent }} /> : <LiIcon className="w-5 h-5" style={{ color: accent }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{isIg ? "Instagram Business" : "LinkedIn"}</div>
          {connected ? (
            <>
              <div className="text-xs text-ink-tertiary mt-0.5 truncate">{connection.account_handle}</div>
              <div className="text-xs text-ink-tertiary mt-0.5">{fmtNumber(connection.follower_count)} {isIg ? "followers" : "connections"}</div>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                <span className="text-emerald-400">Connected</span>
                <span className="text-ink-tertiary">· Last synced {relativeTime(connection.last_synced_at)}</span>
              </div>
              {canManage && (
                <div className="flex gap-2 mt-4">
                  <button onClick={sync} disabled={syncing} data-testid={`sync-${platform}`} className="px-3 py-1.5 text-xs border border-edge hover:border-edge-hover rounded-md flex items-center gap-1.5">
                    <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                  <button onClick={() => setConfirm(true)} data-testid={`disconnect-${platform}`} className="px-3 py-1.5 text-xs border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-md">
                    Disconnect
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs text-ink-tertiary mt-0.5">Not connected</div>
              {canManage && (
                <button
                  onClick={() => setOauth(true)}
                  data-testid={`connect-${platform}`}
                  className="mt-4 px-3 py-1.5 text-xs text-white rounded-md flex items-center gap-1.5"
                  style={{ background: isIg ? "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)" : "#0A66C2" }}
                >
                  {isIg ? <IgIcon className="w-3 h-3" /> : <LiIcon className="w-3 h-3" />}
                  Connect {isIg ? "Instagram" : "LinkedIn"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={`Disconnect ${isIg ? "Instagram" : "LinkedIn"}?`}
          body="All analytics data will stop updating."
          confirmLabel="Disconnect"
          onClose={() => setConfirm(false)}
          onConfirm={doDisconnect}
        />
      )}
      {oauth && (
        <MockOAuthModal platform={platform} authorizing={authorizing} onCancel={() => setOauth(false)} onAuthorize={doConnect} />
      )}
    </div>
  );
};

export default function Connections() {
  const [conns, setConns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/connections");
      setConns(data);
    } catch (e) { handleApiError(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const find = (p) => conns.find(c => c.platform === p);

  const syncAll = async () => {
    setSyncingAll(true);
    try {
      await api.post("/connections/sync-all");
      toast.success("All platforms synced");
      load();
    } catch (e) { handleApiError(e); } finally { setTimeout(() => setSyncingAll(false), 900); }
  };

  const lastFull = conns.length > 0
    ? conns.filter(c => c.last_synced_at).map(c => c.last_synced_at).sort().reverse()[0]
    : null;

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="connections-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium">Connected accounts</h1>
        <p className="text-sm text-ink-tertiary mt-1 max-w-xl">Manage your Instagram and LinkedIn integrations. All data is pulled via official OAuth APIs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? [...Array(2)].map((_, i) => <div key={i} className="h-32 bg-surface-secondary rounded-xl animate-pulse" />) : (
          <>
            <PlatformCard connection={find("instagram")} platform="instagram" onChange={load} />
            <PlatformCard connection={find("linkedin")} platform="linkedin" onChange={load} />
          </>
        )}
      </div>

      <div className="ch-card p-5 border-dashed opacity-70 flex items-center justify-center gap-3 text-sm text-ink-tertiary">
        <Plus className="w-4 h-4" />
        Connect another platform — coming soon: TikTok, YouTube, Twitter/X
      </div>

      <div className="ch-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-medium">Sync status</div>
            <div className="text-xs text-ink-tertiary mt-0.5">Last full sync {lastFull ? relativeTime(lastFull) : "—"}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-secondary">Auto-sync every 5 min</span>
              <button onClick={() => setAutoSync(!autoSync)} data-testid="auto-sync-toggle" className={`w-9 h-5 rounded-full relative transition ${autoSync ? "bg-brand" : "bg-surface-tertiary"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${autoSync ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <button onClick={syncAll} disabled={syncingAll} data-testid="sync-all" className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-60">
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin" : ""}`} />
              {syncingAll ? "Syncing…" : "Sync all now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
