import React, { useEffect, useState } from "react";
import { useAuth, usePlatform } from "@/lib/store";
import { api, handleApiError } from "@/lib/api";
import { fmtNumber, fmtTime, fmtDate, relativeTime } from "@/lib/format";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { ArrowDownRight, ArrowUpRight, Eye, Users, Heart, Bookmark, TrendingUp, Activity, Lightbulb, Clock, MousePointerClick, MessageCircle, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Link } from "react-router-dom";

const StatCard = ({ label, value, delta, icon: Icon, spark, color = "#7c3aed" }) => (
  <div className="ch-card p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-0.5 text-[11px] ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta)}%
        </div>
      )}
    </div>
    <div className="mt-2 text-2xl font-display font-medium">{typeof value === "string" ? value : fmtNumber(value)}</div>
    {spark && spark.length > 0 && (
      <div className="mt-1 h-8 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { platform, dateRange } = usePlatform();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get(`/dashboard?platform=${platform}&range=${dateRange}`)
      .then(({ data }) => { if (mounted) setData(data); })
      .catch((e) => handleApiError(e, "Failed to load dashboard"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [platform, dateRange]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };
  const barColor = platform === "instagram" ? "#C13584" : "#0A66C2";

  if (loading || !data) {
    return (
      <div className="p-5 md:p-8 space-y-4">
        <div className="h-8 w-64 bg-surface-secondary rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-secondary rounded-xl animate-pulse" />)}
        </div>
        <div className="h-80 bg-surface-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  const { stats, weekly_views, top_post, today_tasks, upcoming_events, connection } = data;

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="dashboard">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium">
          {greeting()}, {user?.name.split(" ")[0]} <span className="inline-block">👋</span>
        </h1>
        <div className="text-sm text-ink-tertiary mt-1 flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${platform === "instagram" ? "bg-ig" : "bg-li"}`} />
            {connection?.account_handle || "Not connected"} · {fmtNumber(connection?.follower_count)} followers
          </span>
          <span>Last sync {relativeTime(connection?.last_synced_at)}</span>
        </div>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total views" value={stats.total_views.value} delta={stats.total_views.delta} icon={Eye} spark={stats.total_views.spark} color={barColor} />
        <StatCard label="Avg views / post" value={stats.avg_views.value} delta={stats.avg_views.delta} icon={Activity} spark={stats.avg_views.spark} color={barColor} />
        <StatCard label="Engagement rate" value={stats.engagement_rate.value + "%"} delta={stats.engagement_rate.delta} icon={TrendingUp} spark={stats.engagement_rate.spark} color="#22c55e" />
        <StatCard label="New followers" value={stats.new_followers.value} delta={stats.new_followers.delta} icon={Users} spark={stats.new_followers.spark} color="#7c3aed" />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Weekly views chart */}
        <div className="ch-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Views by week</div>
              <div className="text-xs text-ink-tertiary mt-0.5">Last 8 weeks · {platform === "instagram" ? "Instagram" : "LinkedIn"}</div>
            </div>
          </div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly_views}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#a1a1aa" }} />
                <Bar dataKey="views" fill={barColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's tasks */}
        <div className="ch-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Today's tasks</div>
            <Link to="/tasks" className="text-xs text-brand hover:underline flex items-center gap-1" data-testid="dashboard-view-tasks">View all <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2 flex-1">
            {today_tasks && today_tasks.length > 0 ? today_tasks.map(t => (
              <div key={t.id} className="flex items-start gap-2.5 p-2 rounded-md hover:bg-surface-tertiary transition">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate">{t.name}</div>
                  <div className="text-[11px] text-ink-tertiary">{fmtTime(t.time)} · {t.type}</div>
                </div>
              </div>
            )) : <div className="text-xs text-ink-tertiary p-2">No tasks due today.</div>}
          </div>
        </div>
      </div>

      {/* Upcoming events + Top post + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Upcoming events */}
        <div className="ch-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" />Upcoming</div>
            <Link to="/calendar" className="text-xs text-brand hover:underline">Open calendar</Link>
          </div>
          <div className="space-y-2">
            {upcoming_events && upcoming_events.length > 0 ? upcoming_events.map(ev => (
              <div key={ev.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface-tertiary">
                <div className="text-[11px] text-ink-tertiary w-14 shrink-0">{fmtDate(ev.date)}</div>
                <div className="text-[13px] truncate flex-1">{ev.title}</div>
                <div className="text-[11px] text-ink-tertiary">{fmtTime(ev.time)}</div>
              </div>
            )) : <div className="text-xs text-ink-tertiary">No upcoming events.</div>}
          </div>
        </div>

        {/* Top post */}
        <div className="ch-card p-5">
          <div className="text-sm font-medium mb-3">Top post this week</div>
          {top_post ? (
            <div>
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-lg bg-surface-tertiary flex items-center justify-center text-2xl shrink-0">{top_post.thumbnail_emoji || "📸"}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] leading-snug line-clamp-2">{top_post.title}</div>
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-surface-tertiary rounded border border-edge text-ink-secondary uppercase">{top_post.type}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                <div><div className="text-sm font-medium">{fmtNumber(top_post.views)}</div><div className="text-[10px] text-ink-tertiary">Views</div></div>
                <div><div className="text-sm font-medium">{fmtNumber(top_post.likes)}</div><div className="text-[10px] text-ink-tertiary">Likes</div></div>
                <div><div className="text-sm font-medium">{fmtNumber(top_post.comments)}</div><div className="text-[10px] text-ink-tertiary">Comments</div></div>
                <div><div className="text-sm font-medium">{fmtNumber(top_post.saves)}</div><div className="text-[10px] text-ink-tertiary">Saves</div></div>
              </div>
            </div>
          ) : <div className="text-xs text-ink-tertiary">No posts yet.</div>}
        </div>

        {/* AI recommendation */}
        <div className="ch-card p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl" style={{ background: "rgba(124,58,237,0.25)" }} />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-brand text-xs mb-2"><Lightbulb className="w-3.5 h-3.5" /> AI recommendation</div>
            <div className="text-sm leading-snug">
              Your Reels are getting <span className="text-white font-medium">2.5× more engagement</span> than your photos this week. Post 3 more short-form videos by Sunday to compound the trend.
            </div>
            <Link to="/ai-insights" className="inline-flex items-center gap-1 text-xs text-brand mt-3 hover:underline">See all insights <ChevronRight className="w-3 h-3" /></Link>
          </div>
        </div>
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Comments" value={stats.comments.value} delta={stats.comments.delta} icon={MessageCircle} spark={stats.comments.spark} color="#C13584" />
        <StatCard label="Saves" value={stats.saves.value} delta={stats.saves.delta} icon={Bookmark} spark={stats.saves.spark} color="#7c3aed" />
        <StatCard label="Profile visits" value={stats.profile_visits.value} delta={stats.profile_visits.delta} icon={Eye} spark={stats.profile_visits.spark} color="#0A66C2" />
        <StatCard label="Link clicks" value={stats.link_clicks.value} delta={stats.link_clicks.delta} icon={MousePointerClick} spark={stats.link_clicks.spark} color="#22c55e" />
      </div>
    </div>
  );
}
