import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthGuard, logout } from "@/lib/auth";
import { useGetMe, useGetMySessions, useCreateSession, getGetMySessionsQueryKey } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, MonitorPlay, LogOut, Loader2, PlayCircle, Clock, ChevronRight } from "lucide-react";

export default function TeacherDashboard() {
  const { isReady } = useAuthGuard("teacher");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const { data: user, isLoading: userLoading } = useGetMe({
    query: { enabled: isReady, retry: false },
  });

  const { data: sessions, isLoading: sessionsLoading } = useGetMySessions({
    query: { enabled: isReady },
  });

  const createSessionMutation = useCreateSession();

  if (!isReady || userLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && user.role !== "teacher") {
    setLocation("/student/join");
    return null;
  }

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;

    createSessionMutation.mutate({ data: { title: newSessionTitle } }, {
      onSuccess: (session) => {
        setNewSessionTitle("");
        queryClient.invalidateQueries({ queryKey: getGetMySessionsQueryKey() });
        toast({ title: "Session created successfully" });
        setLocation(`/teacher/session/${session.id}`);
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Failed to create session", description: error.message });
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-20">
      <header className="glass-panel sticky top-0 z-50 border-b-0 border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <MonitorPlay size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-white leading-tight">Teaching Console</h1>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-white">
          <LogOut size={16} className="mr-2" /> Logout
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10 animate-in fade-in duration-500">
        <section>
          <div className="glass p-8 rounded-3xl border-primary/20 shadow-[0_0_40px_-15px_rgba(0,180,255,0.2)]">
            <h2 className="text-2xl font-semibold text-white mb-2">Create New Session</h2>
            <p className="text-muted-foreground mb-6">Start a new presentation and invite your students.</p>

            <form onSubmit={handleCreateSession} className="flex gap-4">
              <Input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="e.g. Intro to React, Fall 2024"
                className="bg-black/40 border-white/10 text-lg h-14"
                disabled={createSessionMutation.isPending}
              />
              <Button
                type="submit"
                size="lg"
                className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={!newSessionTitle.trim() || createSessionMutation.isPending}
              >
                {createSessionMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                Create
              </Button>
            </form>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Sessions</h2>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <Link key={session.id} href={`/teacher/session/${session.id}`}>
                  <div className="glass hover:bg-white/[0.03] transition-colors p-5 rounded-2xl flex items-center justify-between group cursor-pointer border border-white/5 hover:border-primary/30">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.status === "active" ? "bg-primary/20 text-primary" : session.status === "paused" ? "bg-amber-500/20 text-amber-500" : "bg-white/5 text-muted-foreground"}`}>
                        {session.status === "active" ? <PlayCircle size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <h3 className="font-medium text-lg text-white group-hover:text-primary transition-colors">{session.title}</h3>
                        <div className="flex items-center gap-3 text-sm mt-1">
                          <span className="text-muted-foreground">{new Date(session.createdAt).toLocaleDateString()}</span>
                          <span className="text-white/20">•</span>
                          <span className="text-muted-foreground uppercase tracking-wider text-xs font-mono bg-black/30 px-2 py-0.5 rounded">{session.code}</span>
                          <span className="text-white/20">•</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${session.status === "active" ? "bg-primary/10 text-primary" : session.status === "paused" ? "bg-amber-500/10 text-amber-500" : session.status === "ended" ? "bg-destructive/10 text-destructive" : "bg-white/10 text-white"}`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground group-hover:text-primary transition-colors opacity-50 group-hover:opacity-100">
                      <ChevronRight size={24} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass p-12 rounded-3xl text-center border-dashed border-white/10">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No sessions yet</h3>
              <p className="text-muted-foreground">Create your first session to get started.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
