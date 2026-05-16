import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/analytics")({
  component: Analytics,
  head: () => ({ meta: [{ title: "Analytics — Smart Money Journal" }] }),
});

function Analytics() {
  const { user } = useAuth();
  const { data: trades = [] } = useQuery({
    queryKey: ["trades", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("trades").select("*").order("trade_date");
      if (error) throw error;
      return data;
    },
  });

  const byMonth = aggregate(trades, (t) => format(new Date(t.trade_date), "MMM yyyy"));
  const byPair = aggregate(trades, (t) => t.pair);
  const bySession = aggregate(trades, (t) => t.session ?? "—");
  const byBias = aggregate(trades, (t) => t.bias ?? "—");

  const rrBuckets = bucketize(trades.map((t) => Number(t.rr_ratio ?? 0)), [0, 1, 2, 3, 4, 5, 10]);
  const drawdown = computeDrawdown(trades);
  const { maxWinStreak, maxLossStreak } = streaks(trades);

  // win rate by session
  const sessions = ["London", "New York", "Asia"];
  const winRateSession = sessions.map((s) => {
    const ts = trades.filter((t) => t.session === s);
    const w = ts.filter((t) => t.outcome === "win").length;
    return { name: s, winRate: ts.length ? +(w / ts.length * 100).toFixed(1) : 0 };
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Performance</div>
        <h1 className="text-3xl font-semibold tracking-tight">Advanced Analytics</h1>
      </div>

      {trades.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center text-muted-foreground">Add trades to see analytics.</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <ChartCard title="Monthly PnL"><BarPnl data={byMonth} /></ChartCard>
            <ChartCard title="PnL by Pair"><BarPnl data={byPair} /></ChartCard>
            <ChartCard title="PnL by Session"><BarPnl data={bySession} /></ChartCard>
            <ChartCard title="PnL by Bias"><BarPnl data={byBias} /></ChartCard>
            <ChartCard title="RR Distribution">
              <ResponsiveContainer>
                <BarChart data={rrBuckets}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={ttStyle} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Win Rate by Session (%)">
              <ResponsiveContainer>
                <BarChart data={winRateSession}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={ttStyle} />
                  <Bar dataKey="winRate" fill="var(--color-chart-5)" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Kpi label="Max Drawdown" value={drawdown.toFixed(2)} tone="destructive" />
            <Kpi label="Max Win Streak" value={maxWinStreak} tone="success" />
            <Kpi label="Max Loss Streak" value={maxLossStreak} tone="destructive" />
          </div>
        </>
      )}
    </div>
  );
}

const ttStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 } as const;

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}
function BarPnl({ data }: { data: { name: string; pnl: number }[] }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
        <Tooltip contentStyle={ttStyle} />
        <Bar dataKey="pnl" radius={6}>
          {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "success" | "destructive" }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
function aggregate(trades: { pnl: number | null; [k: string]: unknown }[], key: (t: never) => string) {
  const m = new Map<string, number>();
  for (const t of trades) {
    const k = key(t as never);
    m.set(k, (m.get(k) ?? 0) + Number(t.pnl ?? 0));
  }
  return Array.from(m, ([name, pnl]) => ({ name, pnl: +pnl.toFixed(2) }));
}
function bucketize(values: number[], buckets: number[]) {
  const out = buckets.slice(0, -1).map((b, i) => ({ name: `${b}-${buckets[i + 1]}`, count: 0 }));
  for (const v of values) {
    for (let i = 0; i < buckets.length - 1; i++) {
      if (v >= buckets[i] && v < buckets[i + 1]) { out[i].count++; break; }
    }
  }
  return out;
}
function computeDrawdown(trades: { pnl: number | null }[]) {
  let eq = 0, peak = 0, dd = 0;
  for (const t of trades) { eq += Number(t.pnl ?? 0); if (eq > peak) peak = eq; dd = Math.min(dd, eq - peak); }
  return Math.abs(dd);
}
function streaks(trades: { outcome: string | null }[]) {
  let w = 0, l = 0, mw = 0, ml = 0;
  for (const t of trades) {
    if (t.outcome === "win") { w++; l = 0; mw = Math.max(mw, w); }
    else if (t.outcome === "loss") { l++; w = 0; ml = Math.max(ml, l); }
    else { w = 0; l = 0; }
  }
  return { maxWinStreak: mw, maxLossStreak: ml };
}
