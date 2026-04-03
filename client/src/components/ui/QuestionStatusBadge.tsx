import React from "react";

type AnsweredBy = "ai" | "teacher" | null | undefined;

interface QuestionStatusBadgeProps {
  answer?: string | null;
  answeredBy?: AnsweredBy;
}

const QuestionStatusBadge: React.FC<QuestionStatusBadgeProps> = ({
  answer,
  answeredBy,
}) => {
  if (answer && answeredBy === "ai") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">
        <span>🤖</span> AI Answered
      </span>
    );
  }

  if (answer && answeredBy === "teacher") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">
        <span>🟢</span> Answered
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
      <span>⏳</span> Pending
    </span>
  );
};

export default QuestionStatusBadge;
