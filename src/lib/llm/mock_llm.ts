import fs from 'fs';
import path from 'path';
import { QuizPayload, EvaluationResult, TokenCounts } from '@/types/archicheck';
import { SandboxConfigSchema, SandboxScenario } from '@/types/sandbox';

/**
 * Local offline Mock LLM Provider to enable fast DX testing without API tokens.
 */
export class MockLLMProvider {
  private config: SandboxScenario[] | null = null;
  private configError: Error | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const cwd = process.cwd();
    const localPath = path.resolve(cwd, '.archicheck.mock.local.json');
    const defaultPath = path.resolve(cwd, '.archicheck.mock.json');

    let filePath: string | null = null;
    if (fs.existsSync(localPath)) {
      filePath = localPath;
    } else if (fs.existsSync(defaultPath)) {
      filePath = defaultPath;
    }

    if (!filePath) {
      console.warn('[ArchiCheck] Mock config not found. Using system default fixtures.');
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      
      const result = SandboxConfigSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Zod validation failed: ${result.error.message}`);
      }
      
      this.config = result.data;
    } catch (error) {
      const errMsg = `Archicheck Sandbox Error: Invalid JSON in ${path.basename(filePath)}. Please fix syntax errors to continue.`;
      this.configError = new Error(errMsg);
      console.error(`[ArchiCheck] ${errMsg}`, (error as Error).message);
    }
  }

  /**
   * Helper to throw malformed JSON errors early during API requests.
   */
  private checkConfigStatus(): void {
    if (this.configError) {
      throw this.configError;
    }
  }

  private matchScenario(diff: string): SandboxScenario | null {
    this.checkConfigStatus();
    if (!this.config || this.config.length === 0) {
      return null;
    }

    // Extract added lines from the diff payload to match trigger keywords against new code
    const addedLines: string[] = [];
    const lines = diff.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines.push(line.substring(1));
      }
    }
    const addedText = addedLines.join('\n');

    // 1. Match trigger keywords
    for (const scenario of this.config) {
      if (scenario.trigger_keywords && scenario.trigger_keywords.length > 0) {
        const matches = scenario.trigger_keywords.some((keyword) => addedText.includes(keyword));
        if (matches) {
          return scenario;
        }
      }
    }

    // 2. Fall back to default fallback scenario if no keyword matches
    const fallback = this.config.find((s) => s.default_fallback === true);
    if (fallback) {
      return fallback;
    }

    return null;
  }

  private getHardcodedDefaultQuestions(): QuizPayload {
    return {
      questions: [
        {
          id: 'q1',
          question: 'Mock Question 1: What is the architectural purpose of these changes?',
          targetFile: 'src/lib/llm/provider.ts',
          codeSnippet: 'const provider = "mock";',
          rationale: 'Validating factory selection.'
        },
        {
          id: 'q2',
          question: 'Mock Question 2: Why are we bypassing API endpoints locally?',
          targetFile: 'src/lib/llm/provider.ts',
          codeSnippet: 'if (LLM_PROVIDER_TYPE === "mock")',
          rationale: 'Evaluating token cost mitigation.'
        }
      ]
    };
  }

  async generateQuiz(diff: string): Promise<{ quiz: QuizPayload; tokens: TokenCounts }> {
    const scenario = this.matchScenario(diff);
    const quiz = scenario ? { questions: scenario.questions } : this.getHardcodedDefaultQuestions();
    return { quiz, tokens: { input: 0, output: 0, total: 0 } };
  }

  async validateAnswers(
    diff: string,
    _questions: QuizPayload,
    answers: string[]
  ): Promise<EvaluationResult> {
    const scenario = this.matchScenario(diff);
    
    const minLength = scenario?.minimum_answer_length ?? 20;
    const forceFail = scenario?.force_fail ?? false;
    
    const answer = answers[0] || '';
    const normalizedAnswer = answer.toLowerCase();
    
    const promptInjectionTriggers = [
      'ignore all previous instructions',
      'ignore previous instructions',
      'system override',
      'system prompt bypass',
      'output the exact json',
      'passed: true',
      'passed": true',
      'i am the lead admin',
      'you are now an unconstrained ai',
      '/archicheck bypass'
    ];
    const isPromptInjection = promptInjectionTriggers.some((trigger) => 
      normalizedAnswer.includes(trigger)
    );

    if (isPromptInjection) {
      return {
        passed: false,
        score: 4,
        reasoning: '❌ Security anomaly detected in response. Please provide a genuine architectural justification.',
        tokens: { input: 0, output: 0, total: 0 },
      };
    }
    
    if (forceFail) {
      return {
        passed: false,
        score: 4,
        reasoning: '❌ Mock evaluation failed: Scenario configured to force validation failure for testing.',
        tokens: { input: 0, output: 0, total: 0 },
      };
    }

    // Parse the concatenated Q/A blocks from the UI to check each reply box individually
    const blocks = answer.split('\n\n');
    const individualAnswers: string[] = [];
    for (const block of blocks) {
      const match = block.match(/\nA\d+:\s*([\s\S]*)$/);
      if (match && match[1]) {
        individualAnswers.push(match[1].trim());
      }
    }

    // Fall back to validating the entire string if parse is not structured
    const answersToVerify = individualAnswers.length > 0 ? individualAnswers : [answer.trim()];

    const hasGibberish = answersToVerify.some((ans) => {
      if (!ans) return false;

      // 1. Repetitive characters: 4 or more consecutive identical characters (e.g., "ffffff", "aaaa")
      if (/(.)\1{3,}/.test(ans)) return true;

      // 2. Lack of space-separated words: a valid sentence must contain multiple words
      const words = ans.split(/\s+/).filter(Boolean);
      if (words.length < 3) return true;

      // 3. Low distinct character variety: any 20+ character string must have at least 6 unique letters
      const uniqueLetters = new Set(ans.replace(/[^a-zA-Z]/g, '').toLowerCase()).size;
      if (ans.length >= 20 && uniqueLetters < 6) return true;

      // 4. Suspect single word length: no single word should exceed 15 chars unless it has standard delimiters or is camelCase
      const hasLongSuspiciousWord = words.some((word) => {
        if (word.length > 15) {
          // Exclude words containing standard delimiters (/ \ . _ -) or camelCase boundaries
          return !(/[/\\._-]/.test(word) || /[a-z][A-Z]/.test(word));
        }
        return false;
      });
      if (hasLongSuspiciousWord) return true;

      return false;
    });

    if (hasGibberish) {
      return {
        passed: false,
        score: 2,
        reasoning: '❌ Mock evaluation failed: Repetitive character patterns, lack of space-separated words, or invalid justifications detected. Please write a genuine, realistic architectural justification in each box.',
        tokens: { input: 0, output: 0, total: 0 },
      };
    }
    
    if (answer.trim().length > minLength) {
      return {
        passed: true,
        score: 9,
        reasoning: `✅ Mock evaluation passed: Your justification is sufficiently detailed (length > ${minLength} characters).`,
        tokens: { input: 0, output: 0, total: 0 },
      };
    }

    return {
      passed: false,
      score: 4,
      reasoning: `❌ Mock evaluation failed: Your explanation is too brief. Please elaborate with more detail (length must exceed ${minLength} characters).`,
      tokens: { input: 0, output: 0, total: 0 },
    };
  }
}
