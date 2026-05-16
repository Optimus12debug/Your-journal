import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, PlusCircle, BarChart3, NotebookPen, LogOut, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: ListOrdered },
  { to: "/trades/new", label: "New Trade", icon: PlusCircle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/notes", label: "Notes", icon: NotebookPen },
];

export function Sidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const router = useRouter();
  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="size-9 rounded-lg grid place-items-center glow" style={{ background: "var(--gradient-primary)" }}>
            <TrendingUp className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">Smart Money</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">Trading Journal</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = path === to || (to !== "/dashboard" && path.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border border-primary/30 glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
