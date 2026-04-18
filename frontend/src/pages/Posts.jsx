import React, { useEffect, useState } from "react";
import { usePlatform } from "@/lib/store";
import { api, handleApiError } from "@/lib/api";
import { fmtNumber, fmtDate } from "@/lib/format";
import { Search, Download, X, Eye, Heart, MessageCircle, Share2, Bookmark } from "lucide-react";

export default function Posts() {
  const { platform } = usePlatform();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("date");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let m = true;
    setLoading(true);
    api.get(`/analytics/posts`, { params: { platform, type, sort, search, page } })
      .then(({ data }) => { if (m) { setPosts(data.posts); setTotal(data.total); } })
      .catch((e) => handleApiError(e))
      .finally(() => m && setLoading(false));
    return () => { m = false; };
  }, [platform, type, sort, search, page]);

  const openDetail = async (p) => {
    try {
      const { data } = await api.get(`/posts/${p.id}`);
      setDetail(data);
    } catch (e) { handleApiError(e); }
  };

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="posts-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium">Posts</h1>
        <p className="text-sm text-ink-tertiary mt-1">All your {platform === "instagram" ? "Instagram" : "LinkedIn"} posts with full analytics.</p>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-tertiary" />
          <input
            data-testid="posts-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="ch-input w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select data-testid="posts-type" value={type} onChange={(e) => setType(e.target.value)} className="ch-input px-3 py-2 text-sm">
          <option value="all">All types</option>
          <option value="reel">Reels</option>
          <option value="carousel">Carousels</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
          <option value="article">Articles</option>
        </select>
        <select data-testid="posts-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="ch-input px-3 py-2 text-sm">
          <option value="date">Sort: Date</option>
          <option value="views">Sort: Views</option>
          <option value="engagement">Sort: Engagement</option>
          <option value="saves">Sort: Saves</option>
        </select>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-edge hover:border-edge-hover text-xs text-ink-secondary hover:text-ink">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Table */}
      <div className="ch-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-surface-tertiary rounded animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-sm text-ink-secondary">No posts found.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-ink-tertiary border-b border-edge">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Post</th>
                  <th className="text-left px-3 py-3 font-medium">Type</th>
                  <th className="text-left px-3 py-3 font-medium">Date</th>
                  <th className="text-right px-3 py-3 font-medium">Views</th>
                  <th className="text-right px-3 py-3 font-medium">Likes</th>
                  <th className="text-right px-3 py-3 font-medium">Comments</th>
                  <th className="text-right px-3 py-3 font-medium">Saves</th>
                  <th className="text-right px-5 py-3 font-medium">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => openDetail(p)}
                    data-testid={`post-row-${p.id}`}
                    className="border-b border-edge hover:bg-surface-tertiary/40 cursor-pointer transition"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-surface-tertiary flex items-center justify-center text-lg">{p.thumbnail_emoji || "📄"}</div>
                        <div className="truncate max-w-[280px] text-[13px]">{p.title}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-secondary"><span className="px-1.5 py-0.5 bg-surface-tertiary rounded border border-edge text-[10px] uppercase">{p.type}</span></td>
                    <td className="px-3 py-3 text-ink-secondary text-[12px]">{fmtDate(p.published_at)}</td>
                    <td className="px-3 py-3 text-right">{fmtNumber(p.views)}</td>
                    <td className="px-3 py-3 text-right">{fmtNumber(p.likes)}</td>
                    <td className="px-3 py-3 text-right">{fmtNumber(p.comments)}</td>
                    <td className="px-3 py-3 text-right">{fmtNumber(p.saves)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[12px]">{p.engagement_rate}%</span>
                        <div className="w-12 h-1 bg-surface-tertiary rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(p.engagement_rate * 8, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-ink-tertiary">
        <div>{total} posts</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-md border border-edge disabled:opacity-40">Prev</button>
          <span>Page {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={page * 20 >= total} className="px-3 py-1.5 rounded-md border border-edge disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50" data-testid="post-detail-drawer">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-surface-secondary border-l border-edge p-6 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-surface-tertiary flex items-center justify-center text-2xl">{detail.thumbnail_emoji}</div>
                <div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-surface-tertiary rounded border border-edge uppercase">{detail.type}</span>
                  <div className="text-sm mt-1">{fmtDate(detail.published_at)}</div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-md hover:bg-surface-tertiary" data-testid="close-drawer"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="text-lg font-display font-medium mt-4 leading-snug">{detail.title}</h3>
            <p className="text-sm text-ink-secondary mt-2">{detail.caption}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {detail.hashtags?.map(h => <span key={h} className="text-[11px] text-brand">{h}</span>)}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-6 text-center">
              {[
                ["Views", detail.views, Eye],
                ["Likes", detail.likes, Heart],
                ["Comments", detail.comments, MessageCircle],
                ["Saves", detail.saves, Bookmark],
              ].map(([label, val, Icon]) => (
                <div key={label} className="p-2">
                  <Icon className="w-3.5 h-3.5 text-ink-tertiary mx-auto" />
                  <div className="text-sm font-medium mt-1">{fmtNumber(val)}</div>
                  <div className="text-[10px] text-ink-tertiary">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="text-xs text-ink-secondary mb-2">Engagement rate</div>
              <div className="text-2xl font-display font-medium">{detail.engagement_rate}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
