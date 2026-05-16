import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Screenshots } from "@/components/screenshots";
import { TIMEFRAMES, SMC_FLAGS, SMC_EXTRA_FIELDS } from "@/lib/smc";
import { useState } from "react";
import { TradeForm } from "@/components/trade-form";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trades/$id")({
  component: TradeDetail,
});

function TradeDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: trade, isLoading } = useQuery({
    queryKey: ["trade", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trades").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!trade) return <div>Not found.</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Edit Trade</h1>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
        <TradeForm existing={trade as never} />
      </div>
    );
  }

  const del = async () => {
    if (!confirm("Delete this trade?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["trades"] });
    router.navigate({ to: "/trades" });
  };

  const tfs = (trade.timeframe_analysis ?? {}) as Record<string, { structure?: string; bias?: string; flags?: Record<string, boolean>; rr_expectation?: string; confidence?: number; notes?: string }>;
  const extras = (trade.smc_extras ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/trades" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Back to trades</Link>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{trade.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span className="font-mono text-foreground">{trade.pair}</span>
            <span>·</span>
            <span>{format(new Date(trade.trade_date), "PPp")}</span>
            <span>·</span>
            <span className="capitalize">{trade.session ?? "—"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4 mr-1" /> Edit</Button>
          <Button variant="ghost" onClick={del} className="text-destructive hover:bg-destructive/10"><Trash2 className="size-4 mr-1" /> Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="PnL" value={Number(trade.pnl ?? 0).toFixed(2)} tone={Number(trade.pnl) >= 0 ? "success" : "destructive"} />
        <Kpi label="RR" value={trade.rr_ratio ?? "—"} />
        <Kpi label="Direction" value={trade.direction} cap />
        <Kpi label="Outcome" value={trade.outcome ?? "—"} cap tone={trade.outcome === "win" ? "success" : trade.outcome === "loss" ? "destructive" : undefined} />
        <Kpi label="Bias" value={trade.bias ?? "—"} cap />
        <Kpi label="Risk %" value={trade.risk_percent ?? "—"} />
        <Kpi label="Entry" value={trade.entry_price ?? "—"} />
        <Kpi label="SL / TP" value={`${trade.stop_loss ?? "—"} / ${trade.take_profit ?? "—"}`} />
      </div>

      {(trade.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {trade.tags?.map((t) => <span key={t} className="text-xs px-2 py-1 rounded-full bg-accent border border-border">{t}</span>)}
        </div>
      )}

      <Screenshots tradeId={id} />

      <div className="glass-card rounded-xl p-5">
        <h3 className="font-semibold mb-4">Multi-timeframe analysis</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {TIMEFRAMES.map(({ key, label }) => {
            const tf = tfs[key];
            if (!tf || (!tf.structure && !tf.bias && !tf.notes && !tf.flags)) return (
              <div key={key} className="p-4 rounded-lg border border-border/60 text-sm text-muted-foreground">
                <div className="font-semibold text-foreground">{label}</div>
                <div className="mt-1">No analysis recorded.</div>
              </div>
            );
            return (
              <div key={key} className="p-4 rounded-lg border border-border/60 bg-accent/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{label}</div>
                  {tf.bias && <span className={`text-xs px-2 py-0.5 rounded capitalize ${tf.bias === "bullish" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{tf.bias}</span>}
                </div>
                {tf.structure && <p className="text-sm text-muted-foreground">{tf.structure}</p>}
                {tf.flags && (
                  <div className="flex flex-wrap gap-1.5">
                    {SMC_FLAGS.filter((f) => tf.flags?.[f.key]).map((f) => (
                      <span key={f.key} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">{f.label}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {tf.rr_expectation && <span>RR: <span className="text-foreground">{tf.rr_expectation}</span></span>}
                  {tf.confidence !== undefined && <span>Conf: <span className="text-foreground">{tf.confidence}/10</span></span>}
                </div>
                {tf.notes && <p className="text-xs text-muted-foreground italic">{tf.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Execution & Result">
          <Row label="Respected analysis" value={trade.respected_analysis ? "Yes" : "No"} />
          <Row label="Execution correct" value={trade.execution_correct ? "Yes" : "No"} />
          <Block label="What happened" text={trade.execution_notes} />
          <Block label="Mistakes" text={trade.mistakes} />
          <Block label="Lessons" text={trade.lessons} />
          <Block label="Improvements" text={trade.improvements} />
          <Block label="Replay notes" text={trade.replay_notes} />
        </Card>

        <Card title="Emotional Journal">
          <Row label="Before" value={trade.emotion_before ?? "—"} />
          <Row label="During" value={trade.emotion_during ?? "—"} />
          <Row label="After" value={trade.emotion_after ?? "—"} />
          <Row label="Fear" value={`${trade.fear_level ?? 0}/10`} />
          <Row label="Confidence" value={`${trade.confidence_level ?? 0}/10`} />
          <Row label="Discipline" value={`${trade.discipline_rating ?? 0}/10`} />
          <Row label="Patience" value={`${trade.patience_rating ?? 0}/10`} />
          <Row label="Revenge / Over / FOMO" value={`${trade.revenge_trading ? "✓" : "—"} / ${trade.overtrading ? "✓" : "—"} / ${trade.fomo ? "✓" : "—"}`} />
          <Block label="Journal notes" text={trade.journal_notes} />
        </Card>
      </div>

      {Object.values(extras).some(Boolean) && (
        <Card title="Smart Money — Advanced">
          <div className="grid md:grid-cols-2 gap-x-6">
            {SMC_EXTRA_FIELDS.filter((k) => extras[k]).map((k) => (
              <Row key={k} label={k.replaceAll("_", " ")} value={extras[k]} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value, tone, cap }: { label: string; value: React.ReactNode; tone?: "success" | "destructive"; cap?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${cap ? "capitalize" : ""} ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="glass-card rounded-xl p-5"><h3 className="font-semibold mb-3">{title}</h3><div className="space-y-2 text-sm">{children}</div></div>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-1.5 border-b border-border/40 last:border-0"><span className="text-muted-foreground capitalize">{label}</span><span className="text-foreground text-right">{value}</span></div>;
}
function Block({ label, text }: { label: string; text: string | null | undefined }) {
  if (!text) return null;
  return <div className="pt-2"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div><p className="text-sm whitespace-pre-wrap">{text}</p></div>;
}
