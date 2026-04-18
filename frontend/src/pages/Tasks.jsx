import React, { useEffect, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { has } from "@/lib/permissions";
import { useAuth } from "@/lib/store";
import { fmtTime, fmtDate } from "@/lib/format";
import { Plus, AlertCircle, Clock, X, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const priorityDot = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-emerald-500" };
const typeColors = {
  "call": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "email": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "post content": "bg-brand/15 text-brand border-brand/30",
  "meeting": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "to-do": "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const TaskRow = ({ t, onToggle, onDelete, canEdit }) => (
  <div className="group flex items-start gap-3 p-2.5 rounded-md hover:bg-surface-tertiary transition" data-testid={`task-row-${t.id}`}>
    <button
      onClick={() => canEdit && onToggle(t)}
      className={`mt-0.5 w-4 h-4 rounded border ${t.status === "completed" ? "bg-brand border-brand" : "border-ink-tertiary hover:border-brand"} flex items-center justify-center shrink-0 transition`}
      data-testid={`task-checkbox-${t.id}`}
    >
      {t.status === "completed" && <CheckCircle className="w-3 h-3 text-white" />}
    </button>
    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${priorityDot[t.priority] || "bg-zinc-500"}`} />
    <div className="flex-1 min-w-0">
      <div className={`text-[13px] ${t.status === "completed" ? "strike-complete" : ""}`}>{t.name}</div>
      <div className="text-[11px] text-ink-tertiary mt-0.5 flex items-center gap-2">
        <span>{fmtDate(t.date)} · {fmtTime(t.time)}</span>
        <span className={`px-1.5 py-0 rounded border text-[10px] uppercase ${typeColors[t.type] || typeColors["to-do"]}`}>{t.type}</span>
        {t.platform && t.platform !== "off-platform" && <span className="text-ink-tertiary">{t.platform}</span>}
      </div>
    </div>
    {canEdit && (
      <button onClick={() => onDelete(t)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-tertiary hover:text-red-400 transition">
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const AddTaskModal = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({ name: "", type: "to-do", priority: "medium", date: new Date().toISOString().slice(0, 10), time: "09:00", platform: "both", notes: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Task name required");
    setSaving(true);
    try {
      const { data } = await api.post("/tasks", form);
      toast.success("Task created + calendar event added");
      onCreated(data);
      onClose();
      setForm({ name: "", type: "to-do", priority: "medium", date: new Date().toISOString().slice(0, 10), time: "09:00", platform: "both", notes: "" });
    } catch (e) { handleApiError(e); } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" data-testid="add-task-modal">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[92%] max-w-md ch-card bg-surface-secondary p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-medium">Add task</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-tertiary"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <input data-testid="task-name" placeholder="Task name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="ch-input w-full px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="ch-input px-3 py-2 text-sm">
              <option value="to-do">To-do</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="post content">Post content</option>
              <option value="meeting">Meeting</option>
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="ch-input px-3 py-2 text-sm">
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" data-testid="task-date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="ch-input px-3 py-2 text-sm" />
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="ch-input px-3 py-2 text-sm" />
          </div>
          <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="ch-input w-full px-3 py-2 text-sm">
            <option value="both">Both platforms</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="off-platform">Off-platform</option>
          </select>
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="ch-input w-full px-3 py-2 text-sm" rows={2} />
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-2 text-sm text-ink-secondary hover:text-ink">Cancel</button>
          <button data-testid="submit-task" onClick={submit} disabled={saving} className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-4 py-2 rounded-md">
            {saving ? "Adding…" : "Add to tasks + calendar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Tasks() {
  const { user } = useAuth();
  const canEdit = has(user, "tasks_edit");
  const [data, setData] = useState({ overdue: [], today: [], upcoming: [], completed: [], stats: { total_this_week: 0, completed: 0, overdue: 0, due_today: 0, completion_rate: 0 } });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/tasks").then(({ data }) => setData(data)).catch(handleApiError).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = async (t) => {
    try {
      await api.put(`/tasks/${t.id}/complete`);
      load();
    } catch (e) { handleApiError(e); }
  };
  const remove = async (t) => {
    if (!confirm(`Delete task "${t.name}"? This also removes its calendar event.`)) return;
    try {
      await api.delete(`/tasks/${t.id}`);
      toast.success("Task deleted");
      load();
    } catch (e) { handleApiError(e); }
  };

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="tasks-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">Tasks</h1>
          <p className="text-sm text-ink-tertiary mt-1">Tasks sync automatically to your calendar.</p>
        </div>
        {canEdit && (
          <button
            data-testid="add-task-button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-brand hover:bg-brand/90 text-white text-sm font-medium px-3 py-2 rounded-md"
          >
            <Plus className="w-3.5 h-3.5" /> Add task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-5">
          {/* Overdue */}
          <div className="ch-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <div className="text-sm font-medium">Overdue</div>
              <span className="text-xs text-ink-tertiary">({data.overdue.length})</span>
            </div>
            {loading ? <div className="space-y-2">{[...Array(2)].map((_,i)=><div key={i} className="h-10 bg-surface-tertiary/50 rounded animate-pulse" />)}</div> :
             data.overdue.length === 0 ? <div className="text-xs text-ink-tertiary">Nothing overdue. Good job ✨</div> :
             <div className="space-y-1">{data.overdue.map(t => <TaskRow key={t.id} t={t} onToggle={toggle} onDelete={remove} canEdit={canEdit} />)}</div>}
          </div>
          {/* Today */}
          <div className="ch-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-ink-secondary" />
              <div className="text-sm font-medium">Today</div>
              <span className="text-xs text-ink-tertiary">({data.today.length})</span>
            </div>
            {data.today.length === 0 ? <div className="text-xs text-ink-tertiary">Nothing due today.</div> :
             <div className="space-y-1">{data.today.map(t => <TaskRow key={t.id} t={t} onToggle={toggle} onDelete={remove} canEdit={canEdit} />)}</div>}
          </div>
          {/* Upcoming */}
          <div className="ch-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="w-4 h-4 text-ink-secondary" />
              <div className="text-sm font-medium">Upcoming</div>
              <span className="text-xs text-ink-tertiary">({data.upcoming.length})</span>
            </div>
            {data.upcoming.length === 0 ? <div className="text-xs text-ink-tertiary">No upcoming tasks.</div> :
             <div className="space-y-1">{data.upcoming.map(t => <TaskRow key={t.id} t={t} onToggle={toggle} onDelete={remove} canEdit={canEdit} />)}</div>}
          </div>
          {/* Completed */}
          {showCompleted && data.completed.length > 0 && (
            <div className="ch-card p-5">
              <div className="text-sm font-medium mb-3 text-ink-tertiary">Completed</div>
              <div className="space-y-1">{data.completed.map(t => <TaskRow key={t.id} t={t} onToggle={toggle} onDelete={remove} canEdit={canEdit} />)}</div>
            </div>
          )}
        </div>

        <div className="ch-card p-5 h-fit sticky top-4">
          <div className="text-sm font-medium mb-3">This week</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface-tertiary rounded-lg"><div className="text-xs text-ink-tertiary">Total</div><div className="text-xl font-medium">{data.stats.total_this_week}</div></div>
            <div className="p-3 bg-surface-tertiary rounded-lg"><div className="text-xs text-ink-tertiary">Completed</div><div className="text-xl font-medium text-emerald-400">{data.stats.completed}</div></div>
            <div className="p-3 bg-surface-tertiary rounded-lg"><div className="text-xs text-ink-tertiary">Overdue</div><div className="text-xl font-medium text-red-400">{data.stats.overdue}</div></div>
            <div className="p-3 bg-surface-tertiary rounded-lg"><div className="text-xs text-ink-tertiary">Due today</div><div className="text-xl font-medium">{data.stats.due_today}</div></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1"><span className="text-ink-secondary">Completion rate</span><span>{data.stats.completion_rate}%</span></div>
            <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400" style={{ width: `${data.stats.completion_rate}%` }} />
            </div>
          </div>
          <button
            data-testid="toggle-completed"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full mt-4 text-xs text-brand hover:underline"
          >{showCompleted ? "Hide" : "View"} completed</button>
        </div>
      </div>

      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
    </div>
  );
}
