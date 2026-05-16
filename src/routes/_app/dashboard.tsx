import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { Activity, ArrowDownRight, ArrowUpRight, Award, Target, Wallet, Flame, Brain, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — Smart Money Journal" }] }),
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["trades", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("trade_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const total = trades.length;
  const wins = trades.filter((t) => t.outcome === "win");
  const losses = trades.filter((t) => t.outcome === "loss");
  const bes = trades.filter((t) => t.outcome === "breakeven");
  const totalPnl = trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const avgRR = total ? trades.reduce((s, t) => s + Number(t.rr_ratio ?? 0), 0) / total : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.pnl ?? 0), 0) / losses.length : 0;
  const best = trades.reduce<typeof trades[0] | null>((b, t) => (!b || Number(t.pnl) > Number(b.pnl) ? t : b), null);
  const worst = trades.reduce<typeof trades[0] | null>((b, t) => (!b || Number(t.pnl) < Number(b.pnl) ? t : b), null);
  const bullish = trades.filter((t) => t.bias === "bullish").length;
  const bearish = trades.filter((t) => t.bias === "bearish").length;

  // streak
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const o = trades[i].outcome;
    if (i === trades.length - 1) { streak = o === "win" ? 1 : o === "loss" ? -1 : 0; continue; }
    if (o === "win" && streak > 0) streak++;
    else if (o === "loss" && streak < 0) streak--;
    else break;
  }

  // PD arrays
  const pdRespect = trades.reduce((s, t) => {
    const tfs = (t.timeframe_analysis ?? {}) as Record<string, { flags?: Record<string, boolean> }>;
    return s + Object.values(tfs).filter((tf) => tf?.flags?.respecting_pd).length;
  }, 0);
  const pdDisrespect = trades.reduce((s, t) => {
    const tfs = (t.timeframe_analysis ?? {}) as Record<string, { flags?: Record<string, boolean> }>;
    return s + Object.values(tfs).filter((tf) => tf?.flags?.disrespecting_pd).length;
  }, 0);

  // equity curve
  let eq = 0;
  const equity = trades.map((t) => {
    eq += Number(t.pnl ?? 0);
    return { date: format(new Date(t.trade_date), "MMM d"), equity: Number(eq.toFixed(2)) };
  });

  const pie = [
    { name: "Wins", value: wins.length, color: "var(--color-success)" },
    { name: "Losses", value: losses.length, color: "var(--color-destructive)" },
    { name: "BE", value: bes.length, color: "var(--color-muted-foreground)" },
  ];

  const now = new Date();
  const monthPnl = trades
    .filter((t) => new Date(t.trade_date).getMonth() === now.getMonth() && new Date(t.trade_date).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const weekPnl = trades.filter((t) => new Date(t.trade_date).getTime() >= weekAgo).reduce((s, t) => s + Number(t.pnl ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Overview</div>
          <h1 className="text-3xl font-semibold tracking-tight">Trading Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Smart Money Concepts performance at a glance.</p>
        </div>
        <Button asChild className="glow">
          <Link to="/trades/new"><Plus className="size-4 mr-1" /> New Trade</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading stats…</div>
      ) : total === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <h2 className="text-xl font-semibold">No trades yet</h2>
          <p className="text-muted-foreground mt-1">Log your first trade to start tracking performance.</p>
          <Button asChild className="mt-5"><Link to="/trades/new"><Plus className="size-4 mr-1" /> Add Trade</Link></Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total PnL" value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`} accent={totalPnl >= 0 ? "success" : "destructive"} icon={<Wallet className="size-4" />} />
            <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} accent="primary" icon={<Target className="size-4" />} sub={`${wins.length}W / ${losses.length}L / ${bes.length}BE`} />
            <StatCard label="Total Trades" value={total} icon={<Activity className="size-4" />} />
            <StatCard label="Avg RR" value={avgRR.toFixed(2)} accent="primary" icon={<Award className="size-4" />} />

            <StatCard label="Avg Win" value={avgWin.toFixed(2)} accent="success" icon={<ArrowUpRight className="size-4" />} />
            <StatCard label="Avg Loss" value={avgLoss.toFixed(2)} accent="destructive" icon={<ArrowDownRight className="size-4" />} />
            <StatCard label="Best Trade" value={best ? Number(best.pnl).toFixed(2) : "—"} accent="success" sub={best?.pair} />
            <StatCard label="Worst Trade" value={worst ? Number(worst.pnl).toFixed(2) : "—"} accent="destructive" sub={worst?.pair} />

            <StatCard label="This Month" value={`${monthPnl >= 0 ? "+" : ""}${monthPnl.toFixed(2)}`} accent={monthPnl >= 0 ? "success" : "destructive"} />
            <StatCard label="This Week" value={`${weekPnl >= 0 ? "+" : ""}${weekPnl.toFixed(2)}`} accent={weekPnl >= 0 ? "success" : "destructive"} />
            <StatCard label="Streak" value={streak === 0 ? "—" : `${Math.abs(streak)} ${streak > 0 ? "wins" : "losses"}`} accent={streak >= 0 ? "success" : "destructive"} icon={<Flame className="size-4" />} />
            <StatCard label="Bias Split" value={`${bullish} / ${bearish}`} sub="bullish / bearish" icon={<Brain className="size-4" />} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Equity Curve</h3>
                <span className="text-xs text-muted-foreground">Cumulative PnL</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={equity}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="equity" stroke="var(--color-primary)" fill="url(#eq)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold mb-4">Win / Loss</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pie} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {pie.map((p, i) => <Cell key={i} fill={p.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-3 text-center text-xs">
                <div><div className="text-success font-semibold">{wins.length}</div><div className="text-muted-foreground">Wins</div></div>
                <div><div className="text-destructive font-semibold">{losses.length}</div><div className="text-muted-foreground">Losses</div></div>
                <div><div className="text-muted-foreground font-semibold">{bes.length}</div><div className="text-muted-foreground">BE</div></div>
              </div>
              <div className="mt-5 pt-4 border-t border-border/60 text-xs">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">PD respected</span><span className="text-success font-semibold">{pdRespect}</span></div>
                <div className="flex items-center justify-between mt-1"><span className="text-muted-foreground">PD disrespected</span><span className="text-destructive font-semibold">{pdDisrespect}</span></div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <h3 className="font-semibold">Recent Trades</h3>
              <Link to="/trades" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-3 py-3">Pair</th>
                    <th className="px-3 py-3">Direction</th>
                    <th className="px-3 py-3">Session</th>
                    <th className="px-3 py-3">RR</th>
                    <th className="px-3 py-3">PnL</th>
                    <th className="px-3 py-3">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trades].reverse().slice(0, 8).map((t) => (
                    <tr key={t.id} className="border-t border-border/40 hover:bg-accent/40">
                      <td className="px-5 py-3"><Link to="/trades/$id" params={{ id: t.id }} className="hover:text-primary">{format(new Date(t.trade_date), "MMM d, yyyy")}</Link></td>
                      <td className="px-3 py-3 font-medium">{t.pair}</td>
                      <td className="px-3 py-3 capitalize">{t.direction}</td>
                      <td className="px-3 py-3">{t.session ?? "—"}</td>
                      <td className="px-3 py-3">{t.rr_ratio ?? "—"}</td>
                      <td className={`px-3 py-3 font-semibold ${Number(t.pnl) >= 0 ? "text-success" : "text-destructive"}`}>{Number(t.pnl ?? 0).toFixed(2)}</td>
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
        </>
      )}
    </div>
  );
}
