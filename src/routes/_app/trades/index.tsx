import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/trades/")({
  component: TradesList,
  head: () => ({ meta: [{ title: "Trades — Smart Money Journal" }] }),
});

function TradesList() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<string>("all");
  const [session, setSession] = useState<string>("all");
  const [bias, setBias] = useState<string>("all");

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["trades", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("trades").select("*").order("trade_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => trades.filter((t) => {
    if (outcome !== "all" && t.outcome !== outcome) return false;
    if (session !== "all" && t.session !== session) return false;
    if (bias !== "all" && t.bias !== bias) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!t.title.toLowerCase().includes(s) && !t.pair.toLowerCase().includes(s) && !(t.tags ?? []).some((x) => x.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [trades, q, outcome, session, bias]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Journal</div>
          <h1 className="text-3xl font-semibold tracking-tight">All Trades</h1>
        </div>
        <Button asChild><Link to="/trades/new"><Plus className="size-4 mr-1" /> New Trade</Link></Button>
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title, pair, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Outcome" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>
        <Select value={session} onValueChange={setSession}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Session" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            <SelectItem value="London">London</SelectItem>
            <SelectItem value="New York">New York</SelectItem>
            <SelectItem value="Asia">Asia</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bias} onValueChange={setBias}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Bias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bias</SelectItem>
            <SelectItem value="bullish">Bullish</SelectItem>
            <SelectItem value="bearish">Bearish</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="px-5 py-3">Date</th>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Pair</th>
                <th className="px-3 py-3">Dir</th>
                <th className="px-3 py-3">Bias</th>
                <th className="px-3 py-3">Session</th>
                <th className="px-3 py-3">RR</th>
                <th className="px-3 py-3 text-right">PnL</th>
                <th className="px-3 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">No trades match your filters.</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="border-t border-border/40 hover:bg-accent/40">
                  <td className="px-5 py-3"><Link to="/trades/$id" params={{ id: t.id }} className="hover:text-primary">{format(new Date(t.trade_date), "MMM d, yyyy")}</Link></td>
                  <td className="px-3 py-3"><Link to="/trades/$id" params={{ id: t.id }} className="font-medium hover:text-primary">{t.title}</Link></td>
                  <td className="px-3 py-3">{t.pair}</td>
                  <td className="px-3 py-3 capitalize">{t.direction}</td>
                  <td className="px-3 py-3 capitalize">{t.bias ?? "—"}</td>
                  <td className="px-3 py-3">{t.session ?? "—"}</td>
                  <td className="px-3 py-3">{t.rr_ratio ?? "—"}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${Number(t.pnl) >= 0 ? "text-success" : "text-destructive"}`}>{Number(t.pnl ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs capitalize border ${
                      t.outcome === "win" ? "border-success/40 text-success bg-success/10" :
                      t.outcome === "loss" ? "border-destructive/40 text-destructive bg-destructive/10" :
                      "border-border text-muted-foreground"
                    }`}>{t.outcome ?? "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
