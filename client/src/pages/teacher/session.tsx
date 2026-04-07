import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuthGuard } from "@/lib/auth";
import { useSocket } from "@/hooks/use-socket";
import ChatBox from "@/components/ui/ChatBox";
import {
  useGetSession,
  useGetParticipants,
  useGetQuestions,
  useGetEngagementSummary,
  useGetPolls,
  useGetActivePoll,
  useStartSession,
  usePauseSession,
  useEndSession,
  useAnswerQuestion,
  useCreatePoll,
  useActivatePoll,
  useClosePoll,
  getGetSessionQueryKey,
  getGetQuestionsQueryKey,
  getGetPollsQueryKey,
  getGetActivePollQueryKey,
} from "@/lib/hooks";
import type { AnswerQuestionRequestAnsweredBy } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Play, Pause, Square, ChevronLeft, ChevronRight,
  Users, Hand, MessageSquare, BrainCircuit, CheckCircle2,
  Loader2, Copy, Check, BarChart2, Plus, Trash2, Zap,
} from "lucide-react";
import QuestionStatusBadge from "@/components/ui/QuestionStatusBadge";
import EngagementDashboard from "@/components/ui/EngagementDashboard";


export default function TeacherSession() {
  const { sessionId: sessionIdStr } = useParams<{ sessionId: string }>();
  const sessionId = parseInt(sessionIdStr, 10);
  const { isReady } = useAuthGuard("teacher");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  useSocket(sessionId);

  const { data: session, isLoading: sessionLoading } = useGetSession(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
  });

  const { data: participants } = useGetParticipants(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
  });

  const { data: questions } = useGetQuestions(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false, refetchInterval: 4000 },
  });

  const { data: engagement } = useGetEngagementSummary(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
  });

  const { data: polls } = useGetPolls(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
  });

  const { data: activePoll, refetch: refetchActivePoll } = useGetActivePoll(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false, refetchInterval: 3000 },
  });

  const startMutation = useStartSession();
  const pauseMutation = usePauseSession();
  const endMutation = useEndSession();
  const answerMutation = useAnswerQuestion();
  const createPollMutation = useCreatePoll();
  const activatePollMutation = useActivatePoll();
  const closePollMutation = useClosePoll();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [teacherAnswer, setTeacherAnswer] = useState("");

  // ── Poll creation form state ────────────────────────────────────────────────
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const pendingQuestions = questions?.filter((q) => q.status === "pending") || [];
  const currentQuestion = pendingQuestions[currentQuestionIndex];
  const closedPolls = polls?.filter((p) => p.status === "closed") || [];

  useEffect(() => {
    if (pendingQuestions.length > 0 && currentQuestionIndex >= pendingQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, pendingQuestions.length - 1));
    }
  }, [pendingQuestions, currentQuestionIndex]);

  if (!isReady || sessionLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!session) {
    return <div className="p-8 text-center text-white">Session not found</div>;
  }

  const copyCode = () => {
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Code copied to clipboard", duration: 2000 });
  };

  const handleStatusChange = (action: "start" | "pause" | "end") => {
    const opts = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        if (action === "end") setLocation("/teacher/dashboard");
      },
      onError: (err: Error) => toast({ variant: "destructive", title: "Action failed", description: err.message }),
    };
    if (action === "start") startMutation.mutate({ sessionId }, opts);
    if (action === "pause") pauseMutation.mutate({ sessionId }, opts);
    if (action === "end") endMutation.mutate({ sessionId }, opts);
  };

  const submitAnswer = () => {
    if (!currentQuestion) return;
    answerMutation.mutate({
      sessionId,
      questionId: currentQuestion.id,
      data: { answer: teacherAnswer || "Answered live", answeredBy: "teacher" as AnswerQuestionRequestAnsweredBy },
    }, {
      onSuccess: () => {
        setTeacherAnswer("");
        queryClient.invalidateQueries({ queryKey: getGetQuestionsQueryKey(sessionId) });
        toast({ title: "Question marked as answered" });
        if (currentQuestionIndex > 0 && currentQuestionIndex >= pendingQuestions.length - 1) {
          setCurrentQuestionIndex((prev) => prev - 1);
        }
      },
    });
  };

  // ── Poll helpers ─────────────────────────────────────────────────────────────

  const addOption = () => {
    if (pollOptions.length < 6) setPollOptions((prev) => [...prev, ""]);
  };

  const removeOption = (idx: number) => {
    if (pollOptions.length > 2) setPollOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    setPollOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const launchPoll = () => {
    const cleanOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOpts.length < 2) {
      toast({ variant: "destructive", title: "Fill in the question and at least 2 options" });
      return;
    }

    createPollMutation.mutate(
      { sessionId, data: { question: pollQuestion.trim(), options: cleanOpts } },
      {
        onSuccess: (poll) => {
          // Immediately activate the poll after creating it
          activatePollMutation.mutate({ sessionId, pollId: poll.id }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetPollsQueryKey(sessionId) });
              queryClient.invalidateQueries({ queryKey: getGetActivePollQueryKey(sessionId) });
              setPollQuestion("");
              setPollOptions(["", ""]);
              setShowPollForm(false);
              toast({ title: "Poll launched!" });
            },
          });
        },
        onError: (err) => toast({ variant: "destructive", title: "Failed to create poll", description: err.message }),
      }
    );
  };

  const handleClosePoll = () => {
    if (!activePoll) return;
    closePollMutation.mutate({ sessionId, pollId: activePoll.pollId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPollsQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: getGetActivePollQueryKey(sessionId) });
        toast({ title: "Poll closed" });
      },
    });
  };

  const maxCount = activePoll ? Math.max(...activePoll.counts, 1) : 1;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Live Session</div>
            <h1 className="text-xl font-semibold text-white">{session.title}</h1>
          </div>
          <div className="h-10 w-px bg-white/10 mx-2 hidden md:block" />
          <div className="hidden md:flex items-center gap-3 bg-black/30 px-4 py-2 rounded-xl border border-white/5">
            <span className="text-sm text-muted-foreground">Join Code:</span>
            <span className="font-mono text-2xl font-bold tracking-[0.2em] text-white">{session.code}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={copyCode}>
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session.status === "waiting" || session.status === "paused" ? (
            <Button onClick={() => handleStatusChange("start")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={startMutation.isPending}>
              <Play size={18} className="mr-2" /> Resume
            </Button>
          ) : session.status === "active" ? (
            <Button onClick={() => handleStatusChange("pause")} variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400" disabled={pauseMutation.isPending}>
              <Pause size={18} className="mr-2" /> Pause Input
            </Button>
          ) : null}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="bg-destructive/80 hover:bg-destructive text-white">
                <Square size={18} className="mr-2" /> End Session
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-panel border-white/10 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>End session?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will permanently close the session. Students will be disconnected and no further questions can be asked.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleStatusChange("end")} className="bg-destructive hover:bg-destructive/90 text-white">
                  End Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto w-full">
        {/* ─── Left column: Questions ────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass p-6 rounded-3xl flex-1 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-primary" />
                <h2 className="text-xl font-semibold text-white">Incoming Questions</h2>
                <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/20 border-0 ml-2">
                  {pendingQuestions.length} Pending
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-full border-white/10 hover:bg-white/10" disabled={pendingQuestions.length === 0 || currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}>
                  <ChevronLeft size={18} />
                </Button>
                <span className="text-sm font-medium w-16 text-center text-muted-foreground">
                  {pendingQuestions.length > 0 ? `${currentQuestionIndex + 1} / ${pendingQuestions.length}` : "0 / 0"}
                </span>
                <Button variant="outline" size="icon" className="rounded-full border-white/10 hover:bg-white/10" disabled={pendingQuestions.length === 0 || currentQuestionIndex === pendingQuestions.length - 1} onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>

            {pendingQuestions.length > 0 && currentQuestion ? (
              <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
                <div className="bg-black/30 p-8 rounded-2xl border border-white/5 mb-6 flex-1 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    {currentQuestion.type === "simple" ? (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1"><BrainCircuit size={12} /> AI Answered</Badge>
                    ) : (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Needs Teacher</Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground mb-4 font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                      {currentQuestion.studentName.charAt(0).toUpperCase()}
                    </div>
                    {currentQuestion.studentName} asked:
                    {currentQuestion.duplicateCount > 0 && (
                      <Badge variant="outline" className="ml-2 border-white/20 text-xs">+{currentQuestion.duplicateCount} others</Badge>
                    )}
                  </div>

                  <h3 className="text-3xl md:text-4xl font-medium text-white leading-tight mb-8">
                    "{currentQuestion.text}"
                  </h3>

                  {currentQuestion.type === "simple" && currentQuestion.answer && (
                    <div className="mt-auto bg-primary/10 border border-primary/20 rounded-xl p-5 text-primary-foreground/90 flex gap-4">
                      <BrainCircuit className="shrink-0 text-primary mt-1" />
                      <div>
                        <div className="text-xs text-primary font-bold uppercase tracking-wider mb-1">AI Suggestion</div>
                        <p className="text-sm leading-relaxed">{currentQuestion.answer}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  {currentQuestion.type === "simple" ? (
                    <Button
                      className="flex-1 h-14 bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 border border-green-500/30 text-lg"
                      onClick={() => {
                        answerMutation.mutate(
                          { sessionId, questionId: currentQuestion.id, data: { answer: currentQuestion.answer || "Answered live", answeredBy: "ai" } },
                          { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetQuestionsQueryKey(sessionId) }) }
                        );
                      }}
                      disabled={answerMutation.isPending}
                    >
                      <CheckCircle2 className="mr-2" /> Approve AI Answer
                    </Button>
                  ) : (
                    <div className="flex-1 flex gap-3">
                      <Textarea
                        value={teacherAnswer}
                        onChange={(e) => setTeacherAnswer(e.target.value)}
                        placeholder="Optional: Type an answer to save for later..."
                        className="resize-none bg-black/40 border-white/10 focus-visible:ring-primary h-14 min-h-[56px] py-3 text-base"
                      />
                      <Button className="h-14 px-8 bg-primary hover:bg-primary/90 text-lg" onClick={submitAnswer} disabled={answerMutation.isPending}>
                        <CheckCircle2 className="mr-2" /> Mark Answered
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <MessageSquare size={64} className="mb-4 text-white/20" strokeWidth={1} />
                <h3 className="text-xl font-medium text-white mb-2">No pending questions</h3>
                <p className="text-muted-foreground">When students ask questions, they will appear here.</p>
              </div>
            )}
          </div>

          {questions && questions.filter((q) => q.status !== "merged").length > 0 && (
            <div className="glass p-5 rounded-3xl">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <MessageSquare size={16} className="text-muted-foreground" /> All Questions
                <span className="text-xs text-muted-foreground font-normal ml-1">({questions.filter((q) => q.status !== "merged").length})</span>
              </h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {questions.filter((q) => q.status !== "merged").map((q) => (
                  <div key={q.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 leading-snug truncate">{q.text}</p>
                      {q.answer && <p className="text-xs text-primary/70 mt-1 truncate">↳ {q.answer}</p>}
                    </div>
                    <div className="shrink-0">
                      <QuestionStatusBadge
                        answer={q.answer}
                        answeredBy={q.answeredBy}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
            {/* ─── Right column: Poll + Engagement + Participants ─────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* ── Live Poll Panel ─────────────────────────────────────────────── */}
          <div className="glass p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart2 size={18} className="text-primary" /> Live Poll
              </h2>
              {!activePoll && !showPollForm && (
                <Button size="sm" onClick={() => setShowPollForm(true)} className="h-8 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-xs">
                  <Plus size={14} className="mr-1" /> New Poll
                </Button>
              )}
            </div>

            {activePoll ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-white leading-snug mb-4">{activePoll.question}</p>
                {activePoll.options.map((opt, i) => {
                  const count = activePoll.counts[i] ?? 0;
                  const pct = activePoll.total > 0 ? Math.round((count / activePoll.total) * 100) : 0;
                  const barW = activePoll.total > 0 ? Math.round((count / maxCount) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/80 truncate max-w-[75%]">{opt}</span>
                        <span className="text-muted-foreground font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${barW}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 flex items-center justify-between border-t border-white/10 mt-4">
                  <span className="text-xs text-muted-foreground">{activePoll.total} vote{activePoll.total !== 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">Live</span>
                  </div>
                </div>
                <Button className="w-full mt-2 h-10 bg-destructive/20 text-red-400 hover:bg-destructive/30 border border-destructive/30 text-sm" onClick={handleClosePoll} disabled={closePollMutation.isPending}>
                  {closePollMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Square size={14} className="mr-2" />}
                  Close Poll
                </Button>
              </div>
            ) : showPollForm ? (
              <div className="space-y-3">
                <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Ask the class a question..." className="bg-black/40 border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground h-11" autoFocus />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="flex-1 bg-black/40 border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground h-9 text-sm" />
                      {pollOptions.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-red-400 shrink-0" onClick={() => removeOption(i)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 6 && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white text-xs w-full h-8" onClick={addOption}>
                    <Plus size={12} className="mr-1" /> Add Option
                  </Button>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 border-white/10 hover:bg-white/5 text-muted-foreground text-xs h-9" onClick={() => { setShowPollForm(false); setPollQuestion(""); setPollOptions(["", ""]); }}>
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9" onClick={launchPoll} disabled={createPollMutation.isPending || activatePollMutation.isPending}>
                    {createPollMutation.isPending || activatePollMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Zap size={12} className="mr-1.5" />}
                    Launch Poll
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {closedPolls.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm opacity-70">
                    <BarChart2 size={36} className="mx-auto mb-2 text-white/10" strokeWidth={1} />
                    No polls yet. Create one to engage the class.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Past Polls</p>
                    {closedPolls.slice().reverse().map((p) => (
                      <div key={p.id} className="bg-black/20 border border-white/5 rounded-xl px-3 py-2">
                        <p className="text-xs text-white/70 leading-snug truncate">{p.question}</p>
                        <Badge className="mt-1 text-[10px] bg-white/5 text-muted-foreground border-white/10">Closed</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Engagement Dashboard (team member's feature) ─────────────────── */}
          <div className="glass p-6 rounded-3xl">
            <EngagementDashboard
              questions={questions || []}
              engagement={engagement || { confused: 0, ok: 0, gotIt: 0, raisedHands: 0, raisedHandNames: [] }}
            />
          </div>

          {/* ── Pulse Check ──────────────────────────────────────────────────── */}
          <div className="glass p-6 rounded-3xl">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <ActivityIcon /> Pulse Check
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-center">
                <div className="text-4xl font-bold text-amber-400 mb-1">{engagement?.confused || 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Confused</div>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-center">
                <div className="text-4xl font-bold text-blue-400 mb-1">{engagement?.ok || 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Following</div>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-center col-span-2">
                <div className="text-4xl font-bold text-green-400 mb-1">{engagement?.gotIt || 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Got it perfectly</div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary relative">
                  <Hand size={24} />
                  {engagement && engagement.raisedHands > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                      {engagement.raisedHands}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Raised Hands</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {engagement && engagement.raisedHands > 0 ? engagement.raisedHandNames.join(", ") : "None"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Participants ──────────────────────────────────────────────────── */}
          <div className="glass p-6 rounded-3xl flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><Users size={18} /> Participants</span>
              <Badge variant="secondary" className="bg-white/10 text-white">{participants?.length || 0}</Badge>
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[400px]">
              {participants && participants.length > 0 ? (
                participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-white">{p.name}</span>
                    </div>
                    {p.handRaised && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black animate-bounce shadow-[0_0_15px_rgba(0,180,255,0.6)]">
                        <Hand size={14} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Waiting for students to join...
                </div>
              )}
            </div>
          </div>
          {/* ── Live Chat ───────────────────────────────────────────── */}
          <div className="glass p-4 rounded-3xl">
            <ChatBox sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}