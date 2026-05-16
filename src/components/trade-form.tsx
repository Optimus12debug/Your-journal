import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { TIMEFRAMES, SMC_FLAGS, type TimeframeAnalysis, type TimeframeKey, SMC_EXTRA_FIELDS } from "@/lib/smc";
import { toast } from "sonner";

type TradeRow = {
  id?: string;
  title: string;
  pair: string;
  trade_date: string;
  session: string | null;
  direction: string;
  bias: string | null;
  risk_percent: number | null;
  position_size: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  rr_ratio: number | null;
  pnl: number | null;
  outcome: string | null;
  tags: string[] | null;
  execution_notes: string | null;
  respected_analysis: boolean | null;
  execution_correct: boolean | null;
  mistakes: string | null;
  lessons: string | null;
  improvements: string | null;
  replay_notes: string | null;
  emotion_before: string | null;
  emotion_during: string | null;
  emotion_after: string | null;
  fear_level: number | null;
  confidence_level: number | null;
  discipline_rating: number | null;
  patience_rating: number | null;
  revenge_trading: boolean | null;
  overtrading: boolean | null;
  fomo: boolean | null;
  journal_notes: string | null;
  timeframe_analysis: Record<string, TimeframeAnalysis>;
  smc_extras: Record<string, string>;
};

const empty: TradeRow = {
  title: "",
  pair: "",
  trade_date: new Date().toISOString().slice(0, 16),
  session: "London",
  direction: "buy",
  bias: "bullish",
  risk_percent: 1,
  position_size: null,
  entry_price: null,
  stop_loss: null,
  take_profit: null,
  rr_ratio: null,
  pnl: 0,
  outcome: "win",
  tags: [],
  execution_notes: "",
  respected_analysis: true,
  execution_correct: true,
  mistakes: "",
  lessons: "",
  improvements: "",
  replay_notes: "",
  emotion_before: "",
  emotion_during: "",
  emotion_after: "",
  fear_level: 3,
  confidence_level: 7,
  discipline_rating: 7,
  patience_rating: 7,
  revenge_trading: false,
  overtrading: false,
  fomo: false,
  journal_notes: "",
  timeframe_analysis: {},
  smc_extras: {},
};

