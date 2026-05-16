import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, icon, accent, className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "primary" | "success" | "destructive" | "warning";
  className?: string;
}) {
  const accentClass =
    accent === "success" ? "text-success" :
    accent === "destructive" ? "text-destructive" :
    accent === "warning" ? "text-warning" :
    accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className={cn("glass-card rounded-xl p-4 hover-lift", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tracking-tight", accentClass)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
