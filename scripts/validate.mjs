import assert from "node:assert/strict";
import { evaluateAttempt, generateProblems } from "../src/problemGenerator.js";
import {
  addAttemptAndUpdateProgress,
  createInitialState,
  getStepStats,
  makeAttempt,
  recomputeStreakForStep,
} from "../src/progressService.js";
import { STEP_IDS } from "../src/stepsConfig.js";

function validateProblemGeneration() {
  for (const stepId of STEP_IDS) {
    const problems = generateProblems(stepId, 10);
    assert.equal(new Set(problems.map((problem) => problem.id)).size, 10);

    for (const problem of problems) {
      if (stepId === 4) {
        assert.equal(problem.operator, "+");
        assert.ok(problem.answer >= 0 && problem.answer <= 100);
      }

      if ([5, 6, 7].includes(stepId)) {
        assert.equal(problem.operator, "-");
        assert.ok(problem.answer >= 0);
      }

      if (stepId === 7) {
        assert.ok(problem.left >= 10 && problem.left <= 99);
        assert.ok(problem.right >= 10 && problem.right <= 99);
      }

      if (stepId === 9) {
        assert.ok(problem.answer >= 0 && problem.answer <= 1000);
      }

      if ([10, 11, 12, 13, 14, 15].includes(stepId)) {
        assert.equal(problem.operator, "×");
        assert.ok(Number.isInteger(problem.answer));
      }

      if ([16, 17, 19, 20, 21].includes(stepId)) {
        assert.equal(problem.operator, "÷");
        assert.equal(problem.left % problem.right, 0);
      }

      if (stepId === 17) {
        assert.ok(problem.left >= 10 && problem.left <= 99);
      }

      if (stepId === 19) {
        assert.ok(problem.left >= 100 && problem.left <= 999);
      }

      if (stepId === 20) {
        assert.ok(problem.left >= 1000 && problem.left <= 9999);
      }

      if (stepId === 18) {
        assert.equal(problem.operator, "÷");
        assert.ok(problem.remainder > 0);
        assert.equal(problem.left % problem.right, problem.remainder);
      }

      if ([23, 24, 25, 26].includes(stepId)) {
        assert.equal(problem.answerType, "decimal");
        assert.ok(!Number.isNaN(Number(problem.answer)));
      }

      if ([33, 34, 35, 36, 37, 38, 39, 40].includes(stepId)) {
        assert.equal(problem.answerType, "fraction");
        assert.match(String(problem.answer), /^-?\d+(\/\d+)?$/);
      }
    }

    const perfectEvaluation = evaluateAttempt(
      problems,
      problems.map((problem) => String(problem.answer)),
      9
    );
    assert.equal(perfectEvaluation.correctCount, 10);
  }
}

function makeEvaluation(correctCount) {
  const problems = Array.from({ length: 10 }, (_, index) => ({
    id: `p${index}`,
    prompt: `${index} + 0`,
    answer: index,
  }));
  const answers = problems.map((problem, index) => (index < correctCount ? String(problem.answer) : "999"));
  return {
    problems,
    evaluation: evaluateAttempt(problems, answers, 9),
  };
}

function validateProgressRules() {
  let state = createInitialState();
  const firstPass = makeEvaluation(9);
  const firstPassAttempt = makeAttempt({
    stepId: 4,
    date: "2026-05-01",
    ...firstPass,
  });
  state = addAttemptAndUpdateProgress(state, firstPassAttempt);
  assert.equal(state.masteryStreakByStep[4], 1);
  assert.deepEqual(state.unlockedStepIds, STEP_IDS);

  const failAttempt = makeEvaluation(8);
  state = addAttemptAndUpdateProgress(
    state,
    makeAttempt({
      stepId: 4,
      date: "2026-05-01",
      ...failAttempt,
    })
  );
  assert.equal(state.masteryStreakByStep[4], 0);

  const secondPass = makeEvaluation(9);
  state = addAttemptAndUpdateProgress(
    state,
    makeAttempt({
      stepId: 4,
      date: "2026-05-01",
      ...secondPass,
    })
  );
  assert.equal(state.masteryStreakByStep[4], 1);
  assert.deepEqual(state.unlockedStepIds, STEP_IDS);

  const thirdPass = makeEvaluation(9);
  state = addAttemptAndUpdateProgress(
    state,
    makeAttempt({
      stepId: 4,
      date: "2026-05-01",
      ...thirdPass,
    })
  );
  assert.equal(state.masteryStreakByStep[4], 2);
  assert.ok(state.unlockedStepIds.includes(7));
  assert.equal(state.currentStepId, 4);
  assert.equal(getStepStats(state, 4).totalQuestions, 40);
  assert.equal(getStepStats(state, 4).successRate, 88);

  const consecutiveAttempts = [
    { stepId: 7, date: "2026-05-03", correctCount: 9, totalCount: 10, isMastered: true },
    { stepId: 7, date: "2026-05-03", correctCount: 8, totalCount: 10, isMastered: false },
    { stepId: 7, date: "2026-05-03", correctCount: 9, totalCount: 10, isMastered: true },
  ];
  assert.equal(recomputeStreakForStep(consecutiveAttempts, 7), 1);
}

validateProblemGeneration();
validateProgressRules();
console.log("Validation passed.");
