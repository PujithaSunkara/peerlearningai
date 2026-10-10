import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { IAssessmentQuestion } from '../models/AssessmentTask.js';
import { IQuestionEvaluation } from '../models/AssessmentAttempt.js';

const execFileAsync = promisify(execFile);

interface CodeTestCaseResult {
  description: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
}

async function runIsolatedJavaScriptTestCases(
  submittedCode: string,
  functionName: string,
  testCases: NonNullable<IAssessmentQuestion['testCases']>
): Promise<{ results: CodeTestCaseResult[]; syntaxError?: string }> {
  const results: CodeTestCaseResult[] = [];

  for (const tc of testCases) {
    try {
      const sandbox: Record<string, unknown> = {
        result: undefined,
      };
      vm.createContext(sandbox);

      const wrapperScript = `
        "use strict";
        ${submittedCode}
        const __args = ${tc.inputJson};
        const __fn = typeof ${functionName} === 'function' ? ${functionName} : null;
        if (!__fn) {
          throw new Error("Function '${functionName}' is not defined.");
        }
        result = Array.isArray(__args) ? __fn(...__args) : __fn(__args);
      `;

      const script = new vm.Script(wrapperScript);
      script.runInContext(sandbox, { timeout: 800 });

      const actualStr = JSON.stringify(sandbox.result);
      const expectedNormalized = JSON.stringify(JSON.parse(tc.expectedOutputJson));
      const passed = actualStr === expectedNormalized;

      results.push({
        description: tc.description,
        passed,
        actualOutput: actualStr ?? 'undefined',
        expectedOutput: expectedNormalized,
      });
    } catch (err) {
      const msg = (err as Error).message || 'Execution error';
      results.push({
        description: tc.description,
        passed: false,
        actualOutput: `Error: ${msg}`,
        expectedOutput: tc.expectedOutputJson,
      });
    }
  }

  return { results };
}

