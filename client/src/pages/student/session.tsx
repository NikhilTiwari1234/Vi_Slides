import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuthGuard } from "@/lib/auth";
import { useSocket } from "@/hooks/use-socket";
import ChatBox from "@/components/ui/ChatBox";
import {
  useGetSession,
  useGetQuestions,
  useGetActivePoll,
  useSubmitQuestion,
  useSendEngagement,
  useRespondToPoll,
  getGetQuestionsQueryKey,
  getGetActivePollQueryKey,
} from "@/lib/hooks";
import type { EngagementRequestType } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import QuestionCard from "@/components/ui/QuestionCard";
const currentUserId =
  JSON.parse(localStorage.getItem("user") || "{}")?.id;
import { Hand, MessageSquare, Loader2, ThumbsUp, HelpCircle, CheckCircle, Clock, BarChart2 } from "lucide-react";

export default function StudentSession() {
  const { sessionId: sessionIdStr } = useParams<{ sessionId: string }>();
  const sessionId = parseInt(sessionIdStr, 10);
  const { isReady } = useAuthGuard("student");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useSocket(sessionId);

  const { data: session, isLoading: sessionLoading } = useGetSession(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
  });

  const { data: questions } = useGetQuestions(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
  });

  const { data: activePoll } = useGetActivePoll(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false, refetchInterval: 5000 },
  });

  const submitQuestionMutation = useSubmitQuestion();
  const sendEngagementMutation = useSendEngagement();
  const respondToPollMutation = useRespondToPoll();

  
