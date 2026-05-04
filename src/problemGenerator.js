import { getStep } from "./stepsConfig.js";

const OPERATORS = {
  add: "+",
  subtract: "-",
  multiply: "×",
  divide: "÷",
};

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function simplifyFraction(numerator, denominator) {
  if (denominator === 0) throw new Error("分母不能为0。");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (numerator / divisor) * sign,
    denominator: Math.abs(denominator / divisor),
  };
}

function fractionToString(numerator, denominator) {
  const simplified = simplifyFraction(numerator, denominator);
  if (simplified.denominator === 1) return String(simplified.numerator);
  return `${simplified.numerator}/${simplified.denominator}`;
}

function makeFraction(numerator, denominator) {
  const simplified = simplifyFraction(numerator, denominator);
  return {
    numerator: simplified.numerator,
    denominator: simplified.denominator,
    text: fractionToString(simplified.numerator, simplified.denominator),
  };
}

function randomFraction(maxDenominator = 12) {
  const denominator = randomInt(2, maxDenominator);
  const numerator = randomInt(1, denominator - 1);
  return makeFraction(numerator, denominator);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeProblem(left, operator, right, answer, extra = {}) {
  return {
    id: `${left}${operator}${right}${extra.idSuffix ?? ""}`,
    left,
    right,
    operator,
    answer,
    prompt: `${left} ${operator} ${right}`,
    answerType: "integer",
    ...extra,
  };
}

function formatDecimal(value) {
  return Number(value.toFixed(2)).toString();
}

function makeAddProblem(maxSum) {
  const left = randomInt(0, maxSum);
  const right = randomInt(0, maxSum - left);
  return makeProblem(left, OPERATORS.add, right, left + right);
}

function makeSubtractProblem(minLeft, maxLeft, minRight = 0, maxRight = null) {
  const left = randomInt(minLeft, maxLeft);
  const right = randomInt(minRight, Math.min(maxRight ?? left, left));
  return makeProblem(left, OPERATORS.subtract, right, left - right);
}

function makeMultiplyProblem(leftMin, leftMax, rightMin, rightMax) {
  const left = randomInt(leftMin, leftMax);
  const right = randomInt(rightMin, rightMax);
  return makeProblem(left, OPERATORS.multiply, right, left * right);
}

function makeExactDivisionProblem(divisorMin, divisorMax, quotientMin, quotientMax) {
  const divisor = randomInt(divisorMin, divisorMax);
  const quotient = randomInt(quotientMin, quotientMax);
  const dividend = divisor * quotient;
  return makeProblem(dividend, OPERATORS.divide, divisor, quotient);
}

function makeExactDivisionByDividend(divisorMin, divisorMax, minDividend, maxDividend) {
  const divisor = randomInt(divisorMin, divisorMax);
  const minQuotient = Math.ceil(minDividend / divisor);
  const maxQuotient = Math.floor(maxDividend / divisor);
  return makeExactDivisionProblem(divisor, divisor, minQuotient, maxQuotient);
}

function makeRemainderDivisionProblem() {
  const divisor = randomInt(2, 9);
  const quotient = randomInt(2, Math.floor(98 / divisor));
  const remainder = randomInt(1, divisor - 1);
  const dividend = divisor * quotient + remainder;
  return makeProblem(dividend, OPERATORS.divide, divisor, `${quotient}...${remainder}`, {
    answerType: "quotientRemainder",
    quotient,
    remainder,
    normalizedAnswer: `${quotient}...${remainder}`,
    idSuffix: `r${remainder}`,
  });
}

function makeStep8Problem() {
  return Math.random() < 0.5 ? makeAddProblem(100) : makeSubtractProblem(0, 100);
}

function makeStep9Problem() {
  return Math.random() < 0.5 ? makeAddProblem(1000) : makeSubtractProblem(0, 1000);
}

function makeStep14Problem() {
  const bases = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  const left = bases[randomInt(0, bases.length - 1)];
  const right = randomInt(2, 9);
  return makeProblem(left, OPERATORS.multiply, right, left * right);
}

function makeStep21Problem() {
  return makeExactDivisionProblem(10, 35, 10, 99);
}

function makeStep22Problem() {
  const pattern = randomInt(1, 4);

  if (pattern === 1) {
    const left = randomInt(10, 99);
    const multiplier = randomInt(2, 9);
    const addend = randomInt(1, 99);
    return {
      id: `${left}x${multiplier}+${addend}`,
      prompt: `${left} × ${multiplier} + ${addend}`,
      answer: left * multiplier + addend,
      answerType: "integer",
    };
  }

  if (pattern === 2) {
    const divisor = randomInt(2, 9);
    const quotient = randomInt(10, 99);
    const addend = randomInt(1, 99);
    const dividend = divisor * quotient;
    return {
      id: `${dividend}/${divisor}+${addend}`,
      prompt: `${dividend} ÷ ${divisor} + ${addend}`,
      answer: quotient + addend,
      answerType: "integer",
    };
  }

  if (pattern === 3) {
    const left = randomInt(100, 999);
    const subtrahend = randomInt(10, Math.min(400, left));
    const multiplier = randomInt(2, 9);
    return {
      id: `(${left}-${subtrahend})x${multiplier}`,
      prompt: `(${left} - ${subtrahend}) × ${multiplier}`,
      answer: (left - subtrahend) * multiplier,
      answerType: "integer",
    };
  }

  const left = randomInt(10, 99);
  const multiplier = randomInt(2, 9);
  const subtrahend = randomInt(1, left * multiplier);
  return {
    id: `${left}x${multiplier}-${subtrahend}`,
    prompt: `${left} × ${multiplier} - ${subtrahend}`,
    answer: left * multiplier - subtrahend,
    answerType: "integer",
  };
}

function makeDecimalNumber(maxTenths = 200) {
  const scale = Math.random() < 0.7 ? 10 : 100;
  return randomInt(1, maxTenths * (scale / 10)) / scale;
}

function makeDecimalProblem(operator) {
  if (operator === OPERATORS.add) {
    const left = makeDecimalNumber(120);
    const right = makeDecimalNumber(120);
    const answer = formatDecimal(left + right);
    return makeProblem(formatDecimal(left), operator, formatDecimal(right), answer, {
      answerType: "decimal",
      normalizedAnswer: answer,
    });
  }

  const left = makeDecimalNumber(200);
  const right = makeDecimalNumber(Math.floor(left * 10));
  const larger = Math.max(left, right);
  const smaller = Math.min(left, right);
  const answer = formatDecimal(larger - smaller);
  return makeProblem(formatDecimal(larger), operator, formatDecimal(smaller), answer, {
    answerType: "decimal",
    normalizedAnswer: answer,
  });
}

function makeDecimalMultiplyIntegerProblem() {
  const left = makeDecimalNumber(120);
  const right = randomInt(2, 9);
  const answer = formatDecimal(left * right);
  return makeProblem(formatDecimal(left), OPERATORS.multiply, right, answer, {
    answerType: "decimal",
    normalizedAnswer: answer,
  });
}

function makeFractionProblem(operator, options = {}) {
  const sameDenominator = options.sameDenominator ?? false;
  const allowMixed = options.allowMixed ?? false;
  const leftWhole = allowMixed ? randomInt(0, 2) : 0;
  const rightWhole = allowMixed ? randomInt(0, 2) : 0;
  const commonDenominator = randomInt(3, 12);
  const left = sameDenominator ? makeFraction(randomInt(1, commonDenominator - 1), commonDenominator) : randomFraction();
  const right = sameDenominator ? makeFraction(randomInt(1, commonDenominator - 1), commonDenominator) : randomFraction();
  const leftNumerator = leftWhole * left.denominator + left.numerator;
  const rightNumerator = rightWhole * right.denominator + right.numerator;
  const leftText = leftWhole > 0 ? `${leftWhole} ${left.text}` : left.text;
  const rightText = rightWhole > 0 ? `${rightWhole} ${right.text}` : right.text;

  if (operator === OPERATORS.add) {
    const numerator = leftNumerator * right.denominator + rightNumerator * left.denominator;
    const denominator = left.denominator * right.denominator;
    return makeProblem(leftText, operator, rightText, fractionToString(numerator, denominator), {
      answerType: "fraction",
      normalizedAnswer: fractionToString(numerator, denominator),
    });
  }

  if (operator === OPERATORS.subtract) {
    const leftValue = leftNumerator / left.denominator;
    const rightValue = rightNumerator / right.denominator;
    const first = leftValue >= rightValue ? { numerator: leftNumerator, denominator: left.denominator, text: leftText } : { numerator: rightNumerator, denominator: right.denominator, text: rightText };
    const second = leftValue >= rightValue ? { numerator: rightNumerator, denominator: right.denominator, text: rightText } : { numerator: leftNumerator, denominator: left.denominator, text: leftText };
    const numerator = first.numerator * second.denominator - second.numerator * first.denominator;
    const denominator = first.denominator * second.denominator;
    return makeProblem(first.text, operator, second.text, fractionToString(numerator, denominator), {
      answerType: "fraction",
      normalizedAnswer: fractionToString(numerator, denominator),
    });
  }

  if (operator === OPERATORS.multiply) {
    const numerator = leftNumerator * rightNumerator;
    const denominator = left.denominator * right.denominator;
    return makeProblem(leftText, operator, rightText, fractionToString(numerator, denominator), {
      answerType: "fraction",
      normalizedAnswer: fractionToString(numerator, denominator),
    });
  }

  const numerator = leftNumerator * right.denominator;
  const denominator = left.denominator * rightNumerator;
  return makeProblem(leftText, operator, rightText, fractionToString(numerator, denominator), {
    answerType: "fraction",
    normalizedAnswer: fractionToString(numerator, denominator),
  });
}

function makeFractionTimesIntegerProblem() {
  const fraction = randomFraction();
  const integer = randomInt(2, 9);
  return makeProblem(fraction.text, OPERATORS.multiply, integer, fractionToString(fraction.numerator * integer, fraction.denominator), {
    answerType: "fraction",
    normalizedAnswer: fractionToString(fraction.numerator * integer, fraction.denominator),
  });
}

function makeFractionDivideIntegerProblem() {
  const fraction = randomFraction();
  const integer = randomInt(2, 9);
  return makeProblem(fraction.text, OPERATORS.divide, integer, fractionToString(fraction.numerator, fraction.denominator * integer), {
    answerType: "fraction",
    normalizedAnswer: fractionToString(fraction.numerator, fraction.denominator * integer),
  });
}

function generateOneProblem(stepId) {
  switch (Number(stepId)) {
    case 4:
      return makeAddProblem(100);
    case 5:
      return makeSubtractProblem(10, 20, 1, 9);
    case 6:
      return makeSubtractProblem(10, 99, 1, 9);
    case 7:
      return makeSubtractProblem(10, 99, 10, 99);
    case 8:
      return makeStep8Problem();
    case 9:
      return makeStep9Problem();
    case 10:
      return makeMultiplyProblem(1, 9, 1, 9);
    case 11:
      return makeMultiplyProblem(10, 99, 2, 9);
    case 12:
      return makeMultiplyProblem(100, 999, 2, 9);
    case 13:
      return makeMultiplyProblem(1000, 9999, 2, 9);
    case 14:
      return makeStep14Problem();
    case 15:
      return makeMultiplyProblem(10, 99, 10, 99);
    case 16:
      return makeExactDivisionProblem(1, 9, 1, 9);
    case 17:
      return makeExactDivisionByDividend(2, 9, 10, 99);
    case 18:
      return makeRemainderDivisionProblem();
    case 19:
      return makeExactDivisionByDividend(2, 9, 100, 999);
    case 20:
      return makeExactDivisionByDividend(2, 9, 1000, 9999);
    case 21:
      return makeStep21Problem();
    case 22:
      return makeStep22Problem();
    case 23:
      return makeDecimalProblem(OPERATORS.add);
    case 24:
      return makeDecimalProblem(OPERATORS.subtract);
    case 25:
      return Math.random() < 0.5 ? makeDecimalProblem(OPERATORS.add) : makeDecimalProblem(OPERATORS.subtract);
    case 26:
      return makeDecimalMultiplyIntegerProblem();
    case 33:
      return Math.random() < 0.5
        ? makeFractionProblem(OPERATORS.add, { sameDenominator: true })
        : makeFractionProblem(OPERATORS.subtract, { sameDenominator: true });
    case 34:
      return Math.random() < 0.5 ? makeFractionProblem(OPERATORS.add) : makeFractionProblem(OPERATORS.subtract);
    case 35:
      return Math.random() < 0.5
        ? makeFractionProblem(OPERATORS.add, { allowMixed: true })
        : makeFractionProblem(OPERATORS.subtract, { allowMixed: true });
    case 36:
      return makeFractionTimesIntegerProblem();
    case 37:
      return makeFractionProblem(OPERATORS.multiply);
    case 38:
      return makeFractionDivideIntegerProblem();
    case 39:
      return makeFractionProblem(OPERATORS.divide);
    case 40: {
      const operators = [OPERATORS.add, OPERATORS.subtract, OPERATORS.multiply, OPERATORS.divide];
      return makeFractionProblem(operators[randomInt(0, operators.length - 1)]);
    }
    default:
      throw new Error(`未知关卡：${stepId}`);
  }
}

export function generateProblems(stepId, count = 10) {
  getStep(stepId);
  const problems = [];
  const seen = new Set();
  const maxAttempts = count * 80;
  let attempts = 0;

  while (problems.length < count && attempts < maxAttempts) {
    attempts += 1;
    const problem = generateOneProblem(stepId);
    if (!seen.has(problem.id)) {
      seen.add(problem.id);
      problems.push(problem);
    }
  }

  if (problems.length < count) {
    throw new Error("题目生成失败，请减少题量或调整关卡范围。");
  }

  return problems;
}

function normalizeAnswer(value, answerType = "integer") {
  const trimmed = String(value ?? "").trim();

  if (answerType === "quotientRemainder") {
    const normalized = trimmed
      .replace(/\s+/g, "")
      .replace(/[，,]/g, "...")
      .replace(/余/g, "...")
      .replace(/r/gi, "...");
    const match = normalized.match(/^(-?\d+)(?:\.\.\.|…)(-?\d+)$/);
    return match ? `${Number(match[1])}...${Number(match[2])}` : normalized;
  }

  if (answerType === "decimal") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? formatDecimal(numeric) : trimmed;
  }

  if (answerType === "fraction") {
    const compact = trimmed.replace(/\s+/g, "");
    if (/^-?\d+$/.test(compact)) return compact;
    const match = compact.match(/^(-?\d+)\/(-?\d+)$/);
    if (!match) return compact;
    return fractionToString(Number(match[1]), Number(match[2]));
  }

  return trimmed;
}

export function evaluateAttempt(problems, answers, threshold = 9) {
  const items = problems.map((problem, index) => {
    const rawAnswer = answers[index] ?? "";
    const trimmedAnswer = String(rawAnswer).trim();
    const expectedAnswer = String(problem.normalizedAnswer ?? problem.answer);
    const normalizedStudentAnswer = normalizeAnswer(trimmedAnswer, problem.answerType);
    const normalizedExpectedAnswer = normalizeAnswer(expectedAnswer, problem.answerType);
    const numericAnswer = Number(trimmedAnswer);
    const isIntegerProblem = !["quotientRemainder", "decimal", "fraction"].includes(problem.answerType);
    const isValidInteger = trimmedAnswer !== "" && Number.isInteger(numericAnswer);
    const isCorrect = isIntegerProblem
      ? isValidInteger && numericAnswer === problem.answer
      : normalizedStudentAnswer === normalizedExpectedAnswer;

    return {
      problem,
      studentAnswer: trimmedAnswer,
      isCorrect,
    };
  });

  const correctCount = items.filter((item) => item.isCorrect).length;
  return {
    items,
    correctCount,
    totalCount: problems.length,
    isMastered: correctCount >= threshold,
    mistakes: items.filter((item) => !item.isCorrect),
  };
}
