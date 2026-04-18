import React, { useEffect, useMemo, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { has } from "@/lib/permissions";
import { fmtTime } from "@/lib/format";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const EVENT_COLORS = {
  "call": { bg: "rgba(14,165,233,0.18)", text: "#7dd3fc", border: "rgba(14,165,233,0.35)" },
  "email": { bg: "rgba(34,197,94,0.18)", text: "#86efac", border: "rgba(34,197,94,0.35)" },
  "post content": { bg: "rgba(124,58,237,0.22)", text: "#c4b5fd", border: "rgba(124,58,237,0.4)" },
  "meeting": { bg: "rgba(245,158,11,0.18)", text: "#fcd34d", border: "rgba(245,158,11,0.35)" },
  "overdue": { bg: "rgba(239,68,68,0.18)", text: "#fca5a5", border: "rgba(239,68,68,0.35)" },
  "to-do": { bg: "rgba(113,113,122,0.2)", text: "#d4d4d8", border: "rgba(255,255,255,0.08)" },
};

const monthName = (m) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m];

export default function CalendarPage() {
  const { user } = useAuth();
  const canEdit = has(user, "tasks_edit");
  const today = new Date();
  const [view, setView] = useState({ m: today.getMonth(), y: today.getFullYear() });
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(today.toISOString().slice(0, 10));

  useEffect(() => {
    api.get(`/calendar?month=${view.m + 1}&year=${view.y}`)
      .then(({ data }) => setEvents(data.events))
      .catch(handleApiError);
  }, [view]);

  const firstDay = new Date(view.y, view.m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstDay, daysInMonth]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      map[e.date] = map[e.date] || [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const todayStr = today.toISOString().slice(0, 10);
  const selectedEvents = eventsByDate[selected] || [];

  const changeMonth = (delta) => {
    let m = view.m + delta;
    let y = view.y;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setView({ m, y });
  };

  const eventChip = (ev, size = "sm") => {
    const c = EVENT_COLORS[ev.type] || EVENT_COLORS["to-do"];
    return (
      <div
        className={`truncate rounded border ${size === "sm" ? "text-[9px] px-1 py-0.5" : "text-[11px] px-1.5 py-0.5"}`}
        style={{ background: c.bg, color: c.text, borderColor: c.border }}
      >
        {ev.title}
      </div>
    );
  };

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="calendar-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-display font-medium">{monthName(view.m)} {view.y}</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} data-testid="calendar-prev" className="p-1.5 rounded-md border border-edge hover:border-edge-hover"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setView({ m: today.getMonth(), y: today.getFullYear() })} data-testid="calendar-today" className="px-3 py-1.5 rounded-md border border-edge hover:border-edge-hover text-xs">Today</button>
            <button onClick={() => changeMonth(1)} data-testid="calendar-next" className="p-1.5 rounded-md border border-edge hover:border-edge-hover"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 ch-card p-4">
          <div className="grid grid-cols-7 gap-1 text-[11px] text-ink-tertiary mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="aspect-square" />;
              const dateStr = `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(dateStr)}
                  data-testid={`calendar-day-${dateStr}`}
                  className={`text-left aspect-square p-1.5 rounded-md border transition ${
                    isSelected ? "border-brand" : "border-transparent hover:border-edge-hover"
                  } ${isToday ? "bg-brand/10" : ""}`}
                >
                  <div className={`text-[11px] ${isToday ? "text-brand font-medium" : "text-ink-secondary"}`}>{d}</div>
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.slice(0, 3).map(ev => <div key={ev.id}>{eventChip(ev, "sm")}</div>)}
                    {dayEvents.length > 3 && <div className="text-[9px] text-ink-tertiary">+{dayEvents.length - 3} more</div>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-edge text-[11px] text-ink-secondary">
            {Object.entries(EVENT_COLORS).filter(([k]) => k !== "to-do").map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: c.text }} />
                <span className="capitalize">{k}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today panel */}
        <div className="ch-card p-5 h-fit">
          <div className="text-xs text-ink-tertiary uppercase tracking-wider">{selected === todayStr ? "Today" : "Selected"}</div>
          <div className="text-lg font-display font-medium mt-0.5 mb-4">{new Date(selected).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          {selectedEvents.length === 0 ? (
            <div className="text-xs text-ink-tertiary">Nothing scheduled. {canEdit && "Click a day to add."}</div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(ev => (
                <div key={ev.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-surface-tertiary">
                  <div className="text-[11px] text-ink-tertiary w-14 shrink-0">{fmtTime(ev.time)}</div>
                  <div className="flex-1 min-w-0">{eventChip(ev, "md")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
