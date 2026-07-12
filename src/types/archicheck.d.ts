export interface ComplexityAnalysis {
  score: number;
  linesAdded: number;
  linesRemoved: number;
  isAgentic: boolean;
  confidence: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  targetFile: string;
  codeSnippet: string;
  rationale: string;
}

export interface QuizPayload {
  questions: QuizQuestion[];
}

export type QuizStatus = 'pending' | 'success' | 'failed' | 'bypassed';

export interface QuizState {
  prId: number;
  commitSha: string;
  prAuthor: string; // The GitHub username of the PR creator
  status: QuizStatus;
  quizPayload: QuizPayload;
  userAnswers?: string[];
  validatedAt?: string;
  bypassReason?: string;
}

export interface TokenCounts {
  input: number;
  output: number;
  total: number;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  reasoning: string;
  tokens: TokenCounts;
}

