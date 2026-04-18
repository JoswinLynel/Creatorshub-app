import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/store";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { handleApiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("jane@creatorhub.io");
  const [pw, setPw] = useState("password123");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email.trim(), pw);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      if (user.must_change_password) nav("/change-password");
      else nav("/");
    } catch (err) {
      handleApiError(err, "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-r border-edge">
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
            <h1 className="text-4xl sm:text-5xl font-display font-medium leading-tight tracking-tight">
              The command center for serious creators.
            </h1>
            <p className="mt-4 text-ink-secondary text-sm max-w-md">
              Analytics, tasks, team, and deals — one dark, calm interface built for Instagram and LinkedIn creators.
            </p>
            <div className="mt-8 flex items-center gap-6 text-xs text-ink-tertiary">
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-ig" />Instagram</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-li" />LinkedIn</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand" />AI insights</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#C13584)" }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-medium">CreatorHub</span>
          </div>
          <h2 className="text-2xl font-display font-medium">Welcome back</h2>
          <p className="text-ink-tertiary text-sm mt-1">Sign in to your CreatorHub workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <label className="text-xs text-ink-secondary">Email</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="ch-input w-full mt-1 px-3 py-2.5 text-sm"
                placeholder="you@workspace.com"
              />
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Password</label>
              <div className="relative mt-1">
                <input
                  data-testid="login-password"
                  type={show ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  className="ch-input w-full px-3 py-2.5 text-sm pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-2 p-1.5 text-ink-tertiary hover:text-ink"
                  data-testid="login-toggle-password"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              data-testid="login-submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-xs text-ink-tertiary">
            Don't have a workspace? <Link to="/signup" className="text-brand hover:underline">Create one</Link>
          </div>

          <div className="mt-8 p-3 rounded-lg border border-edge bg-surface-secondary/60 text-xs text-ink-secondary">
            <div className="font-medium text-ink mb-1.5">Demo credentials</div>
            <div>Owner — <span className="text-white">jane@creatorhub.io / password123</span></div>
            <div>Team (temp pw) — <span className="text-white">marcus@creatorhub.io / temp1234</span></div>
            <div>Scheduler — <span className="text-white">tom@creatorhub.io / temp1234</span></div>
            <div>Analyst — <span className="text-white">priya@creatorhub.io / temp1234</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
