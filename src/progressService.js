import { STEP_IDS } from "./stepsConfig.js";

const STORAGE_KEY = "calculation-step-quest:v1";
const PASSING_SCORE = 9;
const PROBLEMS_PER_SESSION = 10;
const REQUIRED_STREAK = 2;

export const RULES = {
  PASSING_SCORE,
  PROBLEMS_PER_SESSION,
  REQUIRED_STREAK,
};

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialState() {
  const masteryStreakByStep = STEP_IDS.reduce((streaks, stepId) => {
    streaks[stepId] = 0;
    return streaks;
  }, {});

  return {
    profile: {
      name: "",
      grade: "三年级",
      createdAt: todayKey(),
    },
    currentStepId: 4,
    unlockedStepIds: STEP_IDS,
    attempts: [],
    masteryStreakByStep,
  };
}

export function loadProgress() {
  if (typeof window === "undefined" || !window.localStorage) {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

export function saveProgress(state) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

export function clearProgress() {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function normalizeState(state) {
  const initial = createInitialState();
  return {
    ...initial,
    ...state,
    profile: {
      ...initial.profile,
      ...(state?.profile ?? {}),
    },
    currentStepId: STEP_IDS.includes(Number(state?.currentStepId))
      ? Number(state.currentStepId)
      : initial.currentStepId,
    unlockedStepIds: STEP_IDS,
    attempts: Array.isArray(state?.attempts) ? state.attempts : [],
    masteryStreakByStep: {
      ...initial.masteryStreakByStep,
      ...(state?.masteryStreakByStep ?? {}),
    },
  };
}

export function getBestAttemptByDate(attempts, stepId) {
  return attempts
    .filter((attempt) => Number(attempt.stepId) === Number(stepId))
    .reduce((byDate, attempt) => {
      const existing = byDate[attempt.date];
      if (!existing || attempt.correctCount > existing.correctCount) {
        byDate[attempt.date] = attempt;
      }
      return byDate;
    }, {});
}

export function recomputeStreakForStep(attempts, stepId) {
  let streak = 0;
  const stepAttempts = attempts.filter((attempt) => Number(attempt.stepId) === Number(stepId));

  for (let index = stepAttempts.length - 1; index >= 0; index -= 1) {
    if (!stepAttempts[index].isMastered) break;

    streak += 1;
  }

  return streak;
}

export function addAttemptAndUpdateProgress(state, attempt) {
  const normalized = normalizeState(state);
  const nextAttempts = [...normalized.attempts, attempt];
  const stepId = Number(attempt.stepId);
  const stepStreak = recomputeStreakForStep(nextAttempts, stepId);

  return {
    ...normalized,
    attempts: nextAttempts,
    unlockedStepIds: STEP_IDS,
    currentStepId: stepId,
    masteryStreakByStep: {
      ...normalized.masteryStreakByStep,
      [stepId]: stepStreak,
    },
  };
}

export function getTodayBestAttempt(state, stepId, date = todayKey()) {
  const bestByDate = getBestAttemptByDate(normalizeState(state).attempts, stepId);
  return bestByDate[date] ?? null;
}

export function getStepStats(state, stepId) {
  const attempts = normalizeState(state).attempts.filter((attempt) => Number(attempt.stepId) === Number(stepId));
  const totalQuestions = attempts.reduce((sum, attempt) => sum + (attempt.totalCount ?? 0), 0);
  const correctQuestions = attempts.reduce((sum, attempt) => sum + (attempt.correctCount ?? 0), 0);
  const totalDurationMs = attempts.reduce((sum, attempt) => sum + (attempt.durationMs ?? 0), 0);
  const successRate = totalQuestions === 0 ? 0 : Math.round((correctQuestions / totalQuestions) * 100);
  const averageDurationMs = attempts.length === 0 ? 0 : Math.round(totalDurationMs / attempts.length);

  return {
    attemptsCount: attempts.length,
    totalQuestions,
    correctQuestions,
    successRate,
    totalDurationMs,
    averageDurationMs,
  };
}

export function getOverallStats(state) {
  const normalized = normalizeState(state);
  return STEP_IDS.reduce(
    (summary, stepId) => {
      const stats = getStepStats(normalized, stepId);
      summary.totalQuestions += stats.totalQuestions;
      summary.correctQuestions += stats.correctQuestions;
      summary.totalDurationMs += stats.totalDurationMs;
      summary.attemptsCount += stats.attemptsCount;
      return summary;
    },
    {
      totalQuestions: 0,
      correctQuestions: 0,
      totalDurationMs: 0,
      attemptsCount: 0,
    }
  );
}

export function formatDuration(durationMs) {
  if (!durationMs) return "0秒";
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
}

export function makeAttempt({ stepId, date, evaluation, problems, durationMs = 0 }) {
  return {
    id: `${date}-${stepId}-${Date.now()}`,
    date,
    stepId: Number(stepId),
    correctCount: evaluation.correctCount,
    totalCount: evaluation.totalCount,
    isMastered: evaluation.correctCount >= PASSING_SCORE,
    durationMs,
    problems: problems.map((problem, index) => ({
      prompt: problem.prompt,
      answer: problem.answer,
      studentAnswer: evaluation.items[index]?.studentAnswer ?? "",
      isCorrect: evaluation.items[index]?.isCorrect ?? false,
    })),
  };
}
