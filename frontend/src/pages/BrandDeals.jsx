import React, { useEffect, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { has } from "@/lib/permissions";
import { fmtMoney, initials, avatarColor, fmtNumber, fmtDate } from "@/lib/format";
import toast from "react-hot-toast";
import { Handshake, TrendingUp, DollarSign, Clock, Plus, X, FileText, Download, Check, Trash2 } from "lucide-react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import jsPDF from "jspdf";

const STAGES = [
  { key: "new_enquiry", label: "New Enquiry", color: "#a1a1aa" },
  { key: "negotiating", label: "Negotiating", color: "#f59e0b" },
  { key: "contract_sent", label: "Contract Sent", color: "#0A66C2" },
  { key: "signed", label: "Signed", color: "#7c3aed" },
  { key: "completed", label: "Completed", color: "#22c55e" },
];

const DealCard = ({ deal, onOpen, dragging = false }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: dragging ? 0.5 : 1 } : {};
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (transform && (Math.abs(transform.x) > 3 || Math.abs(transform.y) > 3)) return;
        onOpen(deal);
      }}
      data-testid={`deal-card-${deal.id}`}
      className="p-3 rounded-lg bg-surface-tertiary border border-edge hover:border-edge-hover cursor-pointer select-none transition"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] text-white shrink-0" style={{ background: avatarColor(deal.brand_name) }}>
          {initials(deal.brand_name)}
        </div>
        <div className="text-sm font-medium truncate flex-1">{deal.brand_name}</div>
      </div>
      <div className="text-xs text-ink-tertiary mt-2 line-clamp-2">{deal.description}</div>
      <div className="flex items-center justify-between mt-3">
        <div className="text-sm font-medium">{fmtMoney(deal.value)}</div>
        <div className="text-[10px] text-ink-tertiary">{deal.deadline}</div>
      </div>
    </div>
  );
};