export function TradeForm({ existing }: { existing?: Partial<TradeRow> & { id?: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [t, setT] = useState<TradeRow>({ ...empty, ...(existing as TradeRow) });
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing) setT((prev) => ({ ...prev, ...(existing as TradeRow) }));
  }, [existing]);

  const set = <K extends keyof TradeRow>(k: K, v: TradeRow[K]) => setT((p) => ({ ...p, [k]: v }));
  const setTf = (tf: TimeframeKey, patch: Partial<TimeframeAnalysis>) =>
    setT((p) => ({ ...p, timeframe_analysis: { ...p.timeframe_analysis, [tf]: { ...p.timeframe_analysis[tf], ...patch } } }));

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!(t.tags ?? []).includes(v)) set("tags", [...(t.tags ?? []), v]);
    setTagInput("");
  };

  const save = async () => {
    if (!user) return;
    if (!t.title || !t.pair) { toast.error("Title and pair are required"); return; }
    setBusy(true);
    try {
      const payload = {
        ...t,
        user_id: user.id,
        trade_date: new Date(t.trade_date).toISOString(),
        risk_percent: numOrNull(t.risk_percent),
        position_size: numOrNull(t.position_size),
        entry_price: numOrNull(t.entry_price),
        stop_loss: numOrNull(t.stop_loss),
        take_profit: numOrNull(t.take_profit),
        rr_ratio: numOrNull(t.rr_ratio),
        pnl: numOrNull(t.pnl) ?? 0,
      };
      if (existing?.id) {
        const { error } = await supabase.from("trades").update(payload).eq("id", existing.id);
        if (error) throw error;
        toast.success("Trade updated");
        router.navigate({ to: "/trades/$id", params: { id: existing.id } });
      } else {
        const { data, error } = await supabase.from("trades").insert(payload).select().single();
        if (error) throw error;
        toast.success("Trade created");
        router.navigate({ to: "/trades/$id", params: { id: data.id } });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section title="General details">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Trade title">
            <Input value={t.title} onChange={(e) => set("title", e.target.value)} placeholder="EU London Liquidity Sweep" />
          </Field>
          <Field label="Pair / Instrument">
            <Input value={t.pair} onChange={(e) => set("pair", e.target.value)} placeholder="EURUSD" />
          </Field>
          <Field label="Date & time">
            <Input type="datetime-local" value={t.trade_date.slice(0, 16)} onChange={(e) => set("trade_date", e.target.value)} />
          </Field>
          <Field label="Session">
            <SelectBox value={t.session ?? ""} onValueChange={(v) => set("session", v)} options={["London", "New York", "Asia"]} />
          </Field>
          <Field label="Direction">
            <SelectBox value={t.direction} onValueChange={(v) => set("direction", v)} options={["buy", "sell"]} />
          </Field>
          <Field label="Bias">
            <SelectBox value={t.bias ?? ""} onValueChange={(v) => set("bias", v)} options={["bullish", "bearish"]} />
          </Field>
          <Field label="Risk %"><NumInput value={t.risk_percent} onChange={(v) => set("risk_percent", v)} /></Field>
          <Field label="Position size"><NumInput value={t.position_size} onChange={(v) => set("position_size", v)} /></Field>
          <Field label="Entry price"><NumInput value={t.entry_price} onChange={(v) => set("entry_price", v)} /></Field>
          <Field label="Stop loss"><NumInput value={t.stop_loss} onChange={(v) => set("stop_loss", v)} /></Field>
          <Field label="Take profit"><NumInput value={t.take_profit} onChange={(v) => set("take_profit", v)} /></Field>
          <Field label="RR ratio"><NumInput value={t.rr_ratio} onChange={(v) => set("rr_ratio", v)} /></Field>
          <Field label="Final PnL"><NumInput value={t.pnl} onChange={(v) => set("pnl", v)} /></Field>
          <Field label="Outcome">
            <SelectBox value={t.outcome ?? ""} onValueChange={(v) => set("outcome", v)} options={["win", "loss", "breakeven"]} />
          </Field>
          <Field label="Tags" className="md:col-span-2">
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag and press Enter" />
              <Button type="button" variant="secondary" onClick={addTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(t.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-accent border border-border">
                  {tag}
                  <button className="ml-2 text-muted-foreground hover:text-destructive" onClick={() => set("tags", (t.tags ?? []).filter((x) => x !== tag))}>×</button>
                </span>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Multi-timeframe analysis">
        <Accordion type="multiple" defaultValue={["daily"]} className="w-full">
          {TIMEFRAMES.map(({ key, label }) => {
            const tf = t.timeframe_analysis[key] ?? {};
            return (
              <AccordionItem key={key} value={key} className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-3">
                    <span className="text-primary font-semibold">{label}</span>
                    {tf.bias && <span className={`text-xs px-2 py-0.5 rounded ${tf.bias === "bullish" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"} capitalize`}>{tf.bias}</span>}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <Field label="Market structure">
                    <Textarea rows={3} value={tf.structure ?? ""} onChange={(e) => setTf(key, { structure: e.target.value })} placeholder={`Describe ${label} structure…`} />
                  </Field>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Bias">
                      <SelectBox value={tf.bias ?? ""} onValueChange={(v) => setTf(key, { bias: v as "bullish" | "bearish" })} options={["bullish", "bearish"]} />
                    </Field>
                    <Field label="RR expectation">
                      <Input value={tf.rr_expectation ?? ""} onChange={(e) => setTf(key, { rr_expectation: e.target.value })} placeholder="e.g. 1:5" />
                    </Field>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">SMC flags</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {SMC_FLAGS.map((f) => (
                        <label key={f.key} className="flex items-center gap-2 text-sm p-2 rounded-md border border-border hover:bg-accent/40 cursor-pointer">
                          <Checkbox checked={!!tf.flags?.[f.key]} onCheckedChange={(c) => setTf(key, { flags: { ...tf.flags, [f.key]: !!c } })} />
                          {f.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Field label={`Confidence: ${tf.confidence ?? 5}`}>
                    <Slider min={0} max={10} step={1} value={[tf.confidence ?? 5]} onValueChange={([v]) => setTf(key, { confidence: v })} />
                  </Field>
                  <Field label="Notes">
                    <Textarea rows={2} value={tf.notes ?? ""} onChange={(e) => setTf(key, { notes: e.target.value })} />
                  </Field>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Section>

      <Section title="Advanced Smart Money fields (optional)">
        <div className="grid md:grid-cols-2 gap-4">
          {SMC_EXTRA_FIELDS.map((k) => (
            <Field key={k} label={k.replaceAll("_", " ")}>
              <Input value={t.smc_extras?.[k] ?? ""} onChange={(e) => set("smc_extras", { ...t.smc_extras, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Execution & result">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="What happened after entry" className="md:col-span-2">
            <Textarea rows={3} value={t.execution_notes ?? ""} onChange={(e) => set("execution_notes", e.target.value)} />
          </Field>
          <ToggleField label="Trade respected analysis" value={!!t.respected_analysis} onChange={(v) => set("respected_analysis", v)} />
          <ToggleField label="Execution was correct" value={!!t.execution_correct} onChange={(v) => set("execution_correct", v)} />
          <Field label="Mistakes made" className="md:col-span-2"><Textarea rows={2} value={t.mistakes ?? ""} onChange={(e) => set("mistakes", e.target.value)} /></Field>
          <Field label="Lessons learned" className="md:col-span-2"><Textarea rows={2} value={t.lessons ?? ""} onChange={(e) => set("lessons", e.target.value)} /></Field>
          <Field label="Could entry be improved?" className="md:col-span-2"><Textarea rows={2} value={t.improvements ?? ""} onChange={(e) => set("improvements", e.target.value)} /></Field>
          <Field label="Replay notes" className="md:col-span-2"><Textarea rows={2} value={t.replay_notes ?? ""} onChange={(e) => set("replay_notes", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Emotional journal">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Before"><Input value={t.emotion_before ?? ""} onChange={(e) => set("emotion_before", e.target.value)} placeholder="calm, focused…" /></Field>
          <Field label="During"><Input value={t.emotion_during ?? ""} onChange={(e) => set("emotion_during", e.target.value)} /></Field>
          <Field label="After"><Input value={t.emotion_after ?? ""} onChange={(e) => set("emotion_after", e.target.value)} /></Field>
          <Field label={`Fear: ${t.fear_level ?? 0}`}><Slider min={0} max={10} step={1} value={[t.fear_level ?? 0]} onValueChange={([v]) => set("fear_level", v)} /></Field>
          <Field label={`Confidence: ${t.confidence_level ?? 0}`}><Slider min={0} max={10} step={1} value={[t.confidence_level ?? 0]} onValueChange={([v]) => set("confidence_level", v)} /></Field>
          <Field label={`Discipline: ${t.discipline_rating ?? 0}`}><Slider min={0} max={10} step={1} value={[t.discipline_rating ?? 0]} onValueChange={([v]) => set("discipline_rating", v)} /></Field>
          <Field label={`Patience: ${t.patience_rating ?? 0}`}><Slider min={0} max={10} step={1} value={[t.patience_rating ?? 0]} onValueChange={([v]) => set("patience_rating", v)} /></Field>
          <ToggleField label="Revenge trading" value={!!t.revenge_trading} onChange={(v) => set("revenge_trading", v)} />
          <ToggleField label="Overtrading" value={!!t.overtrading} onChange={(v) => set("overtrading", v)} />
          <ToggleField label="FOMO" value={!!t.fomo} onChange={(v) => set("fomo", v)} />
          <Field label="Journal notes" className="md:col-span-3"><Textarea rows={3} value={t.journal_notes ?? ""} onChange={(e) => set("journal_notes", e.target.value)} /></Field>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-2 sticky bottom-4">
        <Button variant="ghost" onClick={() => router.history.back()}>Cancel</Button>
        <Button onClick={save} disabled={busy} className="glow">{busy ? "Saving…" : existing?.id ? "Save changes" : "Create trade"}</Button>
      </div>
    </div>
  );
}

function numOrNull(v: number | null | undefined | string): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-5 md:p-6">
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground capitalize">{label}</Label>
      {children}
    </div>
  );
}
function NumInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Input type="number" step="any" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))} />
  );
}
function SelectBox({ value, onValueChange, options }: { value: string; onValueChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-md border border-border bg-accent/20">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
