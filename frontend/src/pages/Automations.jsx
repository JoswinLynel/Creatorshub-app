import React, { useEffect, useRef, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { has } from "@/lib/permissions";
import toast from "react-hot-toast";
import { Plus, X, Edit2, MessageCircle, BookOpen, UserPlus, Clock, Mail, Heart, Reply, CheckSquare, AlertCircle, CheckCircle2 } from "lucide-react";

const TRIGGERS = [
  { key: "comment_keyword", label: "Comment keyword", desc: "When someone comments a specific word", icon: MessageCircle, color: "#C13584" },
  { key: "story_reply", label: "Story reply", desc: "When someone replies to your story", icon: BookOpen, color: "#f59e0b" },
  { key: "new_follower", label: "New follower", desc: "When someone follows your account", icon: UserPlus, color: "#22c55e" },
  { key: "time_based", label: "Time-based", desc: "Run on a schedule", icon: Clock, color: "#7c3aed" },
];

const ACTIONS = [
  { key: "send_dm", label: "Send DM", icon: Mail, color: "#7c3aed" },
  { key: "like_comment", label: "Like comment", icon: Heart, color: "#C13584" },
  { key: "reply_comment", label: "Reply to comment", icon: Reply, color: "#0A66C2" },
  { key: "create_task", label: "Create task", icon: CheckSquare, color: "#22c55e" },
];

const VARIABLES = ["{name}", "{link}", "{product}", "{handle}", "{post_title}"];
const SAMPLE = { "{name}": "Sarah", "{link}": "creatorhub.io/jane", "{product}": "Morning Routine Guide", "{handle}": "@janedoe", "{post_title}": "My top 5 reels" };

const platformDot = (p) => p === "instagram" ? "bg-ig" : p === "linkedin" ? "bg-li" : "bg-brand";
const platformLabel = (p) => p === "instagram" ? "Instagram" : p === "linkedin" ? "LinkedIn" : p === "both" ? "Both" : "All";

const AutomationRow = ({ a, onToggle, onEdit }) => (
  <div className="ch-card p-4 flex items-center gap-3" data-testid={`automation-row-${a.id}`}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: a.platform === "instagram" ? "rgba(193,53,132,0.15)" : a.platform === "linkedin" ? "rgba(10,102,194,0.15)" : "rgba(124,58,237,0.15)" }}>
      {a.icon || "⚡"}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium truncate">{a.name}</div>
      <div className="text-[11px] text-ink-tertiary mt-0.5 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${platformDot(a.platform)}`} />
        {platformLabel(a.platform)} · {a.trigger_count || 0} triggers
      </div>
    </div>
    <button onClick={() => onEdit(a)} className="text-xs text-ink-secondary hover:text-ink p-1.5" data-testid={`automation-edit-${a.id}`}>
      <Edit2 className="w-3.5 h-3.5" />
    </button>
    <button
      onClick={() => onToggle(a)}
      data-testid={`automation-toggle-${a.id}`}
      className={`w-9 h-5 rounded-full transition relative ${a.is_active ? "bg-brand" : "bg-surface-tertiary"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${a.is_active ? "left-4" : "left-0.5"}`} />
    </button>
  </div>
);

