import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuthGuard } from "@/lib/auth";
import { useSocket } from "@/hooks/use-socket";
import {
  useGetSession,
  useGetParticipants,
  useGetQuestions,
  useGetEngagementSummary,
  useStartSession,
  usePauseSession,
  useEndSession,
  useAnswerQuestion,
  getGetSessionQueryKey,
  getGetQuestionsQueryKey,
} from "@/lib/hooks";
import type { AnswerQuestionRequestAnsweredBy } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Loader2, Copy, Check,
} from "lucide-react";
import QuestionStatusBadge from "@/components/ui/QuestionStatusBadge";

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

  const startMutation = useStartSession();
  const pauseMutation = usePauseSession();
  const endMutation = useEndSession();
  const answerMutation = useAnswerQuestion();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [teacherAnswer, setTeacherAnswer] = useState("");

  const pendingQuestions = questions?.filter((q) => q.status === "pending") || [];
  const currentQuestion = pendingQuestions[currentQuestionIndex];

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

        <div className="lg:col-span-4 flex flex-col gap-6">
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
