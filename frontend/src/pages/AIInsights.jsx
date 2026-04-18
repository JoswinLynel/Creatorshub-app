import React, { useEffect, useState } from "react";
import { usePlatform } from "@/lib/store";
import { api, handleApiError } from "@/lib/api";
import { Sparkles, RefreshCw, TrendingUp, Clock, Activity, Share2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const ICONS = { "trending-up": TrendingUp, "clock": Clock, "activity": Activity, "share-2": Share2, "sparkles": Sparkles };

export default function AIInsights() {
  const { platform } = usePlatform();
  const [insights, setInsights] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.get(`/insights?platform=${platform}`), api.get(`/insights/score?platform=${platform}`)]);
      setInsights(a.data.insights);
      setScore(b.data);
    } catch (e) { handleApiError(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [platform]);

  const refresh = () => { setRefreshing(true); load(); };

  const scoreData = score ? [{ v: score.score }, { v: 100 - score.score }] : [];

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="ai-insights-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">AI Insights</h1>
          <p className="text-sm text-ink-tertiary mt-1">Recommendations powered by Claude, tailored to your analytics.</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-edge hover:border-edge-hover" data-testid="refresh-insights">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface-secondary rounded-xl animate-pulse" />) :
            insights.map((ins, i) => {
              const Icon = ICONS[ins.icon] || Sparkles;
              return (
                <div key={i} className="ch-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${ins.color}22`, color: ins.color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ins.title}</div>
                      <div className="text-sm text-ink-secondary mt-1 leading-relaxed">{ins.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="ch-card p-5">
          <div className="text-sm font-medium">Content health score</div>
          {score && (
            <>
              <div className="relative h-48 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={scoreData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} startAngle={90} endAngle={-270} dataKey="v">
                      <Cell fill="#7c3aed" />
                      <Cell fill="rgba(255,255,255,0.06)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-display font-medium">{score.score}</div>
                  <div className="text-xs text-ink-tertiary">{score.label}</div>
                </div>
              </div>
              <div className="space-y-2.5 mt-2">
                {score.breakdown.map(b => (
                  <div key={b.label}>
                    <div className="flex justify-between text-[12px]"><span>{b.label}</span><span className="text-ink-secondary">{b.value}</span></div>
                    <div className="h-1 bg-surface-tertiary rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${b.value}%`, background: b.value >= 80 ? "#22c55e" : b.value >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