const NewRuleModal = ({ open, onClose, onCreated, existing }) => {
  const [form, setForm] = useState({
    name: "", platform: "instagram", trigger_type: "comment_keyword", keyword: "",
    action: "send_dm", message_template: "", max_per_day: 50, is_active: true,
    frequency: "daily", time: "09:00", skip_repeat: true,
  });
  const textareaRef = useRef(null);

  useEffect(() => {
    if (existing) setForm({ ...form, ...existing });
    else setForm({ name: "", platform: "instagram", trigger_type: "comment_keyword", keyword: "", action: "send_dm", message_template: "", max_per_day: 50, is_active: true, frequency: "daily", time: "09:00", skip_repeat: true });
    // eslint-disable-next-line
  }, [existing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const insertVar = (v) => {
    const ta = textareaRef.current;
    if (!ta) return set("message_template", (form.message_template || "") + v);
    const start = ta.selectionStart ?? form.message_template.length;
    const end = ta.selectionEnd ?? form.message_template.length;
    const val = form.message_template || "";
    const next = val.slice(0, start) + v + val.slice(end);
    set("message_template", next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length); }, 0);
  };

  const preview = () => {
    let t = form.message_template || "";
    return t.split(/(\{[^}]+\})/g).map((part, i) => {
      if (part.startsWith("{") && part.endsWith("}")) {
        if (SAMPLE[part]) return <span key={i} className="text-brand">{SAMPLE[part]}</span>;
        return <span key={i} className="text-red-400">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const showMessage = ["send_dm", "reply_comment"].includes(form.action);
  const showKeyword = form.trigger_type === "comment_keyword";
  const showSchedule = form.trigger_type === "time_based";
  const charCount = (form.message_template || "").length;
  const charColor = charCount >= 450 ? "text-red-400" : charCount >= 350 ? "text-amber-400" : "text-ink-tertiary";

  const canSave = form.name.trim() && (showKeyword ? form.keyword.trim() : true) && (showMessage ? (form.message_template || "").trim() : true);

  const preview_sentence = `On ${platformLabel(form.platform)}, when ${form.trigger_type === "comment_keyword" ? `someone comments "${form.keyword || '…'}"` : form.trigger_type === "story_reply" ? "someone replies to your story" : form.trigger_type === "new_follower" ? "someone follows you" : `it's ${form.frequency}`}, automatically ${ACTIONS.find(a => a.key === form.action)?.label.toLowerCase() || "…"}${form.name ? ` — Rule: "${form.name}"` : ""}.`;

  const save = async () => {
    try {
      const payload = {
        name: form.name, platform: form.platform, trigger_type: form.trigger_type,
        keyword: showKeyword ? form.keyword : (showSchedule ? `${form.frequency}_${form.time}` : ""),
        action: form.action, message_template: showMessage ? form.message_template : "",
        max_per_day: Number(form.max_per_day) || 50, is_active: form.is_active,
        category: form.trigger_type === "time_based" ? "schedule" : "comment",
        icon: showKeyword ? "💬" : showSchedule ? "⏰" : "⚡",
      };
      if (existing?.id) {
        await api.put(`/automations/${existing.id}`, payload);
        toast.success("Rule updated");
      } else {
        await api.post("/automations", payload);
        toast.success("Rule saved and active");
      }
      onCreated();
      onClose();
    } catch (e) { handleApiError(e); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="new-rule-modal">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[96%] max-w-2xl ch-card bg-surface-secondary p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-display font-medium">{existing ? "Edit rule" : "New automation rule"}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-tertiary"><X className="w-4 h-4" /></button>
        </div>

        {/* Section 1: Platform */}
        <section className="mb-5">
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Platform</div>
          <div className="flex gap-2">
            {[["instagram", "Instagram", "bg-ig"], ["linkedin", "LinkedIn", "bg-li"], ["both", "Both", "bg-brand"]].map(([k, label, dot]) => (
              <button
                key={k}
                onClick={() => set("platform", k)}
                data-testid={`rule-platform-${k}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${form.platform === k ? "border-brand bg-brand/10 text-white" : "border-edge text-ink-secondary hover:border-edge-hover"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Trigger */}
        <section className="mb-5">
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Trigger</div>
          <div className="grid grid-cols-2 gap-2">
            {TRIGGERS.map(t => {
              const Icon = t.icon;
              const active = form.trigger_type === t.key;
              return (
                <button key={t.key} onClick={() => set("trigger_type", t.key)} data-testid={`rule-trigger-${t.key}`}
                  className={`p-3 rounded-lg border text-left transition ${active ? "border-brand bg-brand/10" : "border-edge hover:border-edge-hover"}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: t.color }} />
                    <div className="text-[13px] font-medium">{t.label}</div>
                  </div>
                  <div className="text-[11px] text-ink-tertiary mt-1">{t.desc}</div>
                </button>
              );
            })}
          </div>
          {showKeyword && (
            <div className="mt-3">
              <label className="text-xs text-ink-secondary">Trigger keyword(s)</label>
              <input value={form.keyword} onChange={e => set("keyword", e.target.value)} placeholder='e.g. "link", "price", "collab"' className="ch-input w-full mt-1 px-3 py-2 text-sm" data-testid="rule-keyword" />
              <div className="text-[11px] text-ink-tertiary mt-1">Separate with commas. Not case-sensitive.</div>
            </div>
          )}
          {showSchedule && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select value={form.frequency} onChange={e => set("frequency", e.target.value)} className="ch-input px-3 py-2 text-sm">
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="every_post">Every post</option>
              </select>
              <input type="time" value={form.time} onChange={e => set("time", e.target.value)} className="ch-input px-3 py-2 text-sm" />
            </div>
          )}
        </section>

        {/* Section 3: Action */}
        <section className="mb-5">
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Action</div>
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map(a => {
              const Icon = a.icon;
              const active = form.action === a.key;
              return (
                <button key={a.key} onClick={() => set("action", a.key)} data-testid={`rule-action-${a.key}`}
                  className={`p-3 rounded-lg border text-left transition ${active ? "border-brand bg-brand/10" : "border-edge hover:border-edge-hover"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${a.color}22`, color: a.color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[13px] font-medium">{a.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: Message template (conditional) */}
        {showMessage && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-ink-tertiary">Message template</div>
            </div>
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="text-[11px] text-ink-secondary">Insert variable:</span>
              {VARIABLES.map(v => (
                <button key={v} onClick={() => insertVar(v)} data-testid={`var-${v}`} className="text-[11px] px-2 py-0.5 rounded-full border border-edge hover:border-brand text-brand bg-brand/10">
                  {v}
                </button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={form.message_template}
              onChange={e => set("message_template", e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Write your message here..."
              className="ch-input w-full px-3 py-2 text-sm"
              data-testid="rule-message"
            />
            <div className={`text-[11px] mt-1 ${charColor}`}>{charCount} / 500 characters</div>
            <div className="mt-2 p-3 rounded-lg bg-surface-tertiary border border-edge">
              <div className="text-[11px] text-ink-tertiary uppercase tracking-wider mb-1">Preview with sample data</div>
              <div className="text-sm leading-relaxed break-words">{preview()}</div>
            </div>
          </section>
        )}

        {/* Section 5: Settings */}
        <section className="mb-5">
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Settings</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-secondary">Rule name *</label>
              <input data-testid="rule-name" value={form.name} onChange={e => set("name", e.target.value)} className="ch-input w-full mt-1 px-3 py-2 text-sm" placeholder="e.g. Send promo link when asked" />
            </div>
            <div>
              <label className="text-xs text-ink-secondary">Max triggers per day</label>
              <input type="number" min="1" max="500" value={form.max_per_day} onChange={e => set("max_per_day", e.target.value)} className="ch-input w-full mt-1 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="text-sm">Activate immediately</div>
              <button onClick={() => set("is_active", !form.is_active)} className={`w-9 h-5 rounded-full transition relative ${form.is_active ? "bg-brand" : "bg-surface-tertiary"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.is_active ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-sm">Skip if already messaged</div>
                <div className="text-[11px] text-ink-tertiary">Won't DM same person more than once per 24 hours</div>
              </div>
              <button onClick={() => set("skip_repeat", !form.skip_repeat)} className={`w-9 h-5 rounded-full transition relative shrink-0 ml-3 ${form.skip_repeat ? "bg-brand" : "bg-surface-tertiary"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.skip_repeat ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Live preview */}
        <div className="p-3 rounded-lg border border-brand/30 bg-brand/5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-brand mb-1">Rule preview</div>
          <div className="text-sm">{preview_sentence}</div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm text-ink-secondary hover:text-ink">Cancel</button>
          <button data-testid="rule-save" onClick={save} disabled={!canSave} className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50">
            {existing ? "Update rule" : "Save rule"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Automations() {
  const { user } = useAuth();
  const canEdit = has(user, "automations_edit");
  const [comment, setComment] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState({ open: false, existing: null });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/automations");
      setComment(data.comment);
      setSchedule(data.schedule);
      const { data: l } = await api.get("/automations/logs");
      setLogs(l.logs);
    } catch (e) { handleApiError(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (a) => {
    try {
      await api.put(`/automations/${a.id}/toggle`);
      toast.success(a.is_active ? "Automation disabled" : "Automation enabled");
      load();
    } catch (e) { handleApiError(e); }
  };

  return (
    <div className="p-5 md:p-8 space-y-6 fade-up" data-testid="automations-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">Automations</h1>
          <p className="text-sm text-ink-tertiary mt-1">Smart rules that run 24/7 on your behalf.</p>
        </div>
        {canEdit && (
          <button
            data-testid="new-rule-button"
            onClick={() => setModal({ open: true, existing: null })}
            className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New rule
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Comment automations</div>
          <div className="space-y-2">
            {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-surface-secondary rounded-xl animate-pulse" />) :
              comment.map(a => <AutomationRow key={a.id} a={a} onToggle={toggle} onEdit={() => canEdit && setModal({ open: true, existing: a })} />)}
            {!loading && comment.length === 0 && <div className="text-xs text-ink-tertiary p-4">No comment automations yet.</div>}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Scheduling automations</div>
          <div className="space-y-2">
            {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-surface-secondary rounded-xl animate-pulse" />) :
              schedule.map(a => <AutomationRow key={a.id} a={a} onToggle={toggle} onEdit={() => canEdit && setModal({ open: true, existing: a })} />)}
            {!loading && schedule.length === 0 && <div className="text-xs text-ink-tertiary p-4">No scheduling automations yet.</div>}
          </div>
        </div>
      </div>

      {/* Automation log */}
      <div className="ch-card overflow-hidden">
        <div className="p-5 border-b border-edge">
          <div className="text-sm font-medium">Automation log</div>
          <div className="text-[11px] text-ink-tertiary mt-0.5">Last 10 fires</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-ink-tertiary border-b border-edge">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Rule</th>
                <th className="text-left px-3 py-2.5 font-medium">Triggered by</th>
                <th className="text-left px-3 py-2.5 font-medium">Action taken</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-right px-5 py-2.5 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} className="border-b border-edge last:border-none">
                  <td className="px-5 py-3 text-[13px]">{l.rule_name}</td>
                  <td className="px-3 py-3 text-ink-secondary text-[12px]">{l.triggered_by}</td>
                  <td className="px-3 py-3 text-ink-secondary text-[12px]">{l.action_taken}</td>
                  <td className="px-3 py-3">
                    {l.status === "success" ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Success</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-red-400"><AlertCircle className="w-3 h-3" /> Failed</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-[12px] text-ink-tertiary">{l.minutes_ago}m ago</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-ink-tertiary">No automations have fired yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewRuleModal open={modal.open} existing={modal.existing} onClose={() => setModal({ open: false, existing: null })} onCreated={load} />
    </div>
  );
}