async function runIsolatedPythonTestCases(
  submittedCode: string,
  functionName: string,
  testCases: NonNullable<IAssessmentQuestion['testCases']>
): Promise<{ results: CodeTestCaseResult[] }> {
  const results: CodeTestCaseResult[] = [];

  for (const tc of testCases) {
    const pyRunner = `
import json, sys

${submittedCode}

if '${functionName}' not in globals():
    print(json.dumps({"error": "Function '${functionName}' is not defined."}))
    sys.exit(0)

fn = globals()['${functionName}']
args = json.loads(${JSON.stringify(tc.inputJson)})
try:
    res = fn(*args) if isinstance(args, list) else fn(args)
    print(json.dumps({"result": res}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    try {
      const { stdout } = await execFileAsync('python3', ['-I', '-c', pyRunner], {
        timeout: 1500,
        maxBuffer: 1024 * 64,
        env: { PATH: process.env.PATH },
      });

      const lastLine = stdout.trim().split('\n').pop() || '{}';
      const parsed = JSON.parse(lastLine);
      if (parsed.error) {
        results.push({
          description: tc.description,
          passed: false,
          actualOutput: `Error: ${parsed.error}`,
          expectedOutput: tc.expectedOutputJson,
        });
      } else {
        const actualStr = JSON.stringify(parsed.result);
        const expectedNormalized = JSON.stringify(JSON.parse(tc.expectedOutputJson));
        results.push({
          description: tc.description,
          passed: actualStr === expectedNormalized,
          actualOutput: actualStr,
          expectedOutput: expectedNormalized,
        });
      }
    } catch (err) {
      results.push({
        description: tc.description,
        passed: false,
        actualOutput: `Execution Timeout or Runtime Error: ${(err as Error).message}`,
        expectedOutput: tc.expectedOutputJson,
      });
    }
  }

  return { results };
}

export async function evaluateQuestionSubmission(
  question: IAssessmentQuestion,
  submittedAnswer: string
): Promise<IQuestionEvaluation> {
  const cleanAnswer = (submittedAnswer || '').trim();

  if (question.type === 'mcq') {
    const isCorrect =
      cleanAnswer.toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
    const earnedPoints = isCorrect ? question.points : 0;

    return {
      questionId: question.questionId,
      questionType: 'mcq',
      submittedAnswer: cleanAnswer,
      earnedPoints,
      maxPoints: question.points,
      isCorrect,
      feedback: isCorrect
        ? `Correct! ${question.explanation}`
        : `Incorrect. Expected "${question.correctAnswer}". ${question.explanation}`,
    };
  }

  if (question.type === 'short_answer') {
    const keywords = question.acceptableKeywords || [];
    const lowerAns = cleanAnswer.toLowerCase();
    let matchedCount = 0;

    for (const kw of keywords) {
      if (lowerAns.includes(kw.toLowerCase())) {
        matchedCount++;
      }
    }

    const ratio = keywords.length > 0 ? matchedCount / keywords.length : 0;
    const hasReasonableLength = cleanAnswer.split(/\s+/).length >= 5;

    let earnedPoints = 0;
    if (ratio >= 0.6 && hasReasonableLength) {
      earnedPoints = question.points;
    } else if (ratio >= 0.3) {
      earnedPoints = Math.round(question.points * 0.5);
    }

    const isCorrect = earnedPoints === question.points;
    return {
      questionId: question.questionId,
      questionType: 'short_answer',
      submittedAnswer: cleanAnswer,
      earnedPoints,
      maxPoints: question.points,
      isCorrect,
      feedback: isCorrect
        ? `Well explained (${matchedCount}/${keywords.length} key technical concepts covered). ${question.explanation}`
        : `Partial or missing key concepts (${matchedCount}/${keywords.length} matched). Expected references to: ${keywords.join(', ')}. ${question.explanation}`,
    };
  }

  // Coding challenge evaluation with 3-part Rubric:
  // 1. Correctness (60%) — Test cases passed in isolated sandbox
  // 2. Logic & Approach (20%) — Structural control flow, edge-case checks, algorithmic pattern
  // 3. Code Quality / Explanation (20%) — Modular syntax, descriptive naming, or inline comments
  const testCases = question.testCases || [];
  const fnName = question.functionName || 'solution';

  const { results } =
    question.language === 'python'
      ? await runIsolatedPythonTestCases(cleanAnswer, fnName, testCases)
      : await runIsolatedJavaScriptTestCases(cleanAnswer, fnName, testCases);

  const passedCount = results.filter((r) => r.passed).length;
  const passRatio = testCases.length > 0 ? passedCount / testCases.length : 0;

  const correctnessMax = question.points * 0.6;
  const logicMax = question.points * 0.2;
  const qualityMax = question.points * 0.2;

  const correctnessPoints = Math.round(correctnessMax * passRatio * 10) / 10;

  // Logic & Approach heuristic
  const hasControlOrReturn = /\b(return|if|for|while|map|filter|reduce|def|function)\b/.test(cleanAnswer);
  const logicPoints =
    passRatio > 0
      ? logicMax
      : hasControlOrReturn && cleanAnswer.length > 35
      ? Math.round(logicMax * 0.5 * 10) / 10
      : 0;

  // Code Quality heuristic
  const hasCleanFormatting =
    cleanAnswer.split('\n').length >= 3 &&
    !/\b(eval|var)\b/.test(cleanAnswer) &&
    cleanAnswer.length > 25;
  const qualityPoints =
    passRatio > 0 && hasCleanFormatting
      ? qualityMax
      : hasCleanFormatting
      ? Math.round(qualityMax * 0.5 * 10) / 10
      : 0;

  const earnedPoints = Math.min(
    question.points,
    Math.round(correctnessPoints + logicPoints + qualityPoints)
  );
  const isCorrect = passedCount === testCases.length && testCases.length > 0;

  return {
    questionId: question.questionId,
    questionType: 'coding',
    submittedAnswer: cleanAnswer,
    earnedPoints,
    maxPoints: question.points,
    isCorrect,
    rubricBreakdown: {
      correctness: correctnessPoints,
      logicAndApproach: logicPoints,
      codeQualityOrExplanation: qualityPoints,
    },
    testResults: results,
    feedback: `Passed ${passedCount}/${testCases.length} isolated test cases. Rubric: Correctness ${correctnessPoints}/${correctnessMax} pts · Logic & Approach ${logicPoints}/${logicMax} pts · Code Quality ${qualityPoints}/${qualityMax} pts. ${question.explanation}`,
  };
}
