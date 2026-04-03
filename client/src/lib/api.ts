export interface User {
  id: number;
  name: string;
  email: string;
  role: "teacher" | "student";
}

export interface Session {
  id: number;
  title: string;
  code: string;
  status: "waiting" | "active" | "paused" | "ended";
  teacherId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: number;
  userId: number;
  sessionId: number;
  handRaised: boolean;
  joinedAt: string;
  name: string;
}

export interface Question {
  id: number;
  sessionId: number;
  studentId: number;
  text: string;
  type: "simple" | "complex";
  status: "pending" | "answered" | "merged";
  answer: string | null;
  answeredBy: "teacher" | "ai" | null;
  mergedIntoId: number | null;
  duplicateCount: number;
  createdAt: string;
  studentName: string;

  upvotes: number;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface EngagementSummary {
  raisedHands: number;
  raisedHandNames: string[];
  confused: number;
  ok: number;
  gotIt: number;
}

export type AnswerQuestionRequestAnsweredBy = "teacher" | "ai";
export type EngagementRequestType =
  | "hand_raise"
  | "hand_lower"
  | "confused"
  | "ok"
  | "got_it";
export type RegisterRequestRole = "teacher" | "student";

const TOKEN_KEY = "vi-slides-token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || data.error || message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: RegisterRequestRole,
): Promise<AuthResponse> {
  return request("POST", "/api/auth/register", { name, email, password, role });
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request("POST", "/api/auth/login", { email, password });
}

export async function getMe(): Promise<User> {
  return request("GET", "/api/auth/me");
}

export async function createSession(title: string): Promise<Session> {
  return request("POST", "/api/sessions", { title });
}

export async function getMySessions(): Promise<Session[]> {
  return request("GET", "/api/sessions/my");
}

export async function joinSession(code: string): Promise<Session> {
  return request("POST", "/api/sessions/join", { code });
}

export async function getSession(sessionId: number): Promise<Session> {
  return request("GET", `/api/sessions/${sessionId}`);
}

export async function startSession(sessionId: number): Promise<Session> {
  return request("POST", `/api/sessions/${sessionId}/start`);
}

export async function pauseSession(sessionId: number): Promise<Session> {
  return request("POST", `/api/sessions/${sessionId}/pause`);
}

export async function endSession(sessionId: number): Promise<Session> {
  return request("POST", `/api/sessions/${sessionId}/end`);
}

export async function getParticipants(
  sessionId: number,
): Promise<Participant[]> {
  return request("GET", `/api/sessions/${sessionId}/participants`);
}

export async function getQuestions(sessionId: number): Promise<Question[]> {
  return request("GET", `/api/sessions/${sessionId}/questions`);
}

export async function submitQuestion(
  sessionId: number,
  text: string,
): Promise<Question> {
  return request("POST", `/api/sessions/${sessionId}/questions`, { text });
}

export async function answerQuestion(
  sessionId: number,
  questionId: number,
  answer: string,
  answeredBy: AnswerQuestionRequestAnsweredBy,
): Promise<Question> {
  return request(
    "POST",
    `/api/sessions/${sessionId}/questions/${questionId}/answer`,
    { answer, answeredBy },
  );
}

export interface Poll {
  id: number;
  sessionId: number;
  question: string;
  options: string[];
  status: "draft" | "active" | "closed";
  createdAt: string;
}

export interface PollResults {
  pollId: number;
  sessionId: number;
  question: string;
  options: string[];
  status: "draft" | "active" | "closed";
  counts: number[];
  total: number;
  userVote: number | null;
}

export async function getPolls(sessionId: number): Promise<Poll[]> {
  return request("GET", `/api/sessions/${sessionId}/polls`);
}

export async function getActivePoll(
  sessionId: number,
): Promise<PollResults | null> {
  return request("GET", `/api/sessions/${sessionId}/polls/active`);
}

export async function createPoll(
  sessionId: number,
  question: string,
  options: string[],
): Promise<Poll> {
  return request("POST", `/api/sessions/${sessionId}/polls`, {
    question,
    options,
  });
}

export async function activatePoll(
  sessionId: number,
  pollId: number,
): Promise<Poll> {
  return request("POST", `/api/sessions/${sessionId}/polls/${pollId}/activate`);
}

export async function closePoll(
  sessionId: number,
  pollId: number,
): Promise<Poll> {
  return request("POST", `/api/sessions/${sessionId}/polls/${pollId}/close`);
}

export async function respondToPoll(
  sessionId: number,
  pollId: number,
  selectedOption: number,
): Promise<PollResults> {
  return request("POST", `/api/sessions/${sessionId}/polls/${pollId}/respond`, {
    selectedOption,
  });
}

export async function getPollResults(
  sessionId: number,
  pollId: number,
): Promise<PollResults> {
  return request("GET", `/api/sessions/${sessionId}/polls/${pollId}/results`);
}

export async function sendEngagement(
  sessionId: number,
  type: EngagementRequestType,
): Promise<EngagementSummary> {
  return request("POST", `/api/sessions/${sessionId}/engagement`, { type });
}

export async function getEngagementSummary(
  sessionId: number,
): Promise<EngagementSummary> {
  return request("GET", `/api/sessions/${sessionId}/engagement/summary`);
}
