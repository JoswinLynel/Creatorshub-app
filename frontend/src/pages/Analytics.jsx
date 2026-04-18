import React, { useEffect, useState } from "react";
import { usePlatform } from "@/lib/store";
import { api, handleApiError } from "@/lib/api";
import { fmtNumber } from "@/lib/format";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, Eye, Users, MousePointerClick } from "lucide-react";

const COLORS = ["#7c3aed", "#C13584", "#0A66C2", "#22c55e", "#f59e0b"];

const Stat = ({ label, value, delta, icon: Icon }) => (
  <div className="ch-card p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      {delta !== undefined && (
        <span className={`text-[11px] ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta >= 0 ? "+" : ""}{delta}%
        </span>
      )}
    </div>
    <div className="text-2xl font-display font-medium mt-2">{fmtNumber(value)}</div>
  </div>
);

export default function Analytics() {
  const { platform, dateRange } = usePlatform();
  const [stats, setStats] = useState(null);
  const [audience, setAudience] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    setLoading(true);
    Promise.all([
      api.get(`/analytics?platform=${platform}&range=${dateRange}`),
      api.get(`/analytics/audience?platform=${platform}`),
    ])
      .then(([a, b]) => { if (m) { setStats(a.data); setAudience(b.data); } })
      .catch((e) => handleApiError(e))
      .finally(() => m && setLoading(false));
    return () => { m = false; };
  }, [platform, dateRange]);

  const barColor = platform === "instagram" ? "#C13584" : "#0A66C2";

  if (loading || !stats || !audience) {
    return (
      <div className="p-5 md:p-8 space-y-4">
        <div className="h-8 w-48 bg-surface-secondary rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-surface-secondary rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  const ageGenderData = audience.age_gender.flatMap(a => [
    { name: `${a.age} F`, value: a.female, fill: "#C13584" },
    { name: `${a.age} M`, value: a.male, fill: "#0A66C2" },
  ]);

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">Analytics</h1>
          <p className="text-sm text-ink-tertiary mt-1">Deep performance breakdown for {platform === "instagram" ? "Instagram" : "LinkedIn"}.</p>
        </div>
        <button data-testid="export-csv" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-edge hover:border-edge-hover text-xs text-ink-secondary hover:text-ink">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Reach" value={stats.stats.reach.value} delta={stats.stats.reach.delta} icon={Eye} />
        <Stat label="Impressions" value={stats.stats.impressions.value} delta={stats.stats.impressions.delta} icon={TrendingUp} />
        <Stat label="Profile visits" value={stats.stats.profile_visits.value} delta={stats.stats.profile_visits.delta} icon={Users} />
        <Stat label="Link clicks" value={stats.stats.link_clicks.value} delta={stats.stats.link_clicks.delta} icon={MousePointerClick} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ch-card p-5 lg:col-span-2">
          <div className="text-sm font-medium">Weekly views</div>
          <div className="text-xs text-ink-tertiary mt-0.5">Last 8 weeks</div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekly_views}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="views" fill={barColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ch-card p-5">
          <div className="text-sm font-medium">Best posting times</div>
          <div className="space-y-2.5 mt-4">
            {audience.best_times.map((t, i) => (
              <div key={t.slot} className="p-3 rounded-lg border border-edge" style={{ background: `rgba(124,58,237,${0.18 - i * 0.05})` }}>
                <div className="text-[13px] font-medium">{t.slot}</div>
                <div className="text-[11px] text-ink-tertiary mt-0.5">Engagement score {t.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content type + Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ch-card p-5">
          <div className="text-sm font-medium mb-4">Content type performance</div>
          <div className="space-y-3">
            {audience.content_perf.map(c => (
              <div key={c.type}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span>{c.type}</span>
                  <span className="text-ink-secondary">{c.engagement}%</span>
                </div>
                <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(c.engagement * 8, 100)}%`, background: "linear-gradient(90deg, #7c3aed, #C13584)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ch-card p-5">
          <div className="text-sm font-medium mb-4">Top countries</div>
          <div className="space-y-2.5">
            {audience.countries.map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-base">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="truncate">{c.name}</span>
                    <span className="text-ink-secondary">{c.pct}%</span>
                  </div>
                  <div className="h-1 bg-surface-tertiary rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Follower growth + Age/gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ch-card p-5">
          <div className="text-sm font-medium mb-3">Follower growth (30d)</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.follower_growth.slice(-30)}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="followers" stroke={barColor} strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ch-card p-5">
          <div className="text-sm font-medium mb-3">Audience age / gender</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ageGenderData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                  {ageGenderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-ink-secondary">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ig" /> Female</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-li" /> Male</div>
          </div>
        </div>
      </div>
    </div>
  );
}
