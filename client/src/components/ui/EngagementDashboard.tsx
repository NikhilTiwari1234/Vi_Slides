import React from "react";

interface Question {
  status: "pending" | "answered" | "merged" | string;
}

interface EngagementStats {
  confused: number;
  ok: number;
  gotIt: number;
  raisedHands: number;
}

interface EngagementDashboardProps {
  questions: Question[];
  engagement?: EngagementStats;
}

type EngagementLevel = "High" | "Medium" | "Low";

function getEngagementLevel(responseRate: number): EngagementLevel {
  if (responseRate > 70) return "High";
  if (responseRate >= 40) return "Medium";
  return "Low";
}

const levelConfig: Record<
  EngagementLevel,
  { label: string; bar: string; badge: string; text: string }
> = {
  High: {
    label: "High",
    bar: "bg-green-500",
    badge: "bg-green-100 text-green-700 ring-green-200",
    text: "text-green-700",
  },
  Medium: {
    label: "Medium",
    bar: "bg-yellow-400",
    badge: "bg-yellow-100 text-yellow-700 ring-yellow-200",
    text: "text-yellow-700",
  },
  Low: {
    label: "Low",
    bar: "bg-red-400",
    badge: "bg-red-100 text-red-700 ring-red-200",
    text: "text-red-700",
  },
};

interface StatCardProps {
  label: string;
  value: string | number;
  progress?: number;
  barClass?: string;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  progress,
  barClass = "bg-blue-500",
  suffix = "",
}) => (
  <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 flex flex-col gap-2">
    <p className="text-xs font-medium text-white/60 uppercase tracking-wide">
      {label}
    </p>
    <p className="text-2xl font-bold text-white">
      {value}
      {suffix}
    </p>
    {progress !== undefined && (
      <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </div>
);

const EngagementDashboard: React.FC<EngagementDashboardProps> = ({
  questions,
  engagement,
}) => {
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter(
    (q) => q.status === "answered" || q.status === "merged"
  ).length;
  const responseRate =
    totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;
  const level = getEngagementLevel(responseRate);
  const config = levelConfig[level];

  const totalEngagement = engagement
    ? engagement.confused + engagement.ok + engagement.gotIt
    : 0;

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
          Engagement Dashboard
        </h2>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${config.badge}`}
        >
          {config.label} Engagement
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Questions"
          value={totalQuestions}
          progress={100}
          barClass="bg-blue-400"
        />
        <StatCard
          label="Answered"
          value={answeredQuestions}
          progress={totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0}
          barClass="bg-green-500"
        />
        <StatCard
          label="Response Rate"
          value={responseRate}
          suffix="%"
          progress={responseRate}
          barClass={config.bar}
        />
        <StatCard
          label="Engagement Level"
          value={level}
          progress={level === "High" ? 100 : level === "Medium" ? 55 : 20}
          barClass={config.bar}
        />
      </div>

      {engagement && totalEngagement > 0 && (
        <div className="rounded-xl bg-white/10 border border-white/20 p-4 flex flex-col gap-3">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wide">
            Student Signals
          </p>
          <div className="flex flex-col gap-2">
            <SignalBar
              label="Got It"
              count={engagement.gotIt}
              total={totalEngagement}
              barClass="bg-green-400"
            />
            <SignalBar
              label="Following"
              count={engagement.ok}
              total={totalEngagement}
              barClass="bg-yellow-400"
            />
            <SignalBar
              label="Confused"
              count={engagement.confused}
              total={totalEngagement}
              barClass="bg-red-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface SignalBarProps {
  label: string;
  count: number;
  total: number;
  barClass: string;
}

const SignalBar: React.FC<SignalBarProps> = ({ label, count, total, barClass }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-white/70 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-white/80 shrink-0">
        {count}
      </span>
    </div>
  );
};

export default EngagementDashboard;
