import { createFileRoute } from "@tanstack/react-router";
import { TradeForm } from "@/components/trade-form";

export const Route = createFileRoute("/_app/trades/new")({
  component: NewTrade,
  head: () => ({ meta: [{ title: "New Trade — Smart Money Journal" }] }),
});

function NewTrade() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Create</div>
        <h1 className="text-3xl font-semibold tracking-tight">New Trade Entry</h1>
        <p className="text-sm text-muted-foreground mt-1">Log a complete SMC trade with multi-timeframe analysis.</p>
      </div>
      <TradeForm />
    </div>
  );
}
