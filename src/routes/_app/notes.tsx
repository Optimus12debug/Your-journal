import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/notes")({
  component: NotesPage,
  head: () => ({ meta: [{ title: "Notes — Smart Money Journal" }] }),
});

const CATEGORIES = ["general", "lessons", "psychology", "strategy", "observations"];

function NotesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [filter, setFilter] = useState("all");

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("notes").insert({ user_id: user.id, title, content, category });
    if (error) return toast.error(error.message);
    toast.success("Note saved");
    setTitle(""); setContent(""); setCategory("general"); setCreating(false);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  const del = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  const filtered = filter === "all" ? notes : notes.filter((n) => n.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Knowledge</div>
          <h1 className="text-3xl font-semibold tracking-tight">Trading Notes</h1>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreating((c) => !c)} className="glow"><Plus className="size-4 mr-1" /> New Note</Button>
        </div>
      </div>

      {creating && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={6} placeholder="Write your note…" value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={save}>Save Note</Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center text-muted-foreground col-span-full">No notes yet.</div>
        ) : filtered.map((n) => (
          <div key={n.id} className="glass-card rounded-xl p-5 hover-lift">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 capitalize">{n.category}</span>
                <h3 className="font-semibold mt-2">{n.title}</h3>
              </div>
              <button onClick={() => del(n.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-6">{n.content}</p>
            <div className="text-[11px] text-muted-foreground mt-3">{format(new Date(n.created_at), "PPp")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
