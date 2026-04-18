import React, { useEffect, useMemo, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { has, ROLE_DEFAULTS, ROLE_INFO, PERMISSION_GROUPS, PERMISSION_LABELS, PERMISSIONS } from "@/lib/permissions";
import { initials, avatarColor, relativeTime } from "@/lib/format";
import toast from "react-hot-toast";
import { Plus, Search, X, Eye, EyeOff, Copy, Check, ArrowRight, AlertTriangle, Users, UserPlus, Activity, Trash2 } from "lucide-react";

// ------------ Add Member Wizard ------------
const passwordStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return ["Weak", "Fair", "Good", "Strong"][Math.max(0, score - 1)] || "Weak";
};

const AddMemberWizard = ({ open, onClose, onCreated, granterPerms, granterRole }) => {
  const isOwner = granterRole === "owner";
  const hasPerm = (p) => isOwner || (granterPerms || []).includes(p);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", job_title: "", temp_password: "", role: "editor" });
  const [show, setShow] = useState(false);
  const [custom, setCustom] = useState({});
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // set defaults when role changes
    const defaults = ROLE_DEFAULTS[form.role] || [];
    const next = {};
    PERMISSIONS.forEach(p => { next[p] = defaults.includes(p); });
    setCustom(next);
  }, [form.role]);

  const reset = () => {
    setStep(0);
    setForm({ name: "", email: "", phone: "", job_title: "", temp_password: "", role: "editor" });
    setCustom({});
    setCreatedCreds(null);
    setShow(false);
  };

  const next = () => setStep(s => Math.min(3, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/team/invite", {
        name: form.name, email: form.email.trim().toLowerCase(),
        phone: form.phone, job_title: form.job_title,
        temp_password: form.temp_password, role: form.role,
        custom_permissions: custom,
      });
      setCreatedCreds({ email: data.email, password: data.temp_password, name: data.name });
      onCreated();
    } catch (e) { handleApiError(e); } finally { setSaving(false); }
  };

  const copyCreds = () => {
    const txt = `CreatorHub credentials for ${createdCreds.name}\nEmail: ${createdCreds.email}\nTemporary password: ${createdCreds.password}\n\nYou'll be prompted to change your password on first login.`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    toast.success("Credentials copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const canNextStep1 = form.name && form.email && form.temp_password.length >= 6;
  const enabledCount = Object.values(custom).filter(Boolean).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="add-member-wizard">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[94%] max-w-lg ch-card bg-surface-secondary p-6 max-h-[90vh] overflow-y-auto">
        {!createdCreds && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-medium">Add team member</h3>
              <button onClick={() => { reset(); onClose(); }} className="p-1.5 rounded hover:bg-surface-tertiary"><X className="w-4 h-4" /></button>
            </div>
            {/* progress */}
            <div className="flex gap-1.5 mb-6">
              {[0, 1, 2, 3].map(i => <div key={i} className={`h-0.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-surface-tertiary"}`} />)}
            </div>

            {step === 0 && (
              <div className="space-y-3" data-testid="wizard-step-1">
                <div className="text-xs text-ink-tertiary uppercase tracking-wider mb-1">Step 1 of 4 · Personal details</div>
                <div>
                  <label className="text-xs text-ink-secondary">Full name *</label>
                  <input data-testid="member-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm" placeholder="Marcus Chen" />
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Email (login email) *</label>
                  <input data-testid="member-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm" placeholder="marcus@workspace.com" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-ink-secondary">Phone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-secondary">Job title</label>
                    <input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} className="ch-input w-full mt-1 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Temporary password *</label>
                  <div className="relative mt-1">
                    <input data-testid="member-temp-password" type={show ? "text" : "password"} value={form.temp_password} onChange={e => setForm({ ...form, temp_password: e.target.value })} className="ch-input w-full px-3 py-2 text-sm pr-10" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1.5 p-1.5 text-ink-tertiary hover:text-ink">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <div className="text-ink-tertiary">They'll be prompted to change on first login.</div>
                    {form.temp_password && <span className={`${passwordStrength(form.temp_password) === "Strong" ? "text-emerald-400" : passwordStrength(form.temp_password) === "Good" ? "text-emerald-300" : passwordStrength(form.temp_password) === "Fair" ? "text-amber-300" : "text-red-400"}`}>{passwordStrength(form.temp_password)}</span>}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3" data-testid="wizard-step-2">
                <div className="text-xs text-ink-tertiary uppercase tracking-wider mb-1">Step 2 of 4 · Assign a role</div>
                <div className="space-y-2">
                  {Object.entries(ROLE_INFO).map(([role, info]) => (
                    <button
                      key={role}
                      data-testid={`role-option-${role}`}
                      onClick={() => setForm({ ...form, role })}
                      className={`w-full text-left p-4 rounded-lg border transition ${form.role === role ? "border-brand bg-brand/10" : "border-edge hover:border-edge-hover"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{info.label}</div>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border ${info.color}`}>{info.label}</div>
                      </div>
                      <div className="text-xs text-ink-tertiary mt-1">{info.desc}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ROLE_DEFAULTS[role].slice(0, 4).map(p => (
                          <span key={p} className="text-[10px] text-ink-secondary bg-surface-tertiary px-1.5 py-0.5 rounded">{p.replace("_", " ")}</span>
                        ))}
                        {ROLE_DEFAULTS[role].length > 4 && <span className="text-[10px] text-ink-tertiary">+{ROLE_DEFAULTS[role].length - 4} more</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div data-testid="wizard-step-3">
                <div className="text-xs text-ink-tertiary uppercase tracking-wider mb-1">Step 3 of 4 · Customise permissions</div>
                <div className="mt-2 p-3 rounded-md border border-amber-500/30 bg-amber-500/10 flex gap-2 text-xs text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Customising overrides the role defaults for this member only.</span>
                </div>
                <div className="mt-4 space-y-4 max-h-80 overflow-y-auto pr-1">
                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                    <div key={group}>
                      <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">{group}</div>
                      <div className="space-y-1.5">
                        {perms.map(p => {
                          const granterHas = hasPerm(p);
                          const on = !!custom[p];
                          return (
                            <div key={p} className="flex items-center justify-between py-1.5">
                              <div className="text-[13px] flex items-center gap-1.5">
                                {PERMISSION_LABELS[p]}
                                {!granterHas && <span title="You don't have this permission." className="text-[10px] text-amber-300/80 border border-amber-500/30 rounded px-1">locked</span>}
                              </div>
                              <button
                                data-testid={`perm-toggle-${p}`}
                                onClick={() => granterHas && setCustom({ ...custom, [p]: !on })}
                                disabled={!granterHas}
                                className={`w-9 h-5 rounded-full transition relative ${on ? "bg-brand" : "bg-surface-tertiary"} ${!granterHas ? "opacity-40 cursor-not-allowed" : ""}`}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div data-testid="wizard-step-4">
                <div className="text-xs text-ink-tertiary uppercase tracking-wider mb-1">Step 4 of 4 · Confirm</div>
                <div className="ch-card p-4 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm text-white" style={{ background: avatarColor(form.email) }}>
                      {initials(form.name)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{form.name}</div>
                      <div className="text-xs text-ink-tertiary">{form.email} · {form.phone || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 text-xs">
                    <span className="text-ink-secondary">Role</span>
                    <span className={`px-1.5 py-0.5 rounded border ${ROLE_INFO[form.role].color}`}>{ROLE_INFO[form.role].label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-ink-secondary">Permissions</span>
                    <span>{enabledCount} of {PERMISSIONS.length} enabled</span>
                  </div>
                </div>
              </div>
            )}

            {/* footer */}
            <div className="flex items-center justify-between mt-5">
              <button onClick={back} disabled={step === 0} className="text-sm text-ink-secondary hover:text-ink disabled:opacity-40">Back</button>
              {step < 3 ? (
                <button
                  data-testid="wizard-next"
                  onClick={next}
                  disabled={step === 0 && !canNextStep1}
                  className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button data-testid="wizard-submit" onClick={submit} disabled={saving} className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md">
                  {saving ? "Adding…" : "Send invite & add member"}
                </button>
              )}
            </div>
          </>
        )}

        {createdCreds && (
          <div data-testid="member-created-success">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-medium text-center">{createdCreds.name} has been added 🎉</h3>
            <p className="text-sm text-ink-tertiary text-center mt-1">In production this would be emailed automatically. Copy the credentials below:</p>
            <div className="mt-5 p-4 rounded-lg bg-surface-tertiary border border-edge">
              <div className="text-xs text-ink-tertiary">Email</div>
              <div className="text-sm font-mono">{createdCreds.email}</div>
              <div className="text-xs text-ink-tertiary mt-3">Temporary password</div>
              <div className="text-sm font-mono">{createdCreds.password}</div>
            </div>
            <div className="flex gap-2 mt-5">
              <button data-testid="copy-credentials" onClick={copyCreds} className="flex-1 bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2 rounded-md flex items-center justify-center gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy credentials"}
              </button>
              <button onClick={() => { reset(); onClose(); }} className="flex-1 border border-edge hover:border-edge-hover text-sm py-2 rounded-md">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ------------ Member Detail Modal ------------
const MemberDetail = ({ member, onClose, onUpdated, onRemoved, granterPerms, granterRole }) => {
  const { user } = useAuth();
  const canEdit = has(user, "team_edit") && member.role !== "owner";
  const isOwnerGranter = granterRole === "owner";
  const hasPerm = (p) => isOwnerGranter || (granterPerms || []).includes(p);
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(member.role);
  const [custom, setCustom] = useState(() => {
    const defaults = ROLE_DEFAULTS[member.role] || [];
    const m = {};
    PERMISSIONS.forEach(p => { m[p] = (member.permissions || []).includes(p) || defaults.includes(p); });
    // apply custom overrides on top
    Object.entries(member.custom_permissions || {}).forEach(([k, v]) => { m[k] = v; });
    return m;
  });
  const [activity, setActivity] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    api.get(`/team/${member.id}/activity`).then(({ data }) => setActivity(data.activity)).catch(() => {});
  }, [member.id]);

  useEffect(() => {
    if (editing) {
      const defaults = ROLE_DEFAULTS[role] || [];
      const m = {};
      PERMISSIONS.forEach(p => { m[p] = defaults.includes(p); });
      setCustom(m);
    }
  }, [role, editing]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/team/${member.id}`, { role, custom_permissions: custom });
      toast.success("Member updated");
      onUpdated();
      onClose();
    } catch (e) { handleApiError(e); } finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await api.delete(`/team/${member.id}`);
      toast.success("Member removed");
      onRemoved();
      onClose();
    } catch (e) { handleApiError(e); }
  };

  const perms = member.permissions || [];
  const roleInfo = ROLE_INFO[member.role] || { label: member.role, color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" };

  return (
    <div className="fixed inset-0 z-50" data-testid="member-detail">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[94%] max-w-xl ch-card bg-surface-secondary p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm text-white" style={{ background: avatarColor(member.email) }}>
              {initials(member.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-display font-medium">{member.name}</div>
                {member.role === "owner" && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-brand/20 text-brand border-brand/40">Owner</span>}
              </div>
              <div className="text-xs text-ink-tertiary">{member.email} · {member.phone || "—"} · Last active {relativeTime(member.last_active)}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-tertiary"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {!editing ? (
            <span className={`text-[11px] px-1.5 py-0.5 rounded border ${roleInfo.color}`}>{roleInfo.label}</span>
          ) : (
            <select value={role} onChange={e => setRole(e.target.value)} className="ch-input px-2 py-1 text-sm" data-testid="member-role-select">
              {Object.keys(ROLE_INFO).map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
            </select>
          )}
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider text-ink-tertiary mb-2">Permissions</div>
          {!editing ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {PERMISSIONS.map(p => (
                <div key={p} className="flex items-center gap-2">
                  {perms.includes(p) ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                  <span className={perms.includes(p) ? "text-ink" : "text-ink-tertiary line-through"}>{PERMISSION_LABELS[p]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {Object.entries(PERMISSION_GROUPS).map(([g, ps]) => (
                <div key={g}>
                  <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-1">{g}</div>
                  {ps.map(p => {
                    const granterHas = hasPerm(p);
                    return (
                      <div key={p} className="flex items-center justify-between py-1 text-sm">
                        <span>{PERMISSION_LABELS[p]}</span>
                        <button onClick={() => granterHas && setCustom({ ...custom, [p]: !custom[p] })} disabled={!granterHas} className={`w-9 h-5 rounded-full relative ${custom[p] ? "bg-brand" : "bg-surface-tertiary"} ${!granterHas ? "opacity-40" : ""}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${custom[p] ? "left-4" : "left-0.5"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {!editing && (
          <div className="mt-5">
            <div className="text-xs uppercase tracking-wider text-ink-tertiary mb-2">Recent activity</div>
            <div className="space-y-2">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-ink-secondary">
                  <Activity className="w-3 h-3 text-ink-tertiary" />
                  <span>{a.action}</span>
                  <span className="ml-auto text-ink-tertiary">{a.at}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {canEdit && (
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-edge">
            {!editing ? (
              <>
                <button
                  data-testid="remove-member-btn"
                  onClick={() => setConfirmRemove(true)}
                  className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove member
                </button>
                <button data-testid="edit-member-btn" onClick={() => setEditing(true)} className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md">
                  Edit role & permissions
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(false)} className="text-sm text-ink-secondary hover:text-ink">Cancel</button>
                <button data-testid="save-member" onClick={save} disabled={saving} className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md">
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            )}
          </div>
        )}

        {confirmRemove && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={() => setConfirmRemove(false)}>
            <div className="ch-card bg-surface-secondary p-6 w-[90%] max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-display font-medium">Remove {member.name}?</div>
              <div className="text-sm text-ink-tertiary mt-2">This will immediately remove their access. This cannot be undone.</div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setConfirmRemove(false)} className="flex-1 border border-edge hover:border-edge-hover text-sm py-2 rounded-md">Cancel</button>
                <button data-testid="confirm-remove" onClick={remove} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-md">Confirm remove</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ------------ Team Page ------------
export default function Team() {
  const { user } = useAuth();
  const canEdit = has(user, "team_edit");
  const [data, setData] = useState({ members: [], invites: [], stats: { total: 0, pending: 0, active_today: 0 } });
  const [granterPerms, setGranterPerms] = useState([]);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => {
    api.get("/team").then(({ data }) => setData(data)).catch(handleApiError);
    api.get("/team/permissions/catalog").then(({ data }) => setGranterPerms(data.granter_permissions)).catch(() => {});
  };
  useEffect(load, []);

  const filtered = useMemo(() =>
    data.members.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.includes(search.toLowerCase()))
  , [data.members, search]);

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="team-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">Team</h1>
          <p className="text-sm text-ink-tertiary mt-1 max-w-xl">Manage who has access and exactly what they can do. Team members log in with the email and password you set.</p>
        </div>
        {canEdit && (
          <button
            data-testid="add-member-button"
            onClick={() => setShowWizard(true)}
            className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add team member
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="ch-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary"><Users className="w-3.5 h-3.5" /> Total members</div>
          <div className="text-2xl font-display font-medium mt-2">{data.stats.total}</div>
        </div>
        <div className="ch-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary"><UserPlus className="w-3.5 h-3.5" /> Pending invites</div>
          <div className="text-2xl font-display font-medium mt-2 text-amber-400">{data.stats.pending}</div>
        </div>
        <div className="ch-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary"><Activity className="w-3.5 h-3.5" /> Active today</div>
          <div className="text-2xl font-display font-medium mt-2 text-emerald-400">{data.stats.active_today}</div>
        </div>
      </div>

      {/* Members */}
      <div className="ch-card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-edge">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-tertiary" />
            <input
              data-testid="team-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
              className="ch-input w-full pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div className="text-xs text-ink-tertiary ml-auto">{filtered.length} members</div>
        </div>
        <div className="divide-y divide-edge">
          {filtered.map(m => {
            const info = m.role === "owner"
              ? { label: "Owner", color: "bg-brand/20 text-brand border-brand/40" }
              : ROLE_INFO[m.role] || { label: m.role, color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" };
            return (
              <div
                key={m.id}
                data-testid={`member-row-${m.id}`}
                onClick={() => setSelected(m)}
                className="flex items-center gap-3 p-4 hover:bg-surface-tertiary/40 transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs text-white shrink-0" style={{ background: avatarColor(m.email) }}>
                  {initials(m.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{m.name}</div>
                    {m.role === "owner" && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-brand/20 text-brand border-brand/40">Owner</span>}
                  </div>
                  <div className="text-xs text-ink-tertiary truncate">{m.email} · {m.phone || ""}</div>
                </div>
                <div className="text-xs text-ink-tertiary hidden sm:block">Last active {relativeTime(m.last_active)}</div>
                <span className={`text-[11px] px-1.5 py-0.5 rounded border ${info.color}`}>{info.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {data.invites.length > 0 && (
        <div className="ch-card p-5">
          <div className="text-sm font-medium mb-3">Pending invites</div>
          <div className="divide-y divide-edge">
            {data.invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs text-white shrink-0" style={{ background: avatarColor(inv.email) }}>
                  {initials(inv.name || inv.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{inv.name || inv.email}</div>
                  <div className="text-xs text-ink-tertiary">{inv.email} · {ROLE_INFO[inv.role]?.label || inv.role}</div>
                </div>
                <span className="text-[11px] px-1.5 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/30">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showWizard && <AddMemberWizard open onClose={() => setShowWizard(false)} onCreated={load} granterPerms={granterPerms} />}
      {selected && <MemberDetail member={selected} onClose={() => setSelected(null)} onUpdated={load} onRemoved={load} granterPerms={granterPerms} />}
    </div>
  );
}
