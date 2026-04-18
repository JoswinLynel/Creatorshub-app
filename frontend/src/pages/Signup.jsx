import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/store";
import { api, handleApiError } from "@/lib/api";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0); // 0: account, 1: connect, 2: workspace, 3: invite
  const [form, setForm] = useState({ name: "", email: "", password: "", workspace_name: "", timezone: "UTC", currency: "USD" });
  const [connected, setConnected] = useState({ instagram: false, linkedin: false });
  const [loading, setLoading] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setLoading(true);
    try {
      await signup(form.name, form.email.trim(), form.password, form.workspace_name || `${form.name}'s Workspace`);
      setStep(1);
    } catch (e) {
      handleApiError(e, "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const connect = async (plat) => {
    try {
      await api.post(`/connections/${plat}/connect`);
      setConnected(c => ({ ...c, [plat]: true }));
      toast.success(`${plat === "instagram" ? "Instagram" : "LinkedIn"} connected`);
    } catch (e) { handleApiError(e); }
  };

  const saveWorkspace = async () => {
    try {
      await api.put("/workspace", { name: form.workspace_name, timezone: form.timezone, currency: form.currency });
      setStep(3);
    } catch (e) { handleApiError(e); }
  };

  const finish = () => { toast.success("Workspace ready!"); nav("/"); };

  return (
    <div className="min-h-screen flex bg-surface">
      <div className="hidden lg:flex w-[44%] relative overflow-hidden border-r border-edge">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(900px 500px at 20% 10%, rgba(124,58,237,0.28), transparent 60%), radial-gradient(700px 400px at 80% 80%, rgba(193,53,132,0.18), transparent 60%), #0f0f0f",
        }} />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#C13584)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-medium">CreatorHub</span>
          </div>
          <div>
            <div className="text-xs text-ink-tertiary uppercase tracking-wider mb-2">Step {Math.min(step + 1, 4)} of 4</div>
            <h1 className="text-4xl font-display font-medium leading-tight">
              {step === 0 && "Create your workspace"}
              {step === 1 && "Connect your accounts"}
              {step === 2 && "Set up your company"}
              {step === 3 && "Invite your team"}
            </h1>
            <p className="mt-3 text-ink-secondary text-sm max-w-md">
              {step === 0 && "You'll be the owner. You can add team members later."}
              {step === 1 && "We'll pull your posts, audience, and engagement. OAuth is mocked for this demo."}
              {step === 2 && "These settings apply to invoices, analytics, and task scheduling."}
              {step === 3 && "Optional — you can skip and invite later from the Team page."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex gap-1.5 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-surface-tertiary"}`} />
            ))}
          </div>

          {step === 0 && (
            <div data-testid="signup-step-account">
              <h2 className="text-xl font-display font-medium">Owner details</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs text-ink-secondary">Full name</label>
                  <input data-testid="signup-name" value={form.name} onChange={e => setField("name", e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Email</label>
                  <input data-testid="signup-email" type="email" value={form.email} onChange={e => setField("email", e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm" placeholder="you@workspace.com" />
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Password</label>
                  <input data-testid="signup-password" type="password" value={form.password} onChange={e => setField("password", e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm" placeholder="Min 6 characters" />
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Workspace name (optional)</label>
                  <input data-testid="signup-workspace" value={form.workspace_name} onChange={e => setField("workspace_name", e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm" placeholder="Jane Doe Creative" />
                </div>
                <button
                  data-testid="signup-create"
                  onClick={handleCreate}
                  disabled={!form.name || !form.email || form.password.length < 6 || loading}
                  className="w-full bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2.5 rounded-lg transition disabled:opacity-60"
                >
                  {loading ? "Creating…" : "Create workspace"}
                </button>
              </div>
              <div className="mt-5 text-xs text-ink-tertiary">Already have an account? <Link to="/login" className="text-brand hover:underline">Sign in</Link></div>
            </div>
          )}

          {step === 1 && (
            <div data-testid="signup-step-connect">
              <h2 className="text-xl font-display font-medium">Connect platforms</h2>
              <div className="mt-6 space-y-3">
                <button
                  data-testid="connect-instagram"
                  onClick={() => connect("instagram")}
                  className="w-full ch-card flex items-center justify-between p-4 hover:border-edge-hover text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)" }}>
                      <span className="text-white text-sm font-medium">IG</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Instagram</div>
                      <div className="text-xs text-ink-tertiary">Posts, reach, engagement</div>
                    </div>
                  </div>
                  {connected.instagram ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-brand">Connect</span>}
                </button>
                <button
                  data-testid="connect-linkedin"
                  onClick={() => connect("linkedin")}
                  className="w-full ch-card flex items-center justify-between p-4 hover:border-edge-hover text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-li">
                      <span className="text-white text-sm font-medium">Li</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">LinkedIn</div>
                      <div className="text-xs text-ink-tertiary">Impressions, followers, engagement</div>
                    </div>
                  </div>
                  {connected.linkedin ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-brand">Connect</span>}
                </button>
                <div className="flex gap-2 pt-4">
                  <button onClick={() => setStep(2)} className="flex-1 text-sm text-ink-secondary py-2.5">Skip for now</button>
                  <button data-testid="signup-next-workspace" onClick={() => setStep(2)} className="flex-1 bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div data-testid="signup-step-workspace">
              <h2 className="text-xl font-display font-medium">Workspace settings</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs text-ink-secondary">Company / workspace name</label>
                  <input value={form.workspace_name} onChange={e => setField("workspace_name", e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Timezone</label>
                  <select value={form.timezone} onChange={e => setField("timezone", e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm">
                    <option value="UTC">UTC</option>
                    <option value="America/Los_Angeles">America/Los Angeles</option>
                    <option value="America/New_York">America/New York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Currency</label>
                  <select value={form.currency} onChange={e => setField("currency", e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <button data-testid="signup-save-workspace" onClick={saveWorkspace} className="w-full bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2.5 rounded-lg">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div data-testid="signup-step-invite">
              <h2 className="text-xl font-display font-medium">You're all set 🎉</h2>
              <p className="text-sm text-ink-secondary mt-2">You can invite your team from the Team page whenever you're ready.</p>
              <button data-testid="signup-finish" onClick={finish} className="w-full mt-6 bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2.5 rounded-lg">Go to dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