const Column = ({ stage, deals, onOpen }) => {
  const { isOver, setNodeRef } = useDroppable({ id: stage.key });
  return (
    <div ref={setNodeRef} className={`ch-card p-3 transition ${isOver ? "border-brand bg-brand/[0.04]" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
          <div className="text-[11px] uppercase tracking-wider text-ink-secondary">{stage.label}</div>
        </div>
        <span className="text-[10px] text-ink-tertiary">{deals.length}</span>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {deals.length === 0
          ? <div className="text-[11px] text-ink-tertiary p-3 text-center border border-dashed border-edge rounded-lg">Drop here</div>
          : deals.map(d => <DealCard key={d.id} deal={d} onOpen={onOpen} />)}
      </div>
    </div>
  );
};

const DetailDrawer = ({ deal, onClose, onUpdated, canEdit, stats, connections }) => {
  const [stage, setStage] = useState(deal?.stage || "new_enquiry");
  const [notes, setNotes] = useState(deal?.notes || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (deal) { setStage(deal.stage); setNotes(deal.notes || ""); } }, [deal]);

  if (!deal) return null;

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/deals/${deal.id}`, { stage, notes });
      toast.success("Deal updated");
      onUpdated();
      onClose();
    } catch (e) { handleApiError(e); } finally { setSaving(false); }
  };
  const markComplete = async () => {
    try { await api.put(`/deals/${deal.id}`, { stage: "completed" }); toast.success("Deal marked complete"); onUpdated(); onClose(); } catch (e) { handleApiError(e); }
  };

  return (
    <div className="fixed inset-0 z-50" data-testid="deal-drawer">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[440px] bg-surface-secondary border-l border-edge overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center text-sm text-white" style={{ background: avatarColor(deal.brand_name) }}>
                {initials(deal.brand_name)}
              </div>
              <div>
                <div className="text-lg font-display font-medium">{deal.brand_name}</div>
                <div className="text-xs text-ink-tertiary">{deal.brand_contact_name} · {deal.brand_email}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-tertiary"><X className="w-4 h-4" /></button>
          </div>

          <div className="mt-5 ch-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-secondary">Value</span>
              <span className="text-lg font-display font-medium">{fmtMoney(deal.value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-secondary">Deadline</span>
              <span className="text-sm">{deal.deadline}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-secondary">Platforms</span>
              <div className="flex gap-1">
                {(deal.platform || []).map(p => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded border border-edge bg-surface-tertiary capitalize">{p}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-ink-secondary">Stage</label>
            <select value={stage} onChange={e => setStage(e.target.value)} disabled={!canEdit} className="ch-input w-full mt-1 px-3 py-2 text-sm" data-testid="drawer-stage">
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div className="mt-4">
            <div className="text-xs text-ink-secondary mb-2">Description</div>
            <div className="text-sm leading-relaxed">{deal.description}</div>
          </div>

          <div className="mt-5">
            <div className="text-xs text-ink-secondary mb-2">Notes timeline</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={!canEdit}
              placeholder="Add a note about this deal…"
              rows={4}
              className="ch-input w-full px-3 py-2 text-sm"
              data-testid="drawer-notes"
            />
          </div>

          {canEdit && (
            <div className="mt-5 flex gap-2">
              <button onClick={markComplete} className="flex-1 border border-edge hover:border-edge-hover text-sm py-2 rounded-md flex items-center justify-center gap-1.5" data-testid="mark-complete">
                <Check className="w-3.5 h-3.5" /> Mark complete
              </button>
              <button onClick={save} disabled={saving} className="flex-1 bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2 rounded-md disabled:opacity-60" data-testid="drawer-save">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function BrandDeals() {
  const { user } = useAuth();
  const canEdit = has(user, "brand_deals_edit");
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({ pipeline_value: 0, signed_this_month: 0, avg_deal_size: 0, avg_response_time: "—" });
  const [selected, setSelected] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [connections, setConnections] = useState([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = async () => {
    try {
      const { data } = await api.get("/deals");
      setDeals(data.deals);
      setStats(data.stats);
    } catch (e) { handleApiError(e); }
    try {
      const { data } = await api.get("/connections");
      setConnections(data);
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const byStage = (key) => deals.filter(d => d.stage === key);
  const activeDeal = deals.find(d => d.id === activeId);

  const onDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || !canEdit) return;
    const deal = deals.find(d => d.id === active.id);
    if (!deal || deal.stage === over.id) return;
    const prevStage = deal.stage;
    setDeals(ds => ds.map(d => d.id === active.id ? { ...d, stage: over.id } : d));
    try {
      await api.put(`/deals/${active.id}`, { stage: over.id });
      toast.success(`Moved to ${STAGES.find(s => s.key === over.id)?.label}`);
    } catch (e) {
      handleApiError(e);
      setDeals(ds => ds.map(d => d.id === active.id ? { ...d, stage: prevStage } : d));
    }
  };

  const exportMediaKit = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    let y = 60;
    // Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, W, 6, "F");
    doc.setTextColor(15, 15, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("Media Kit", 40, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(113, 113, 122);
    y += 18;
    doc.text(`${user?.name || "Creator"} · Generated ${new Date().toLocaleDateString()}`, 40, y);

    // Platform stats
    y += 40;
    doc.setTextColor(15, 15, 15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Audience", 40, y);
    y += 8;
    doc.setDrawColor(200);
    doc.line(40, y, W - 40, y);
    y += 20;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    connections.forEach(c => {
      if (c.status !== "connected") return;
      const label = c.platform === "instagram" ? "Instagram" : "LinkedIn";
      doc.setFont("helvetica", "bold");
      doc.text(`${label}`, 40, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${c.account_handle}  ·  ${fmtNumber(c.follower_count)} ${c.platform === "instagram" ? "followers" : "connections"}`, 140, y);
      y += 18;
    });

    // Stats block
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Performance snapshot", 40, y);
    y += 8;
    doc.line(40, y, W - 40, y);
    y += 20;
    const snapshotRows = [
      ["Active brand deals", `${deals.length}`],
      ["Pipeline value", fmtMoney(stats.pipeline_value)],
      ["Signed this month", `${stats.signed_this_month}`],
      ["Avg deal size", fmtMoney(stats.avg_deal_size)],
      ["Avg response time", stats.avg_response_time],
    ];
    doc.setFontSize(11);
    snapshotRows.forEach(([k, v]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(113, 113, 122);
      doc.text(k, 40, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 15, 15);
      doc.text(String(v), 260, y);
      y += 18;
    });

    // Footer
    y = doc.internal.pageSize.getHeight() - 40;
    doc.setFontSize(9);
    doc.setTextColor(124, 58, 237);
    doc.text("Prepared with CreatorHub · creatorhub.io", 40, y);

    doc.save(`MediaKit-${(user?.name || "creator").replace(/\s+/g, "-")}.pdf`);
    toast.success("Media kit downloaded");
  };

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="brand-deals-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">Brand Deals</h1>
          <p className="text-sm text-ink-tertiary mt-1">Drag deals across stages. Click to open full details.</p>
        </div>
        <button onClick={exportMediaKit} data-testid="export-media-kit" className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-edge hover:border-edge-hover text-sm">
          <FileText className="w-3.5 h-3.5" /> Export Media Kit (PDF)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="ch-card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-secondary"><DollarSign className="w-3.5 h-3.5" />Pipeline value</div><div className="text-2xl font-display font-medium mt-2">{fmtMoney(stats.pipeline_value)}</div></div>
        <div className="ch-card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-secondary"><Handshake className="w-3.5 h-3.5" />Signed this month</div><div className="text-2xl font-display font-medium mt-2">{stats.signed_this_month}</div></div>
        <div className="ch-card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-secondary"><TrendingUp className="w-3.5 h-3.5" />Avg deal size</div><div className="text-2xl font-display font-medium mt-2">{fmtMoney(stats.avg_deal_size)}</div></div>
        <div className="ch-card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-secondary"><Clock className="w-3.5 h-3.5" />Avg response</div><div className="text-2xl font-display font-medium mt-2">{stats.avg_response_time}</div></div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {STAGES.map(stage => <Column key={stage.key} stage={stage} deals={byStage(stage.key)} onOpen={setSelected} />)}
        </div>
        <DragOverlay>
          {activeDeal ? (
            <div className="p-3 rounded-lg bg-surface-tertiary border border-brand w-64 shadow-lg pointer-events-none">
              <div className="text-sm font-medium">{activeDeal.brand_name}</div>
              <div className="text-sm mt-1">{fmtMoney(activeDeal.value)}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selected && <DetailDrawer deal={selected} onClose={() => setSelected(null)} onUpdated={load} canEdit={canEdit} stats={stats} connections={connections} />}
    </div>
  );
}
