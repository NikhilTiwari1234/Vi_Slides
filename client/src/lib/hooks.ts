import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import * as api from "./api";
import type {
  User,
  Session,
  Participant,
  Question,
  EngagementSummary,
  Poll,
  PollResults,
  AuthResponse,
  AnswerQuestionRequestAnsweredBy,
  EngagementRequestType,
  RegisterRequestRole,
} from "./api";

export type {
  User,
  Session,
  Participant,
  Question,
  EngagementSummary,
  Poll,
  PollResults,
  AuthResponse,
  AnswerQuestionRequestAnsweredBy,
  EngagementRequestType,
  RegisterRequestRole,
};

export const getGetMeQueryKey = () => ["/api/auth/me"] as const;
export const getGetMySessionsQueryKey = () => ["/api/sessions/my"] as const;
export const getGetSessionQueryKey = (sessionId: number) =>
  [`/api/sessions/${sessionId}`] as const;
export const getGetParticipantsQueryKey = (sessionId: number) =>
  [`/api/sessions/${sessionId}/participants`] as const;
export const getGetQuestionsQueryKey = (sessionId: number) =>
  [`/api/sessions/${sessionId}/questions`] as const;
export const getGetEngagementSummaryQueryKey = (sessionId: number) =>
  [`/api/sessions/${sessionId}/engagement/summary`] as const;

export const getGetPollsQueryKey = (sessionId: number) =>
  [`/api/sessions/${sessionId}/polls`] as const;
export const getGetActivePollQueryKey = (sessionId: number) =>
  [`/api/sessions/${sessionId}/polls/active`] as const;
export const getGetPollResultsQueryKey = (sessionId: number, pollId: number) =>
  [`/api/sessions/${sessionId}/polls/${pollId}/results`] as const;

export function useGetMe(options?: { query?: UseQueryOptions<User> }) {
  return useQuery<User>({
    queryKey: getGetMeQueryKey(),
    queryFn: () => api.getMe(),
    ...options?.query,
  });
}

export function useLogin(
  options?: UseMutationOptions<
    AuthResponse,
    Error,
    { data: { email: string; password: string } }
  >,
) {
  return useMutation<
    AuthResponse,
    Error,
    { data: { email: string; password: string } }
  >({
    mutationFn: ({ data }) => api.login(data.email, data.password),
    ...options,
  });
}

export function useRegister(
  options?: UseMutationOptions<
    AuthResponse,
    Error,
    {
      data: {
        name: string;
        email: string;
        password: string;
        role: RegisterRequestRole;
      };
    }
  >,
) {
  return useMutation<
    AuthResponse,
    Error,
    {
      data: {
        name: string;
        email: string;
        password: string;
        role: RegisterRequestRole;
      };
    }
  >({
    mutationFn: ({ data }) =>
      api.register(data.name, data.email, data.password, data.role),
    ...options,
  });
}

export function useGetMySessions(options?: {
  query?: UseQueryOptions<Session[]>;
}) {
  return useQuery<Session[]>({
    queryKey: getGetMySessionsQueryKey(),
    queryFn: () => api.getMySessions(),
    ...options?.query,
  });
}

export function useGetSession(
  sessionId: number,
  options?: { query?: UseQueryOptions<Session> },
) {
  return useQuery<Session>({
    queryKey: getGetSessionQueryKey(sessionId),
    queryFn: () => api.getSession(sessionId),
    ...options?.query,
  });
}

export function useCreateSession(
  options?: UseMutationOptions<Session, Error, { data: { title: string } }>,
) {
  return useMutation<Session, Error, { data: { title: string } }>({
    mutationFn: ({ data }) => api.createSession(data.title),
    ...options,
  });
}

export function useJoinSession(
  options?: UseMutationOptions<Session, Error, { data: { code: string } }>,
) {
  return useMutation<Session, Error, { data: { code: string } }>({
    mutationFn: ({ data }) => api.joinSession(data.code),
    ...options,
  });
}

export function useStartSession(
  options?: UseMutationOptions<Session, Error, { sessionId: number }>,
) {
  return useMutation<Session, Error, { sessionId: number }>({
    mutationFn: ({ sessionId }) => api.startSession(sessionId),
    ...options,
  });
}

export function usePauseSession(
  options?: UseMutationOptions<Session, Error, { sessionId: number }>,
) {
  return useMutation<Session, Error, { sessionId: number }>({
    mutationFn: ({ sessionId }) => api.pauseSession(sessionId),
    ...options,
  });
}

export function useEndSession(
  options?: UseMutationOptions<Session, Error, { sessionId: number }>,
) {
  return useMutation<Session, Error, { sessionId: number }>({
    mutationFn: ({ sessionId }) => api.endSession(sessionId),
    ...options,
  });
}

export function useGetParticipants(
  sessionId: number,
  options?: { query?: UseQueryOptions<Participant[]> },
) {
  return useQuery<Participant[]>({
    queryKey: getGetParticipantsQueryKey(sessionId),
    queryFn: () => api.getParticipants(sessionId),
    ...options?.query,
  });
}

