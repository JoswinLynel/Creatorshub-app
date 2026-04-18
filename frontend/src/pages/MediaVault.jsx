import React, { useEffect, useRef, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { has } from "@/lib/permissions";
import { fmtNumber, relativeTime } from "@/lib/format";
import toast from "react-hot-toast";
import { Upload, Trash2, FileText, Film, ImageIcon, Copy, Search, Plus } from "lucide-react";

const bytesToMB = (b) => (b / (1024 * 1024)).toFixed(1);

export default function MediaVault() {
  const { user } = useAuth();
  const canEdit = has(user, "media_vault_edit");
  const [files, setFiles] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [limit, setLimit] = useState(50 * 1024 * 1024 * 1024);
  const [captions, setCaptions] = useState([]);
  const [hashtagSets, setHashtagSets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [captionSearch, setCaptionSearch] = useState("");
  const fileInput = useRef(null);

  const load = async () => {
    try {
      const [m, c, h] = await Promise.all([
        api.get("/media"),
        api.get("/captions"),
        api.get("/hashtags"),
      ]);
      setFiles(m.data.files);
      setTotalBytes(m.data.total_bytes);
      setLimit(m.data.limit_bytes);
      setCaptions(c.data);
      setHashtagSets(h.data);
    } catch (e) { handleApiError(e); }
  };
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    try {
      await api.post("/media/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("File uploaded");
      load();
    } catch (e) { handleApiError(e, "Upload failed"); } finally { setUploading(false); e.target.value = ""; }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this file?")) return;
    try { await api.delete(`/media/${id}`); toast.success("Deleted"); load(); } catch (e) { handleApiError(e); }
  };

  const copyCaption = (text) => { navigator.clipboard.writeText(text); toast.success("Caption copied"); };
  const copyHashtags = (tags) => { navigator.clipboard.writeText(tags.join(" ")); toast.success("Hashtags copied"); };

  const iconFor = (ext) => {
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return <ImageIcon className="w-5 h-5" />;
    if (["mp4", "mov", "webm"].includes(ext)) return <Film className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const filteredCaptions = captions.filter(c => !captionSearch || c.text.toLowerCase().includes(captionSearch.toLowerCase()));
  const usagePct = Math.min(100, (totalBytes / limit) * 100);

  return (
    <div className="p-5 md:p-8 space-y-5 fade-up" data-testid="media-vault-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">Media Vault</h1>
          <p className="text-sm text-ink-tertiary mt-1">Reusable assets, captions, and hashtag sets.</p>
        </div>
        {canEdit && (
          <>
            <input ref={fileInput} type="file" accept="image/*,video/*,application/pdf" onChange={upload} className="hidden" />
            <button onClick={() => fileInput.current?.click()} disabled={uploading} data-testid="upload-button" className="bg-brand hover:bg-brand/90 text-white text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-60">
              <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Upload"}
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ch-card p-5">
          <div className="text-sm font-medium mb-3">Files</div>
          {files.length === 0 ? (
            <div className="text-xs text-ink-tertiary py-10 text-center">No files yet. Click Upload to add your first asset.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {files.map(f => (
                <div key={f.id} className="group relative aspect-square rounded-md bg-surface-tertiary border border-edge overflow-hidden flex flex-col items-center justify-center">
                  <div className="text-ink-secondary">{iconFor(f.file_type)}</div>
                  <div className="absolute bottom-1 left-1 right-1 text-[10px] text-ink-secondary truncate">{f.filename}</div>
                  {canEdit && (
                    <button onClick={() => remove(f.id)} className="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-edge">
            <div className="flex justify-between text-[11px] text-ink-secondary">
              <span>{files.length} files · {bytesToMB(totalBytes)} MB used</span>
              <span>of {bytesToMB(limit)} MB</span>
            </div>
            <div className="h-1 bg-surface-tertiary rounded-full overflow-hidden mt-1">
              <div className="h-full bg-brand rounded-full" style={{ width: `${usagePct}%` }} />
            </div>
          </div>
        </div>

        <div className="ch-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Caption library</div>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-2 text-ink-tertiary" />
              <input value={captionSearch} onChange={e => setCaptionSearch(e.target.value)} placeholder="Search" className="ch-input pl-7 pr-2 py-1 text-xs w-36" />
            </div>
          </div>
          <div className="space-y-2">
            {filteredCaptions.length === 0 ? <div className="text-xs text-ink-tertiary py-6 text-center">No captions yet.</div> :
              filteredCaptions.map(c => (
                <div key={c.id} className="p-3 rounded-md bg-surface-tertiary border border-edge group">
                  <div className="text-[13px] line-clamp-2">{c.text}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-[10px] text-ink-tertiary">
                      <span className="px-1.5 py-0.5 bg-surface-secondary rounded border border-edge uppercase">{c.content_type}</span>
                      <span>Used {c.use_count}×</span>
                      {c.top_engagement && <span className="text-emerald-400">Top engagement</span>}
                    </div>
                    <button onClick={() => copyCaption(c.text)} className="text-xs text-brand hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="ch-card p-5">
        <div className="text-sm font-medium mb-3">Hashtag sets</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {hashtagSets.map(h => (
            <div key={h.id} className="p-4 rounded-lg border border-edge bg-surface-tertiary">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm" style={{ color: h.color }}>{h.name}</div>
                <button onClick={() => copyHashtags(h.hashtags)} className="text-xs text-ink-secondary hover:text-ink"><Copy className="w-3 h-3" /></button>
              </div>
              <div className="text-[11px] text-ink-tertiary mt-2 line-clamp-2">{h.hashtags.join(" ")}</div>
              <div className="text-[10px] text-ink-tertiary mt-2">{h.hashtags.length} tags</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