const handleUpvote = async (questionId: number | string) => {
  try {
    await fetch(`/api/sessions/${sessionId}/questions/${questionId}/upvote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("vi-slides-token")}`
      },
    });

   
    queryClient.invalidateQueries({
      queryKey: getGetQuestionsQueryKey(sessionId),
    });
  } catch (err) {
    toast({
      variant: "destructive",
      title: "Upvote failed",
      description: "Please try again",
    });
  }
};

  const [questionText, setQuestionText] = useState("");
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activePulse, setActivePulse] = useState<EngagementRequestType | null>(null);

  if (!isReady || sessionLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!session) {
    return <div className="p-8 text-center text-white">Session not found</div>;
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Session Ended</h1>
        <p className="text-muted-foreground mb-8">The teacher has closed this session.</p>
        <Button onClick={() => setLocation("/student/join")} variant="outline" className="border-white/20 hover:bg-white/10">
          Join Another Session
        </Button>
      </div>
    );
  }

  const isPaused = session.status === "paused";

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || isPaused) return;

    submitQuestionMutation.mutate({ sessionId, data: { text: questionText } }, {
      onSuccess: () => {
        setQuestionText("");
        toast({ title: "Question submitted!" });
        queryClient.invalidateQueries({ queryKey: getGetQuestionsQueryKey(sessionId) });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      },
    });
  };

  const toggleHand = () => {
    const newStatus = !isHandRaised;
    const type: EngagementRequestType = newStatus ? "hand_raise" : "hand_lower";
    sendEngagementMutation.mutate({ sessionId, data: { type } }, {
      onSuccess: () => setIsHandRaised(newStatus),
    });
  };

  const sendPulse = (type: EngagementRequestType) => {
    setActivePulse(type);
    sendEngagementMutation.mutate({ sessionId, data: { type } });
    setTimeout(() => setActivePulse(null), 2000);
  };

  const handleVote = (optionIndex: number) => {
    if (!activePoll || activePoll.userVote !== null) return;
    respondToPollMutation.mutate({ sessionId, pollId: activePoll.pollId, selectedOption: optionIndex }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActivePollQueryKey(sessionId) });
        toast({ title: "Vote submitted!" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Could not submit vote", description: err.message }),
    });
  };

  const displayQuestions =
  (questions || []).sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  const hasVoted = activePoll?.userVote !== null && activePoll?.userVote !== undefined;
  const maxCount = activePoll ? Math.max(...activePoll.counts, 1) : 1;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">
            {isPaused ? <span className="text-amber-500">PAUSED</span> : <span className="text-green-500">LIVE</span>}
          </div>
          <h1 className="text-xl font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{session.title}</h1>
        </div>

        <Button
          onClick={toggleHand}
          className={`h-12 px-6 rounded-full transition-all duration-300 shadow-lg ${isHandRaised ? "bg-primary text-black shadow-primary/50 scale-105 ring-4 ring-primary/20" : "bg-white/10 text-white hover:bg-white/20 border border-white/10"}`}
        >
          <Hand size={20} className={`mr-2 ${isHandRaised ? "animate-bounce" : ""}`} />
          {isHandRaised ? "Hand Raised" : "Raise Hand"}
        </Button>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* ── Pulse bar ───────────────────────────────────────────────────── */}
        <div className="glass p-5 rounded-3xl flex justify-between items-center gap-2">
          <Button variant="ghost" className={`flex-1 flex flex-col h-auto py-3 gap-2 rounded-2xl ${activePulse === "confused" ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/5 text-muted-foreground"}`} onClick={() => sendPulse("confused")}>
            <HelpCircle size={28} />
            <span className="text-xs font-semibold">Confused</span>
          </Button>

          <div className="w-px h-12 bg-white/10" />

          <Button variant="ghost" className={`flex-1 flex flex-col h-auto py-3 gap-2 rounded-2xl ${activePulse === "ok" ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/5 text-muted-foreground"}`} onClick={() => sendPulse("ok")}>
            <ThumbsUp size={28} />
            <span className="text-xs font-semibold">Following</span>
          </Button>

          <div className="w-px h-12 bg-white/10" />

          <Button variant="ghost" className={`flex-1 flex flex-col h-auto py-3 gap-2 rounded-2xl ${activePulse === "got_it" ? "bg-green-500/20 text-green-400" : "hover:bg-white/5 text-muted-foreground"}`} onClick={() => sendPulse("got_it")}>
            <CheckCircle size={28} />
            <span className="text-xs font-semibold">Got It</span>
          </Button>
        </div>

        {/* ── Active Poll card ─────────────────────────────────────────────── */}
        {activePoll && (
          <div className="glass p-6 rounded-3xl border border-primary/20 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-white">Live Poll</h2>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">Active</span>
              </span>
            </div>

            <p className="text-white font-medium mb-5 text-lg leading-snug">{activePoll.question}</p>

            {!hasVoted ? (
              /* Voting state: show clickable buttons */
              <div className="space-y-2">
                {activePoll.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleVote(i)}
                    disabled={respondToPollMutation.isPending}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/40 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {opt}
                  </button>
                ))}
                <p className="text-xs text-muted-foreground text-center pt-1">Tap an option to vote — you can only vote once.</p>
              </div>
            ) : (
              /* Results state: show bar chart after voting */
              <div className="space-y-3">
                {activePoll.options.map((opt, i) => {
                  const count = activePoll.counts[i] ?? 0;
                  const pct = activePoll.total > 0 ? Math.round((count / activePoll.total) * 100) : 0;
                  const barW = activePoll.total > 0 ? Math.round((count / maxCount) * 100) : 0;
                  const isMyVote = activePoll.userVote === i;
                  return (
                    <div key={i} className={`rounded-xl px-4 py-3 border ${isMyVote ? "bg-primary/15 border-primary/40" : "bg-white/5 border-white/5"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isMyVote ? "text-primary" : "text-white/80"}`}>
                          {opt} {isMyVote && <span className="text-xs ml-1">(your vote)</span>}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isMyVote ? "bg-primary" : "bg-white/30"}`}
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground text-center pt-1">{activePoll.total} vote{activePoll.total !== 1 ? "s" : ""} total · Results update live</p>
              </div>
            )}
          </div>
        )}

        {/* ── Ask a question ───────────────────────────────────────────────── */}
        <div className="glass p-6 rounded-3xl relative overflow-hidden">
          {isPaused && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <Clock size={32} className="text-amber-500 mb-2" />
              <p className="font-medium text-white">Input Paused</p>
              <p className="text-sm text-muted-foreground">Teacher has temporarily paused questions.</p>
            </div>
          )}
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" /> Ask a Question
          </h2>
          <form onSubmit={handleAskQuestion}>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="What's confusing you? Be specific..."
              className="resize-none bg-black/40 border-white/10 mb-4 h-24 text-base focus-visible:ring-primary/50"
              disabled={isPaused || submitQuestionMutation.isPending}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
                disabled={!questionText.trim() || isPaused || submitQuestionMutation.isPending}
              >
                {submitQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Ask
              </Button>
            </div>
          </form>
        </div>

        {/* ── Questions stream ─────────────────────────────────────────────── */}
        <div className="flex-1 mt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Questions Stream</h2>
          <div className="space-y-3 pb-20">
            {displayQuestions.length > 0 ? (
              displayQuestions.map((q) => (
              <QuestionCard
                  key={q.id}
                  question={q}
                  currentUserId={currentUserId}
                  onUpvote={handleUpvote}
              />
            ))
            ) : (
            <div className="text-center text-muted-foreground py-10">
                  No questions asked yet.
            </div>
          )}
          </div>
        </div>
      <div className="mt-4">
        <ChatBox sessionId={sessionId} />
      </div>
      </main>
    </div>
  );
}
