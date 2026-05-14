import React, { useEffect, useMemo, useState } from "react";
import { evaluateAttempt, generateProblems } from "./problemGenerator.js";
import {
  addAttemptAndUpdateProgress,
  clearProgress,
  formatDuration,
  getOverallStats,
  getStepStats,
  loadProgress,
  makeAttempt,
  RULES,
  saveProgress,
  todayKey,
} from "./progressService.js";
import { getCategoryName, getStep, STEP_CATEGORIES, STEPS } from "./stepsConfig.js";

const GRADES = ["三年级", "四年级", "五年级", "六年级"];

function StepStats({ stats }) {
  return (
    <div className="stats-grid">
      <span>总题数 <strong>{stats.totalQuestions}</strong></span>
      <span>正确率 <strong>{stats.successRate}%</strong></span>
      <span>练习 <strong>{stats.attemptsCount}次</strong></span>
      <span>总用时 <strong>{formatDuration(stats.totalDurationMs)}</strong></span>
    </div>
  );
}

function HomeView({ state, setState, onStart, onProgress }) {
  const [draftProfile, setDraftProfile] = useState(state.profile);
  const currentStep = getStep(state.currentStepId);
  const [selectedCategory, setSelectedCategory] = useState(currentStep.category);
  const categorySteps = STEPS.filter((step) => step.category === selectedCategory);
  const currentStepStats = getStepStats(state, currentStep.id);
  const overallStats = getOverallStats(state);
  const overallRate =
    overallStats.totalQuestions === 0
      ? 0
      : Math.round((overallStats.correctQuestions / overallStats.totalQuestions) * 100);

  function updateProfile(field, value) {
    const nextProfile = { ...draftProfile, [field]: value };
    setDraftProfile(nextProfile);
    setState((current) => ({ ...current, profile: nextProfile }));
  }

  function selectStep(stepId) {
    setState((current) => ({ ...current, currentStepId: stepId }));
  }

  function selectCategory(categoryId) {
    const firstStep = STEPS.find((step) => step.category === categoryId);
    setSelectedCategory(categoryId);
    if (firstStep) {
      selectStep(firstStep.id);
    }
  }

  return (
    <main className="screen home-screen">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">每日10题，提升计算力</p>
          <h1>计算大闯关</h1>
          <p className="hero-copy">Designed by NUS刘老师。</p>
        </div>
        <div className="teacher-card">
          <img className="teacher-photo" src="./teacher.jpeg" alt="NUS刘老师" />
          <p>数学 + 编程 + AI，欢迎联系我！</p>
        </div>
      </section>

      <section className="profile-grid">
        <label>
          学生昵称
          <input
            value={draftProfile.name}
            placeholder="例如：小明"
            onChange={(event) => updateProfile("name", event.target.value)}
          />
        </label>
        <label>
          年级
          <select value={draftProfile.grade} onChange={(event) => updateProfile("grade", event.target.value)}>
            {GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="selector-grid">
        <label>
          练习类型
          <select value={selectedCategory} onChange={(event) => selectCategory(event.target.value)}>
            {STEP_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          具体关卡
          <select value={currentStep.id} onChange={(event) => selectStep(Number(event.target.value))}>
            {categorySteps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.title}：{step.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="dashboard-strip">
        <div>
          <p className="eyebrow">当前选择</p>
          <h2>{currentStep.title}：{currentStep.name}</h2>
          <p>{currentStep.description}</p>
        </div>
        <div className="summary-metrics">
          <span>本关题数 <strong>{currentStepStats.totalQuestions}</strong></span>
          <span>本关正确率 <strong>{currentStepStats.successRate}%</strong></span>
          <span>本关用时 <strong>{formatDuration(currentStepStats.totalDurationMs)}</strong></span>
        </div>
      </section>

      <section className="compact-summary">
        <span>总题数 <strong>{overallStats.totalQuestions}</strong></span>
        <span>总正确率 <strong>{overallRate}%</strong></span>
        <span>总用时 <strong>{formatDuration(overallStats.totalDurationMs)}</strong></span>
      </section>

      <div className="actions">
        <button className="primary-button" onClick={onStart}>开始这一关10题</button>
        <button className="secondary-button" onClick={onProgress}>查看进度汇总</button>
      </div>
    </main>
  );
}

function PracticeView({ state, onFinish, onCancel }) {
  const step = getStep(state.currentStepId);
  const [startedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [problems] = useState(() => generateProblems(step.id, RULES.PROBLEMS_PER_SESSION));
  const [answers, setAnswers] = useState(Array(RULES.PROBLEMS_PER_SESSION).fill(""));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const currentProblem = problems[currentIndex];
  const currentAnswer = answers[currentIndex];
  const isLast = currentIndex === problems.length - 1;
  const needsRemainder = currentProblem.answerType === "quotientRemainder";
  const needsDecimal = currentProblem.answerType === "decimal";
  const needsFraction = currentProblem.answerType === "fraction";

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  function setAnswer(value) {
    const allowedPattern = needsRemainder
      ? /^[\d.,，余rR\s]*$/
      : needsDecimal
        ? /^\d*\.?\d*$/
        : needsFraction
          ? /^[\d/\s-]*$/
          : /^\d*$/;
    if (allowedPattern.test(value)) {
      setError("");
      setAnswers((current) => current.map((answer, index) => (index === currentIndex ? value : answer)));
    }
  }

  function appendText(value) {
    setAnswer(`${currentAnswer}${value}`);
  }

  function goNext() {
    if (String(currentAnswer).trim() === "") {
      setError("请先输入答案。");
      return;
    }

    if (isLast) {
      onFinish(problems, answers, Date.now() - startedAt);
    } else {
      setCurrentIndex((index) => index + 1);
      setError("");
    }
  }

  return (
    <main className="screen practice-screen">
      <header className="practice-header">
        <button className="text-button" onClick={onCancel}>返回</button>
        <div>
          <p className="eyebrow">{step.title}</p>
          <h1>{step.shortName}</h1>
        </div>
        <span className="question-count">{currentIndex + 1}/{problems.length}</span>
      </header>

      <section className="problem-panel">
        <div className="practice-meta">本轮用时：{formatDuration(elapsedMs)}</div>
        <div className="problem-text">{currentProblem.prompt} =</div>
        {needsRemainder && <p className="answer-hint">有余数题请写成：商...余数，例如 7...2</p>}
        {needsFraction && <p className="answer-hint">分数题请写成：分子/分母，例如 5/6。整数可直接写整数。</p>}
        <input
          className="answer-input"
          value={currentAnswer}
          inputMode={needsRemainder || needsFraction ? "text" : needsDecimal ? "decimal" : "numeric"}
          autoFocus
          aria-label="答案"
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") goNext();
          }}
        />
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="keypad" aria-label="数字键盘">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button key={digit} onClick={() => appendText(String(digit))}>{digit}</button>
        ))}
        <button onClick={() => setAnswer("")}>清空</button>
        <button onClick={() => appendText("0")}>0</button>
        <button onClick={() => setAnswer(currentAnswer.slice(0, -1))}>退格</button>
        {needsRemainder && <button className="wide-key" onClick={() => appendText("...")}>余数</button>}
        {needsDecimal && <button className="wide-key" onClick={() => appendText(".")}>小数点</button>}
        {needsFraction && <button className="wide-key" onClick={() => appendText("/")}>分数线</button>}
      </section>

      <button className="primary-button full-width" onClick={goNext}>
        {isLast ? "完成并看结果" : "下一题"}
      </button>
    </main>
  );
}

