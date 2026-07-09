import { describe, it, expect, vi, afterEach } from 'vitest';
import { MockLLMProvider } from '@/lib/llm/mock_llm';
import fs from 'fs';

describe('MockLLMProvider Unit Tests', () => {
  const provider = new MockLLMProvider();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a structured mock quiz payload containing questions', async () => {
    const quiz = await provider.generateQuiz('some-diff');
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[0].id).toBe('q1');
    expect(quiz.questions[0].question).toContain('architectural purpose');
    expect(quiz.questions[1].id).toBe('q2');
    expect(quiz.questions[1].question).toContain('bypassing API endpoints');
  });

  it('should reject validations if answer justification is 20 characters or less', async () => {
    const mockQuiz = {
      questions: [{ id: 'q1', question: 'Q', targetFile: 'F', codeSnippet: 'C', rationale: 'R' }]
    };
    const result = await provider.validateAnswers('some-diff', mockQuiz, ['Too short answer']);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(4);
    expect(result.reasoning).toContain('too brief');
  });

  it('should approve validations if answer justification is greater than 20 characters', async () => {
    const mockQuiz = {
      questions: [{ id: 'q1', question: 'Q', targetFile: 'F', codeSnippet: 'C', rationale: 'R' }]
    };
    const result = await provider.validateAnswers('some-diff', mockQuiz, ['This is a sufficiently long justification of over twenty characters.']);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(9);
    expect(result.reasoning).toContain('sufficiently detailed');
  });

  describe('Mock LLM Sandbox Configuration Routing', () => {
    it('should route to useState scenario when diff contains useState keyword', async () => {
      const mockDiff = 'diff --git a/file.tsx b/file.tsx\n+const [state, setState] = useState(0);';
      const p = new MockLLMProvider();
      const quiz = await p.generateQuiz(mockDiff);
      
      expect(quiz.questions).toHaveLength(1);
      expect(quiz.questions[0].question).toContain('useState state synchronization');
      
      // Test custom minimum length validation (25 characters)
      const resFail = await p.validateAnswers(mockDiff, quiz, ['Short answer']);
      expect(resFail.passed).toBe(false);
      
      const resPass = await p.validateAnswers(mockDiff, quiz, ['This justification is long enough to pass useState check.']);
      expect(resPass.passed).toBe(true);
    });

    it('should route to sql scenario and force fail validation', async () => {
      const mockDiff = 'diff --git a/query.ts b/query.ts\n+const sql = "SELECT * FROM users";';
      const p = new MockLLMProvider();
      const quiz = await p.generateQuiz(mockDiff);
      
      expect(quiz.questions).toHaveLength(1);
      expect(quiz.questions[0].question).toContain('SQL injection');
      
      // Test force fail validation
      const res = await p.validateAnswers(mockDiff, quiz, ['This is a very long and detailed answer that should normally pass but will fail due to force_fail.']);
      expect(res.passed).toBe(false);
      expect(res.reasoning).toContain('force validation failure');
    });

    it('should throw a fatal error when mock JSON is malformed', async () => {
      vi.spyOn(fs, 'existsSync').mockImplementation((pathStr: string) => pathStr.endsWith('.archicheck.mock.json'));
      vi.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid json }');
      
      const p = new MockLLMProvider();
      await expect(p.generateQuiz('some-diff')).rejects.toThrow('Archicheck Sandbox Error');
    });
  });
});
