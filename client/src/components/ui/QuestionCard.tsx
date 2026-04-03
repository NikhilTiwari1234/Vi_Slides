import React from "react";
import QuestionStatusBadge from "./QuestionStatusBadge.tsx";

interface Question {
  id: string | number;
  text: string;
  userId?: string | number;
  answer?: string | null;
  answeredBy?: "ai" | "teacher" | null;
  createdAt?: string;
  studentName?: string;
}

interface QuestionCardProps {
  question: Question;
  currentUserId: string | number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentUserId,
}) => {
  const isOwn = String(question.userId) === String(currentUserId);

  return (
    <div
      className={[
        "rounded-xl border p-4 transition-all duration-200",
        isOwn
          ? "border-blue-300 bg-blue-50 shadow-sm shadow-blue-100"
          : "border-gray-200 bg-white hover:border-gray-300",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isOwn && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">
                You
              </span>
            )}
            {question.studentName && !isOwn && (
              <span className="text-xs text-gray-500">{question.studentName}</span>
            )}
          </div>
          <p className="text-sm text-gray-800 font-medium leading-snug">
            {question.text}
          </p>
          {question.answer && (
            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-xs text-gray-600 leading-relaxed">
                {question.answer}
              </p>
            </div>
          )}
        </div>
        <div className="shrink-0">
          <QuestionStatusBadge
            answer={question.answer}
            answeredBy={question.answeredBy}
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