function ResultView({ result, onHome, onRetry, onProgress }) {
  const step = getStep(result.attempt.stepId);
  const streak = result.state.masteryStreakByStep[step.id] ?? 0;

  return (
    <main className="screen result-screen">
      <section className={`result-summary ${result.evaluation.isMastered ? "passed" : "needs-practice"}`}>
        <p className="eyebrow">{step.title} 结果</p>
        <h1>{result.evaluation.correctCount}/{result.evaluation.totalCount}</h1>
        <p>
          本轮用时 {formatDuration(result.attempt.durationMs)}。
          {result.evaluation.isMastered ? " 本次达标了。" : " 本次还没达标，订正后再练一次。"}
        </p>
      </section>

      <section className="dashboard-strip">
        <div>
          <p className="eyebrow">连续达标</p>
          <h2>{Math.min(streak, RULES.REQUIRED_STREAK)}/{RULES.REQUIRED_STREAK}</h2>
          <p>连续两次达标表示这一关暂时稳定。</p>
        </div>
        <StepStats stats={getStepStats(result.state, step.id)} />
      </section>

      <section className="mistakes-panel">
        <h2>错题订正</h2>
        {result.evaluation.mistakes.length === 0 ? (
          <p className="empty-text">本次没有错题。</p>
        ) : (
          <div className="mistake-list">
            {result.evaluation.mistakes.map((item, index) => (
              <div className="mistake-item" key={`${item.problem.id}-${index}`}>
                <span>{item.problem.prompt} =</span>
                <span>你的答案：{item.studentAnswer || "空"}</span>
                <strong>正确答案：{item.problem.answer}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="actions">
        <button className="primary-button" onClick={onRetry}>再练一次</button>
        <button className="secondary-button" onClick={onProgress}>查看进度</button>
        <button className="secondary-button" onClick={onHome}>回首页</button>
      </div>
    </main>
  );
}

function ProgressView({ state, onHome, onStart, onReset }) {
  const recentAttempts = useMemo(() => [...state.attempts].reverse().slice(0, 10), [state.attempts]);
  const overallStats = getOverallStats(state);
  const overallRate =
    overallStats.totalQuestions === 0
      ? 0
      : Math.round((overallStats.correctQuestions / overallStats.totalQuestions) * 100);

  return (
    <main className="screen progress-screen">
      <header className="page-header">
        <div>
          <p className="eyebrow">截图汇报页</p>
          <h1>{state.profile.name || "学生"} 的计算进度</h1>
        </div>
        <button className="text-button" onClick={onHome}>回首页</button>
      </header>

      <section className="dashboard-strip">
        <div>
          <p className="eyebrow">总览</p>
          <h2>总正确率 {overallRate}%</h2>
          <p>累计 {overallStats.totalQuestions} 题，总用时 {formatDuration(overallStats.totalDurationMs)}。</p>
        </div>
        <div className="summary-metrics">
          <span>正确 <strong>{overallStats.correctQuestions}</strong></span>
          <span>练习 <strong>{overallStats.attemptsCount}次</strong></span>
          <span>平均用时 <strong>{formatDuration(
            overallStats.attemptsCount ? overallStats.totalDurationMs / overallStats.attemptsCount : 0
          )}</strong></span>
        </div>
      </section>

      <section className="progress-table-panel">
        <h2>各关统计</h2>
        <div className="progress-table">
          {STEPS.map((step) => {
            const stats = getStepStats(state, step.id);
            return (
              <button
                className={`progress-row ${step.id === state.currentStepId ? "active" : ""}`}
                key={step.id}
                onClick={() => onStart(step.id)}
              >
                <span>{step.title}</span>
                <strong>{step.shortName}</strong>
                <span>{getCategoryName(step.category)}</span>
                <span>{stats.totalQuestions}题</span>
                <span>{stats.successRate}%</span>
                <span>{formatDuration(stats.totalDurationMs)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="history-panel">
        <h2>最近练习记录</h2>
        {recentAttempts.length === 0 ? (
          <p className="empty-text">还没有练习记录。</p>
        ) : (
          <div className="history-list">
            {recentAttempts.map((attempt) => (
              <div className="history-item" key={attempt.id}>
                <span>{attempt.date}</span>
                <strong>{getStep(attempt.stepId).title}</strong>
                <span>{attempt.correctCount}/{attempt.totalCount}</span>
                <span>{formatDuration(attempt.durationMs)}</span>
                <span className={attempt.isMastered ? "tag success-tag" : "tag muted-tag"}>
                  {attempt.isMastered ? "达标" : "未达标"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="actions">
        <button className="primary-button" onClick={() => onStart(state.currentStepId)}>继续练习</button>
        <button className="danger-button" onClick={onReset}>重置本机进度</button>
      </div>
    </main>
  );
}

export default function App() {
  const [state, setState] = useState(() => loadProgress());
  const [view, setView] = useState("home");
  const [result, setResult] = useState(null);

  useEffect(() => {
    saveProgress(state);
  }, [state]);

  function startStep(stepId = state.currentStepId) {
    setState((current) => ({ ...current, currentStepId: stepId }));
    setView("practice");
  }

  function finishPractice(problems, answers, durationMs) {
    const evaluation = evaluateAttempt(problems, answers, RULES.PASSING_SCORE);
    const attempt = makeAttempt({
      stepId: state.currentStepId,
      date: todayKey(),
      evaluation,
      problems,
      durationMs,
    });
    const nextState = addAttemptAndUpdateProgress(state, attempt);
    setState(nextState);
    setResult({ evaluation, attempt, state: nextState });
    setView("result");
  }

  function resetProgress() {
    const confirmed = window.confirm("确定要重置当前浏览器里的练习记录吗？这个操作不会影响其他设备。");
    if (!confirmed) return;
    clearProgress();
    const nextState = loadProgress();
    setState(nextState);
    setResult(null);
    setView("home");
  }

  return (
    <div className="app-shell">
      {view === "home" && (
        <HomeView
          state={state}
          setState={setState}
          onStart={() => startStep(state.currentStepId)}
          onProgress={() => setView("progress")}
        />
      )}
      {view === "practice" && (
        <PracticeView
          key={`${state.currentStepId}-${state.attempts.length}`}
          state={state}
          onFinish={finishPractice}
          onCancel={() => setView("home")}
        />
      )}
      {view === "result" && result && (
        <ResultView
          result={result}
          onHome={() => setView("home")}
          onRetry={() => startStep(result.attempt.stepId)}
          onProgress={() => setView("progress")}
        />
      )}
      {view === "progress" && (
        <ProgressView
          state={state}
          onHome={() => setView("home")}
          onStart={startStep}
          onReset={resetProgress}
        />
      )}
    </div>
  );
}
