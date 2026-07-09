import { describe, it, expect, vi } from 'vitest';
import { fetchRepositoryConfig } from '@/lib/github/configFetcher';

describe('Repository Config Fetcher Unit Tests', () => {
  it('should return yml content if .archicheck.yml exists', async () => {
    const mockGetContent = vi.fn().mockImplementation(({ path }) => {
      if (path === '.archicheck.yml') {
        return {
          data: {
            content: Buffer.from('lines_added_threshold: 150', 'utf8').toString('base64'),
            encoding: 'base64'
          }
        };
      }
      throw new Error('Not found');
    });

    const mockOctokit = {
      rest: {
        repos: {
          getContent: mockGetContent
        }
      }
    };

    const config = await fetchRepositoryConfig(mockOctokit, 'owner', 'repo', 'sha');
    expect(config).toBe('lines_added_threshold: 150');
    expect(mockGetContent).toHaveBeenCalledTimes(1);
    expect(mockGetContent.mock.calls[0][0].path).toBe('.archicheck.yml');
  });

  it('should fallback to .archicheck.yaml if .archicheck.yml is not found', async () => {
    const mockGetContent = vi.fn().mockImplementation(({ path }) => {
      if (path === '.archicheck.yml') {
        throw new Error('Not found');
      }
      if (path === '.archicheck.yaml') {
        return {
          data: {
            content: Buffer.from('lines_added_threshold: 250', 'utf8').toString('base64'),
            encoding: 'base64'
          }
        };
      }
      throw new Error('Not found');
    });

    const mockOctokit = {
      rest: {
        repos: {
          getContent: mockGetContent
        }
      }
    };

    const config = await fetchRepositoryConfig(mockOctokit, 'owner', 'repo', 'sha');
    expect(config).toBe('lines_added_threshold: 250');
    expect(mockGetContent).toHaveBeenCalledTimes(2);
    expect(mockGetContent.mock.calls[0][0].path).toBe('.archicheck.yml');
    expect(mockGetContent.mock.calls[1][0].path).toBe('.archicheck.yaml');
  });

  it('should return null if both .yml and .yaml are not found', async () => {
    const mockGetContent = vi.fn().mockRejectedValue(new Error('Not found'));

    const mockOctokit = {
      rest: {
        repos: {
          getContent: mockGetContent
        }
      }
    };

    const config = await fetchRepositoryConfig(mockOctokit, 'owner', 'repo', 'sha');
    expect(config).toBeNull();
    expect(mockGetContent).toHaveBeenCalledTimes(2);
  });
});
