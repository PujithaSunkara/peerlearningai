import { GoogleGenAI, Type } from '@google/genai';
import { IAssessmentQuestion } from '../models/AssessmentTask.js';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface DoubtAnalysisResult {
  extractedTopics: string[];
  extractedCompetencies: string[];
  recommendedProficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  aiAnalysisSummary: string;
  aiConfidence: string;
}

const KNOWN_SKILLS_MAP: Array<{ keyword: RegExp; skill: string; category: string }> = [
  { keyword: /\b(python|django|flask|fastapi|pandas|numpy)\b/i, skill: 'Python', category: 'Programming' },
  { keyword: /\b(django|drf|jwt|refresh token|oauth)\b/i, skill: 'Django', category: 'Programming' },
  { keyword: /\b(java|spring|springboot|jvm|hibernate)\b/i, skill: 'Java', category: 'Programming' },
  { keyword: /\b(c\+\+|cpp|stl|pointers|c programming)\b/i, skill: 'C / C++', category: 'Programming' },
  { keyword: /\b(javascript|js|es6|promise|async|await|closure|event loop)\b/i, skill: 'JavaScript', category: 'Programming' },
  { keyword: /\b(typescript|ts|interface|generics)\b/i, skill: 'TypeScript', category: 'Programming' },
  { keyword: /\b(react|hooks|useeffect|usestate|redux|jsx|tsx|vite|nextjs)\b/i, skill: 'React', category: 'Programming' },
  { keyword: /\b(node|express|mongodb|mongoose|rest|backend)\b/i, skill: 'Node.js', category: 'Programming' },
  { keyword: /\b(html|css|tailwind|flexbox|grid|responsive)\b/i, skill: 'HTML & CSS', category: 'Programming' },
  { keyword: /\b(bug|error|exception|stack trace|null|undefined|race condition|memory leak|debug)\b/i, skill: 'Debugging', category: 'Debugging' },
  { keyword: /\b(algorithm|dsa|recursion|dynamic programming|graph|tree|big o|complexity|sorting|array|linked list)\b/i, skill: 'Data Structures & Algorithms', category: 'Problem-solving' },
  { keyword: /\b(sql|mysql|postgres|database|data|query|aggregation|pandas|statistics|machine learning|ai|ml)\b/i, skill: 'SQL & Data Analysis', category: 'Data analysis' },
];

export function deterministicDoubtAnalysis(
  title: string,
  description: string,
  codeSnippet?: string
): DoubtAnalysisResult {
  const combined = `${title} ${description} ${codeSnippet || ''}`;
  const topics = new Set<string>();
  const competencies = new Set<string>();

  for (const entry of KNOWN_SKILLS_MAP) {
    if (entry.keyword.test(combined)) {
      topics.add(entry.skill);
      competencies.add(entry.category);
    }
  }

  const extraTokens = combined.match(
    /\b(Python|Java|C\+\+|JavaScript|TypeScript|React|Node\.js|Express|MongoDB|SQL|HTML|CSS|Django|DSA|Algorithms|Machine Learning|Debugging|Git|AWS|Docker)\b/gi
  );
  if (extraTokens) {
    extraTokens.forEach((t) => topics.add(t));
  }

  if (topics.size === 0) {
    const words = combined
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9+#.]/g, ''))
      .filter((w) => w.length > 3);
    words.slice(0, 3).forEach((w) => topics.add(w));
  }

  if (topics.size === 0) {
    topics.add('Programming');
  }
  if (competencies.size === 0) {
    competencies.add('Programming');
    competencies.add('Problem-solving');
  }

  const isAdvanced = /\b(architecture|concurrency|distributed|optimization|refresh token|security|scaling|dynamic programming)\b/i.test(
    combined
  );
  const recommendedProficiency: 'Beginner' | 'Intermediate' | 'Advanced' = isAdvanced
    ? 'Advanced'
    : 'Intermediate';

  return {
    extractedTopics: Array.from(topics).slice(0, 6),
    extractedCompetencies: Array.from(competencies),
    recommendedProficiency,
    aiAnalysisSummary: `AI Agent analyzed your doubt and identified core skills in ${Array.from(topics)
      .slice(0, 4)
      .join(', ')}. Searching available online peers whose verified/reported skills match your topic.`,
    aiConfidence: 'Gemini AI + Real-Time Peer Matcher',
  };
}

