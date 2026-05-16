import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Screenshot = { id: string; url: string; storage_path: string | null; kind: string | null; caption: string | null };

export function Screenshots({ tradeId }: { tradeId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState("before");
  const [preview, setPreview] = useState<Screenshot | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});

  const { data: shots = [] } = useQuery({
    queryKey: ["screenshots", tradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_screenshots").select("*").eq("trade_id", tradeId).order("created_at");
      if (error) throw error;
      return data as Screenshot[];
    },
  });

  useEffect(() => {
    (async () => {
      const paths = shots.map((s) => s.storage_path).filter(Boolean) as string[];
      if (!paths.length) return;
      const { data } = await supabase.storage.from("trade-screenshots").createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      data?.forEach((d, i) => { if (d.signedUrl) map[paths[i]] = d.signedUrl; });
      setSigned(map);
    })();
  }, [shots]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${tradeId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("trade-screenshots").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("trade_screenshots").insert({
          trade_id: tradeId, user_id: user.id, url: path, storage_path: path, kind,
        });
        if (insErr) throw insErr;
      }
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["screenshots", tradeId] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  };

  const remove = async (s: Screenshot) => {
    if (s.storage_path) await supabase.storage.from("trade-screenshots").remove([s.storage_path]);
    await supabase.from("trade_screenshots").delete().eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["screenshots", tradeId] });
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="font-semibold">Screenshots</h3>
        <div className="flex items-center gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="bg-input border border-border rounded-md px-2 py-1 text-sm">
            <option value="before">Before</option>
            <option value="after">After</option>
            <option value="other">Other</option>
          </select>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <Button asChild size="sm" disabled={uploading} className="glow">
              <span><Upload className="size-4 mr-1" /> {uploading ? "Uploading…" : "Upload"}</span>
            </Button>
            <Input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          </label>
        </div>
      </div>

      <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground hover:border-primary/60 hover:bg-accent/20 cursor-pointer transition-colors mb-4">
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        Drop chart screenshots here, or click to browse.
      </label>

      {shots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No screenshots yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {shots.map((s) => {
            const url = s.storage_path ? signed[s.storage_path] : s.url;
            return (
              <div key={s.id} className="group relative rounded-lg overflow-hidden border border-border bg-accent/20">
                {url ? (
                  <img src={url} alt={s.caption ?? "screenshot"} loading="lazy" className="w-full aspect-video object-cover cursor-zoom-in" onClick={() => setPreview({ ...s, url })} />
                ) : (
                  <div className="w-full aspect-video grid place-items-center text-xs text-muted-foreground">Loading…</div>
                )}
                <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-background/70 border border-border capitalize">{s.kind}</div>
                <button onClick={() => remove(s)} className="absolute top-2 right-2 p-1 rounded bg-background/70 border border-border opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur grid place-items-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-md border border-border bg-card"><X className="size-5" /></button>
          <img src={preview.url} alt="" className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
