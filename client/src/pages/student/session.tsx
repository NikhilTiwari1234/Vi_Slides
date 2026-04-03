import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuthGuard } from "@/lib/auth";
import { useSocket } from "@/hooks/use-socket";
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
import {
  Hand,
  MessageSquare,
  Loader2,
  ThumbsUp,
  HelpCircle,
  CheckCircle,
  Clock,
  BarChart2,
} from "lucide-react";
import QuestionCard from "@/components/ui/QuestionCard";


export default function StudentSession() {
  const { sessionId: sessionIdStr } = useParams<{ sessionId: string }>();
  const sessionId = parseInt(sessionIdStr, 10);
  const { isReady } = useAuthGuard("student");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useSocket(sessionId);

  const { data: session, isLoading: sessionLoading } = useGetSession(
    sessionId,
    {
      query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
    },
  );

  const { data: questions } = useGetQuestions(sessionId, {
    query: { enabled: isReady && !!sessionId, refetchOnWindowFocus: false },
  });

  const { data: activePoll } = useGetActivePoll(sessionId, {
    query: {
      enabled: isReady && !!sessionId,
      refetchOnWindowFocus: false,
      refetchInterval: 5000,
    },
  });

  const submitQuestionMutation = useSubmitQuestion();
  const sendEngagementMutation = useSendEngagement();
  const respondToPollMutation = useRespondToPoll();

  const [questionText, setQuestionText] = useState("");
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activePulse, setActivePulse] = useState<EngagementRequestType | null>(
    null,
  );

  if (!isReady || sessionLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <div className="p-8 text-center text-white">Session not found</div>;
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Session Ended</h1>
        <Button onClick={() => setLocation("/student/join")}>
          Join Another Session
        </Button>
      </div>
    );
  }

  const isPaused = session.status === "paused";

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || isPaused) return;

    submitQuestionMutation.mutate(
      { sessionId, data: { text: questionText } },
      {
        onSuccess: () => {
          setQuestionText("");
          queryClient.invalidateQueries({
            queryKey: getGetQuestionsQueryKey(sessionId),
          });
        },
      },
    );
  };

  const displayQuestions = questions || [];

  return (
    <div className="p-4">
      {/* Ask Question */}
      <form onSubmit={handleAskQuestion}>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Ask a question..."
        />
        <Button type="submit">Ask</Button>
      </form>

      {/* ⭐ UPDATED QUESTIONS STREAM */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-4">Questions Stream</h2>

        <div className="space-y-3">
          {displayQuestions.length > 0 ? (
            displayQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                sessionId={sessionId}
                refresh={() => {
                  queryClient.invalidateQueries({
                    queryKey: getGetQuestionsQueryKey(sessionId),
                  });
                }}
              />
            ))
          ) : (
            <div className="text-muted-foreground">No questions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
