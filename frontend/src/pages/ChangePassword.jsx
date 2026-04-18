import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/store";
import { Eye, EyeOff, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { handleApiError } from "@/lib/api";

export default function ChangePassword() {
  const { user, updateUserPassword, logout } = useAuth();
  const nav = useNavigate();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  const forced = user.must_change_password;

  const submit = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) return toast.error("Password too short (min 6 chars)");
    if (newPw !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      await updateUserPassword(forced ? "" : currentPw, newPw);
      toast.success("Password updated");
      nav("/");
    } catch (e) {
      handleApiError(e, "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md ch-card p-8" data-testid="change-password-card">
        <div className="flex items-center gap-2 text-brand mb-3">
          <Shield className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Security</span>
        </div>
        <h1 className="text-2xl font-display font-medium">
          {forced ? "Set a new password" : "Change password"}
        </h1>
        <p className="text-sm text-ink-tertiary mt-1.5">
          {forced ? `Welcome, ${user.name.split(" ")[0]}. For security, please choose a new password before continuing.` : "Choose a strong password you haven't used before."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {!forced && (
            <div>
              <label className="text-xs text-ink-secondary">Current password</label>
              <input data-testid="current-password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm" />
            </div>
          )}
          <div>
            <label className="text-xs text-ink-secondary">New password</label>
            <div className="relative mt-1">
              <input data-testid="new-password" type={show ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} className="ch-input w-full px-3 py-2.5 text-sm pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 p-1.5 text-ink-tertiary hover:text-ink">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-secondary">Confirm new password</label>
            <input data-testid="confirm-password" type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} className="ch-input w-full mt-1 px-3 py-2.5 text-sm" />
          </div>
          <button data-testid="submit-new-password" disabled={loading} className="w-full bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2.5 rounded-lg">
            {loading ? "Updating…" : forced ? "Set password & continue" : "Update password"}
          </button>
        </form>
        <button onClick={() => { logout(); nav("/login"); }} className="w-full mt-3 text-xs text-ink-tertiary hover:text-ink py-2">Log out</button>
      </div>
    </div>
  );
}