export function useGetQuestions(
  sessionId: number,
  options?: { query?: UseQueryOptions<Question[]> },
) {
  return useQuery<Question[]>({
    queryKey: getGetQuestionsQueryKey(sessionId),
    queryFn: () => api.getQuestions(sessionId),
    ...options?.query,
  });
}

export function useSubmitQuestion(
  options?: UseMutationOptions<
    Question,
    Error,
    { sessionId: number; data: { text: string } }
  >,
) {
  return useMutation<
    Question,
    Error,
    { sessionId: number; data: { text: string } }
  >({
    mutationFn: ({ sessionId, data }) =>
      api.submitQuestion(sessionId, data.text),
    ...options,
  });
}

export function useAnswerQuestion(
  options?: UseMutationOptions<
    Question,
    Error,
    {
      sessionId: number;
      questionId: number;
      data: { answer: string; answeredBy: AnswerQuestionRequestAnsweredBy };
    }
  >,
) {
  return useMutation<
    Question,
    Error,
    {
      sessionId: number;
      questionId: number;
      data: { answer: string; answeredBy: AnswerQuestionRequestAnsweredBy };
    }
  >({
    mutationFn: ({ sessionId, questionId, data }) =>
      api.answerQuestion(sessionId, questionId, data.answer, data.answeredBy),
    ...options,
  });
}

export function useGetEngagementSummary(
  sessionId: number,
  options?: { query?: UseQueryOptions<EngagementSummary> },
) {
  return useQuery<EngagementSummary>({
    queryKey: getGetEngagementSummaryQueryKey(sessionId),
    queryFn: () => api.getEngagementSummary(sessionId),
    ...options?.query,
  });
}

/** Send an engagement signal (raise hand, confused, ok, got it) */
export function useSendEngagement(
  options?: UseMutationOptions<
    EngagementSummary,
    Error,
    { sessionId: number; data: { type: EngagementRequestType } }
  >,
) {
  return useMutation<
    EngagementSummary,
    Error,
    { sessionId: number; data: { type: EngagementRequestType } }
  >({
    mutationFn: ({ sessionId, data }) =>
      api.sendEngagement(sessionId, data.type),
    ...options,
  });
}
export function useGetPolls(
  sessionId: number,
  options?: { query?: UseQueryOptions<Poll[]> },
) {
  return useQuery<Poll[]>({
    queryKey: getGetPollsQueryKey(sessionId),
    queryFn: () => api.getPolls(sessionId),
    ...options?.query,
  });
}

export function useGetActivePoll(
  sessionId: number,
  options?: {
    query?: Omit<UseQueryOptions<PollResults | null>, "queryKey" | "queryFn">;
  },
) {
  return useQuery<PollResults | null>({
    queryKey: getGetActivePollQueryKey(sessionId),
    queryFn: () => api.getActivePoll(sessionId),
    ...options?.query,
  });
}

export function useGetPollResults(
  sessionId: number,
  pollId: number,
  options?: { query?: UseQueryOptions<PollResults> },
) {
  return useQuery<PollResults>({
    queryKey: getGetPollResultsQueryKey(sessionId, pollId),
    queryFn: () => api.getPollResults(sessionId, pollId),
    ...options?.query,
  });
}

export function useCreatePoll(
  options?: UseMutationOptions<
    Poll,
    Error,
    { sessionId: number; data: { question: string; options: string[] } }
  >,
) {
  return useMutation<
    Poll,
    Error,
    { sessionId: number; data: { question: string; options: string[] } }
  >({
    mutationFn: ({ sessionId, data }) =>
      api.createPoll(sessionId, data.question, data.options),
    ...options,
  });
}

export function useActivatePoll(
  options?: UseMutationOptions<
    Poll,
    Error,
    { sessionId: number; pollId: number }
  >,
) {
  return useMutation<Poll, Error, { sessionId: number; pollId: number }>({
    mutationFn: ({ sessionId, pollId }) => api.activatePoll(sessionId, pollId),
    ...options,
  });
}

export function useClosePoll(
  options?: UseMutationOptions<
    Poll,
    Error,
    { sessionId: number; pollId: number }
  >,
) {
  return useMutation<Poll, Error, { sessionId: number; pollId: number }>({
    mutationFn: ({ sessionId, pollId }) => api.closePoll(sessionId, pollId),
    ...options,
  });
}

export function useRespondToPoll(
  options?: UseMutationOptions<
    PollResults,
    Error,
    { sessionId: number; pollId: number; selectedOption: number }
  >,
) {
  return useMutation<
    PollResults,
    Error,
    { sessionId: number; pollId: number; selectedOption: number }
  >({
    mutationFn: ({ sessionId, pollId, selectedOption }) =>
      api.respondToPoll(sessionId, pollId, selectedOption),
    ...options,
  });
}
