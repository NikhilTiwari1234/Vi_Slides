import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Question = {
  id: number;
  text: string;
  upvotes: number;
  status: string;
  answer?: string | null;
  sentiment?: "positive" | "neutral" | "negative";
};

type QuestionCardProps = {
  question: Question;
  sessionId: number;
  refresh: () => void;
};

export default function QuestionCard({
  question,
  sessionId,
  refresh,
}: QuestionCardProps) {
  const handleUpvote = async () => {
    await fetch(
      `/api/sessions/${sessionId}/questions/${question.id}/upvote`,
      {
        method: "POST",
      }
    );
    refresh();
  };

  const statusColor =
    question.status === "answered"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <Card className="mb-4 hover:shadow-lg transition-all duration-200 border border-gray-200">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          
          {/* ⭐ UPDATED SECTION */}
          <div>
            <CardTitle className="text-base font-semibold leading-snug">
              {question.text}
            </CardTitle>

            <div className="flex items-center gap-2 mt-2">
              {question.sentiment === "positive" && (
                <span className="text-green-500 text-xs font-medium">
                  😊 Got it
                </span>
              )}

              {question.sentiment === "neutral" && (
                <span className="text-gray-500 text-xs font-medium">
                  😐 Neutral
                </span>
              )}

              {question.sentiment === "negative" && (
                <span className="text-red-500 text-xs font-medium">
                  😟 Confused
                </span>
              )}
            </div>
          </div>

          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
          >
            {question.status}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <button
            onClick={handleUpvote}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
          >
            👍
            <span className="font-medium">{question.upvotes}</span>
          </button>
        </div>

        {question.answer && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
            {question.answer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}