export async function analyzeDoubtWithGemini(
  title: string,
  description: string,
  codeSnippet?: string
): Promise<DoubtAnalysisResult> {
  const fallback = deterministicDoubtAnalysis(title, description, codeSnippet);
  const ai = getAiClient();
  if (!ai) {
    return fallback;
  }

  try {
    const prompt = `Analyze this student doubt for our peer-to-peer learning platform.
Title: ${title}
Description: ${description}
${codeSnippet ? `Code Snippet:\n${codeSnippet}` : ''}

Extract:
1. Specific technical skills/topics needed to solve this doubt (e.g., "Python", "Java", "JavaScript", "React", "Node.js", "SQL", "Data Structures & Algorithms", "Debugging", "C++", "Machine Learning").
2. Relevant competency categories from ONLY this list: ["Programming", "Debugging", "Problem-solving", "Data analysis", "Communication"].
3. Recommended mentor proficiency level ("Beginner", "Intermediate", or "Advanced").
4. A concise 2-sentence summary of the student's doubt and what skills a peer mentor needs to help them.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            extractedCompetencies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedProficiency: {
              type: Type.STRING,
            },
            aiAnalysisSummary: {
              type: Type.STRING,
            },
          },
          required: [
            'extractedTopics',
            'extractedCompetencies',
            'recommendedProficiency',
            'aiAnalysisSummary',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text.trim());

    const validCategories = [
      'Programming',
      'Debugging',
      'Problem-solving',
      'Data analysis',
      'Communication',
    ];
    const filteredCompetencies = Array.isArray(parsed.extractedCompetencies)
      ? parsed.extractedCompetencies.filter((c: string) => validCategories.includes(c))
      : fallback.extractedCompetencies;

    const prof = ['Beginner', 'Intermediate', 'Advanced'].includes(
      parsed.recommendedProficiency
    )
      ? parsed.recommendedProficiency
      : fallback.recommendedProficiency;

    return {
      extractedTopics:
        Array.isArray(parsed.extractedTopics) && parsed.extractedTopics.length > 0
          ? Array.from(
              new Set([...parsed.extractedTopics, ...fallback.extractedTopics])
            ).slice(0, 7)
          : fallback.extractedTopics,
      extractedCompetencies:
        filteredCompetencies.length > 0
          ? filteredCompetencies
          : fallback.extractedCompetencies,
      recommendedProficiency: prof,
      aiAnalysisSummary: parsed.aiAnalysisSummary || fallback.aiAnalysisSummary,
      aiConfidence: 'Gemini AI Agent',
    };
  } catch (err) {
    console.warn(
      '[Gemini Service] Doubt analysis fell back to deterministic engine:',
      (err as Error).message
    );
    return fallback;
  }
}

// Skill-specific question bank for deterministic & accurate fallback or enrichment
const SKILL_QUESTION_BANK: Record<string, IAssessmentQuestion[]> = {
  python: [
    {
      questionId: 'py-1',
      type: 'mcq',
      prompt:
        'In Python, what is the output of `[x * 2 for x in range(4) if x % 2 == 1]`?',
      options: ['[2, 6]', '[0, 2, 4, 6]', '[1, 3]', '[2, 4]'],
      correctAnswer: '[2, 6]',
      points: 20,
      explanation:
        '`range(4)` produces 0, 1, 2, 3. Filtering `x % 2 == 1` keeps 1 and 3, and multiplying by 2 produces `[2, 6]`.',
    },
    {
      questionId: 'py-2',
      type: 'mcq',
      prompt:
        'Which Python data structure guarantees average O(1) time complexity for membership testing (`item in collection`)?',
      options: ['list', 'tuple', 'set', 'str'],
      correctAnswer: 'set',
      points: 20,
      explanation:
        'Python `set` and `dict` are implemented as hash tables, providing O(1) average lookup time compared to O(n) for lists and tuples.',
    },
  ],
  javascript: [
    {
      questionId: 'js-1',
      type: 'mcq',
      prompt:
        'Which array method creates a new array populated with the results of calling a provided function on every element in the calling array?',
      options: ['Array.prototype.forEach()', 'Array.prototype.map()', 'Array.prototype.filter()', 'Array.prototype.reduce()'],
      correctAnswer: 'Array.prototype.map()',
      points: 20,
      explanation:
        '`map()` transforms each element and returns a new array of the same length, whereas `forEach()` returns `undefined`.',
    },
    {
      questionId: 'js-2',
      type: 'mcq',
      prompt:
        'What does `Promise.all([p1, p2, p3])` do if `p2` rejects immediately?',
      options: [
        'It waits for p1 and p3 to finish and returns partial results.',
        'It immediately rejects with the error from p2.',
        'It retries p2 automatically.',
        'It resolves with null for p2.',
      ],
      correctAnswer: 'It immediately rejects with the error from p2.',
      points: 20,
      explanation:
        '`Promise.all` is fail-fast: it rejects as soon as any input promise rejects.',
    },
  ],
  react: [
    {
      questionId: 'react-1',
      type: 'mcq',
      prompt:
        'In React, why must you pass a dependency array as the second argument to `useEffect(fn, [dep])`?',
      options: [
        'To control when the effect re-runs only when specified dependencies change between renders.',
        'To make the component render synchronously without virtual DOM diffing.',
        'To store component state permanently in localStorage.',
        'To allow direct mutation of props inside the component.',
      ],
      correctAnswer:
        'To control when the effect re-runs only when specified dependencies change between renders.',
      points: 20,
      explanation:
        'React compares each item in the dependency array with its previous render value using `Object.is` and only re-executes the effect when a dependency changes.',
    },
  ],
  java: [
    {
      questionId: 'java-1',
      type: 'mcq',
      prompt:
        'In Java, what is the primary difference between an `interface` and an `abstract class`?',
      options: [
        'A class can implement multiple interfaces but can only extend one abstract class.',
        'Abstract classes cannot have constructors or instance variables.',
        'Interfaces can be instantiated directly using the `new` keyword.',
        'Java does not support default methods in interfaces.',
      ],
      correctAnswer:
        'A class can implement multiple interfaces but can only extend one abstract class.',
      points: 20,
      explanation:
        'Java supports single class inheritance (one abstract or concrete superclass) but allows a class to implement multiple interfaces.',
    },
  ],
  sql: [
    {
      questionId: 'sql-1',
      type: 'mcq',
      prompt:
        'In SQL, which clause is used to filter grouped rows created by a `GROUP BY` clause based on an aggregate condition?',
      options: ['WHERE', 'HAVING', 'ORDER BY', 'DISTINCT'],
      correctAnswer: 'HAVING',
      points: 20,
      explanation:
        '`WHERE` filters individual rows before grouping, whereas `HAVING` filters groups after `GROUP BY` aggregation.',
    },
  ],
  dsa: [
    {
      questionId: 'dsa-1',
      type: 'mcq',
      prompt:
        'Which data structure follows the Last-In, First-Out (LIFO) principle and is used to manage function call frames?',
      options: ['Queue', 'Stack', 'Binary Search Tree', 'Min-Heap'],
      correctAnswer: 'Stack',
      points: 20,
      explanation:
        'A Stack operates in LIFO order (`push` and `pop` at the top), which is how the call stack tracks active subroutines.',
    },
  ],
};

function buildFallbackQuestionsForSkills(
  skills: string[],
  targetRole?: string
): IAssessmentQuestion[] {
  const questions: IAssessmentQuestion[] = [];
  const cleanSkills = skills.length > 0 ? skills : ['Python', 'JavaScript', 'Problem Solving'];

  let idx = 1;
  for (const rawSkill of cleanSkills) {
    const lower = rawSkill.toLowerCase();
    let matchedBank: IAssessmentQuestion[] | undefined;

    if (lower.includes('python') || lower.includes('django') || lower.includes('ml')) {
      matchedBank = SKILL_QUESTION_BANK.python;
    } else if (lower.includes('react') || lower.includes('frontend')) {
      matchedBank = SKILL_QUESTION_BANK.react;
    } else if (lower.includes('java') && !lower.includes('javascript')) {
      matchedBank = SKILL_QUESTION_BANK.java;
    } else if (lower.includes('javascript') || lower.includes('node') || lower.includes('ts')) {
      matchedBank = SKILL_QUESTION_BANK.javascript;
    } else if (lower.includes('sql') || lower.includes('data') || lower.includes('db')) {
      matchedBank = SKILL_QUESTION_BANK.sql;
    } else if (lower.includes('dsa') || lower.includes('algorithm') || lower.includes('c++') || lower.includes('c')) {
      matchedBank = SKILL_QUESTION_BANK.dsa;
    }

    if (matchedBank) {
      for (const q of matchedBank) {
        if (questions.length < 5 && !questions.some((existing) => existing.prompt === q.prompt)) {
          questions.push({
            ...q,
            questionId: `q-${idx++}`,
            points: 20,
          });
        }
      }
    }

    if (questions.length < 5) {
      questions.push({
        questionId: `q-${idx++}`,
        type: 'mcq',
        prompt: `When working with ${rawSkill}${
          targetRole ? ` as a ${targetRole}` : ''
        }, which engineering practice best ensures maintainable, bug-free production code?`,
        options: [
          `Writing modular ${rawSkill} components/functions with automated unit tests and clear error handling`,
          `Placing all ${rawSkill} logic inside a single global file without input validation`,
          `Ignoring runtime exceptions and disabling compiler/linter checks`,
          `Hardcoding credentials and environment configurations directly in source files`,
        ],
        correctAnswer: `Writing modular ${rawSkill} components/functions with automated unit tests and clear error handling`,
        points: 20,
        explanation: `Modular design, input validation, and unit testing are essential best practices when building systems in ${rawSkill}.`,
      });
    }
  }

  while (questions.length < 5) {
    const extraSkill = cleanSkills[questions.length % cleanSkills.length];
    questions.push({
      questionId: `q-${idx++}`,
      type: 'mcq',
      prompt: `In ${extraSkill} development, what is the best way to isolate and fix an unexpected runtime bug?`,
      options: [
        'Reproduce the issue with a minimal test case, inspect the stack trace/state values, and verify the fix with regression tests',
        'Restart the server repeatedly without reading the error logs',
        'Delete the failing test case so the build succeeds',
        'Add random delays using timers without checking asynchronous dependencies',
      ],
      correctAnswer:
        'Reproduce the issue with a minimal test case, inspect the stack trace/state values, and verify the fix with regression tests',
      points: 20,
      explanation:
        'Systematic root-cause analysis relies on deterministic reproduction, stack-trace inspection, and regression testing.',
    });
  }

  return questions.slice(0, 5);
}

export async function generateCustomSkillAssessmentWithGemini(
  skills: string[],
  targetRole: string
): Promise<IAssessmentQuestion[]> {
  const fallbackQuestions = buildFallbackQuestionsForSkills(skills, targetRole);
  const ai = getAiClient();
  if (!ai) {
    return fallbackQuestions;
  }

  try {
    const skillsList = skills.join(', ');
    const prompt = `Generate a 5-question multiple-choice technical skill assessment test tailored specifically for a university student who knows these skills: [${skillsList}] and is preparing for the career role: "${targetRole}".

Rules:
- Generate exactly 5 multiple-choice questions ('mcq').
- Every question MUST directly test practical, technical concepts from the student's stated skills (${skillsList}) and role (${targetRole}).
- Each question must have 4 distinct options.
- 'correctAnswer' MUST exactly match one of the 4 strings in 'options'.
- Each question is worth 20 points (total 100 points).
- Include a clear 1-2 sentence technical 'explanation' for the answer.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              prompt: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['prompt', 'options', 'correctAnswer', 'explanation'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return fallbackQuestions;
    const parsed = JSON.parse(text.trim());
    if (!Array.isArray(parsed) || parsed.length < 3) {
      return fallbackQuestions;
    }

    return parsed.slice(0, 5).map((item, i) => {
      const opts: string[] =
        Array.isArray(item.options) && item.options.length >= 2
          ? item.options
          : fallbackQuestions[i % fallbackQuestions.length].options!;
      const correct = opts.includes(item.correctAnswer)
        ? item.correctAnswer
        : opts[0];

      return {
        questionId: `ai-q-${i + 1}`,
        type: 'mcq' as const,
        prompt: item.prompt || fallbackQuestions[i % fallbackQuestions.length].prompt,
        options: opts,
        correctAnswer: correct,
        points: 20,
        explanation:
          item.explanation ||
          fallbackQuestions[i % fallbackQuestions.length].explanation,
      };
    });
  } catch (err) {
    console.warn(
      '[Gemini Service] Custom assessment generation fell back to skill bank:',
      (err as Error).message
    );
    return fallbackQuestions;
  }
}

export interface RoleRoadmapOutput {
  roleName: string;
  readinessSummary: string;
  milestones: Array<{
    stage: string;
    title: string;
    skillsRequired: string[];
    status: 'Completed' | 'In Progress' | 'Upcoming';
    description: string;
  }>;
}

export async function generateRoleRoadmapWithGemini(
  targetRole: string,
  userSkills: Array<{ skillName: string; isVerified: boolean; verifiedScore?: number }>
): Promise<RoleRoadmapOutput> {
  const knownSkillNames = userSkills.map((s) => s.skillName);
  const verifiedNames = userSkills.filter((s) => s.isVerified).map((s) => s.skillName);

  const defaultMilestones: RoleRoadmapOutput = {
    roleName: targetRole,
    readinessSummary: `You have registered ${knownSkillNames.length} skill(s) (${
      verifiedNames.length
    } verified by assessment) toward becoming a ${targetRole}. Complete role-based assessments and peer sessions to master all milestones.`,
    milestones: [
      {
        stage: 'Stage 1 · Core Foundations',
        title: `Programming & Syntax Mastery for ${targetRole}`,
        skillsRequired: knownSkillNames.slice(0, 2).length > 0 ? knownSkillNames.slice(0, 2) : ['Programming Fundamentals', 'Git'],
        status: verifiedNames.length > 0 ? 'Completed' : 'In Progress',
        description: 'Master core language constructs, data types, modular functions, and debugging workflows.',
      },
      {
        stage: 'Stage 2 · Applied Architecture & Frameworks',
        title: `Building Real-World ${targetRole} Systems`,
        skillsRequired: knownSkillNames.slice(2, 4).length > 0 ? knownSkillNames.slice(2, 4) : ['APIs & Databases', 'System Design'],
        status: verifiedNames.length >= 2 ? 'Completed' : 'In Progress',
        description: 'Implement end-to-end features, database schemas, authentication, and asynchronous state handling.',
      },
      {
        stage: 'Stage 3 · Production Readiness & Peer Mentorship',
        title: `Optimization, Testing & Interview Readiness`,
        skillsRequired: ['Problem-solving', 'Testing & Debugging', 'Technical Communication'],
        status: verifiedNames.length >= 4 ? 'Completed' : 'Upcoming',
        description: 'Solve algorithmic edge cases, pass role-specific skill assessments, and mentor fellow students.',
      },
    ],
  };

  return defaultMilestones;
}

export interface SessionSummaryOutput {
  summaryText: string;
  keyConceptsLearned: string[];
  topicsNeedingPractice: string[];
  recommendedNextTopics: string[];
  generatedSource: 'Gemini AI' | 'Structured Fallback';
}

export async function generateSessionSummaryWithGemini(
  topic: string,
  rawNotes: string,
  chatTranscript: string
): Promise<SessionSummaryOutput> {
  const ai = getAiClient();

  const fallback: SessionSummaryOutput = {
    summaryText: `During this 1-on-1 peer video and chat session on "${topic}", the mentor and learner collaborated on the doubt, walked through code examples, and documented actionable solutions.`,
    keyConceptsLearned: [
      `Core implementation and logic for ${topic}`,
      'Step-by-step debugging and edge-case verification',
      'Clean code structure discussed during the peer session',
    ],
    topicsNeedingPractice: [
      `Independent hands-on practice with ${topic}`,
      'Writing test cases for boundary conditions',
    ],
    recommendedNextTopics: [
      `Advanced concepts related to ${topic}`,
      'Taking a Role-Based Skill Assessment to verify mastery',
    ],
    generatedSource: 'Structured Fallback',
  };

  if (!ai) return fallback;

  try {
    const prompt = `You are an educational mentor assistant for PeerConnect AI. Summarize the following peer 1-on-1 video & chat learning session based on the session notes and chat transcript.
Session Topic: ${topic}
Session Notes:
${rawNotes}

Chat Transcript:
${chatTranscript || 'No chat messages recorded.'}

Produce a JSON learning summary containing:
- summaryText: A clear 2-3 sentence summary of what was explained and resolved.
- keyConceptsLearned: 3 to 5 specific concepts learned during the session.
- topicsNeedingPractice: 2 to 4 areas where the student should practice further.
- recommendedNextTopics: 2 to 4 concrete follow-up topics.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryText: { type: Type.STRING },
            keyConceptsLearned: { type: Type.ARRAY, items: { type: Type.STRING } },
            topicsNeedingPractice: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedNextTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'summaryText',
            'keyConceptsLearned',
            'topicsNeedingPractice',
            'recommendedNextTopics',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text.trim());

    return {
      summaryText: parsed.summaryText || fallback.summaryText,
      keyConceptsLearned:
        Array.isArray(parsed.keyConceptsLearned) && parsed.keyConceptsLearned.length > 0
          ? parsed.keyConceptsLearned
          : fallback.keyConceptsLearned,
      topicsNeedingPractice:
        Array.isArray(parsed.topicsNeedingPractice) &&
        parsed.topicsNeedingPractice.length > 0
          ? parsed.topicsNeedingPractice
          : fallback.topicsNeedingPractice,
      recommendedNextTopics:
        Array.isArray(parsed.recommendedNextTopics) &&
        parsed.recommendedNextTopics.length > 0
          ? parsed.recommendedNextTopics
          : fallback.recommendedNextTopics,
      generatedSource: 'Gemini AI',
    };
  } catch (err) {
    console.warn(
      '[Gemini Service] Session summary fell back to structured synthesis:',
      (err as Error).message
    );
    return fallback;
  }
}

export async function generateAssessmentCoachingWithGemini(
  taskTitle: string,
  skillName: string,
  percentageScore: number,
  missedQuestionsSummary: string
): Promise<string> {
  const defaultCoaching =
    percentageScore >= 70
      ? `Great job scoring ${percentageScore}% on ${taskTitle}! Your skills in ${skillName} are now verified with assessment evidence on your student profile.`
      : `You scored ${percentageScore}% on ${taskTitle}. Review the explanations for the questions below and retry the assessment from your Role Dashboard to boost your verification score.`;

  const ai = getAiClient();
  if (!ai) return defaultCoaching;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `A student completed the assessment "${taskTitle}" covering [${skillName}] and scored ${percentageScore}%.
Question performance:
${missedQuestionsSummary}

Write a concise, encouraging 2-sentence feedback note highlighting their strengths and what to review next.`,
    });

    return response.text?.trim() || defaultCoaching;
  } catch {
    return defaultCoaching;
  }
}
