import React, { useEffect, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { fmtMoney, initials, avatarColor } from "@/lib/format";
import { Handshake, TrendingUp, DollarSign, Clock } from "lucide-react";

const STAGES = [
  { key: "new_enquiry", label: "New Enquiry" },
  { key: "negotiating", label: "Negotiating" },
  { key: "contract_sent", label: "Contract Sent" },
  { key: "signed", label: "Signed" },
  { key: "completed", label: "Completed" },
];

export default function BrandDeals() {
  const [data, setData] = useState({ deals: [], stats: { pipeline_value: 0, signed_this_month: 0, avg_deal_size: 0, avg_response_time: "—" } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/deals").then(({ data }) => setData(data)).catch(handleApiError).finally(() => setLoading(false));
  }, []);

  const byStage = (key) => data.deals.filter(d => d.stage === key);

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="brand-deals-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium">Brand Deals</h1>
        <p className="text-sm text-ink-tertiary mt-1">All your brand partnerships in one pipeline.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="ch-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary"><DollarSign className="w-3.5 h-3.5" />Pipeline value</div>
          <div className="text-2xl font-display font-medium mt-2">{fmtMoney(data.stats.pipeline_value)}</div>
        </div>
        <div className="ch-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary"><Handshake className="w-3.5 h-3.5" />Signed this month</div>
          <div className="text-2xl font-display font-medium mt-2">{data.stats.signed_this_month}</div>
        </div>
        <div className="ch-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary"><TrendingUp className="w-3.5 h-3.5" />Avg deal size</div>
          <div className="text-2xl font-display font-medium mt-2">{fmtMoney(data.stats.avg_deal_size)}</div>
        </div>
        <div className="ch-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary"><Clock className="w-3.5 h-3.5" />Avg response</div>
          <div className="text-2xl font-display font-medium mt-2">{data.stats.avg_response_time}</div>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map(stage => (
          <div key={stage.key} className="ch-card p-3">
            <div className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-3">{stage.label} <span className="text-ink-tertiary">({byStage(stage.key).length})</span></div>
            <div className="space-y-2">
              {byStage(stage.key).map(d => (
                <div key={d.id} className="p-3 rounded-lg bg-surface-tertiary border border-edge">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs text-white" style={{ background: avatarColor(d.brand_name) }}>
                      {initials(d.brand_name)}
                    </div>
                    <div className="text-sm font-medium truncate flex-1">{d.brand_name}</div>
                  </div>
                  <div className="text-xs text-ink-tertiary mt-2 line-clamp-2">{d.description}</div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm font-medium">{fmtMoney(d.value)}</div>
                    <div className="text-[10px] text-ink-tertiary">{d.deadline}</div>
                  </div>
                </div>
              ))}
              {byStage(stage.key).length === 0 && !loading && <div className="text-[11px] text-ink-tertiary px-2 py-4">No deals</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
