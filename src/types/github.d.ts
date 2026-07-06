export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  state: 'open' | 'closed';
  title: string;
  user: GitHubUser;
  body: string | null;
  created_at: string;
  updated_at: string;
  head: {
    sha: string;
    ref: string;
    repo: GitHubRepository;
  };
  base: {
    sha: string;
    ref: string;
    repo: GitHubRepository;
  };
}

export interface PullRequestEventPayload {
  action: 'opened' | 'synchronize' | 'edited' | 'reopened' | 'closed';
  number: number;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  sender: GitHubUser;
  installation?: {
    id: number;
  };
}

export interface IssueCommentEventPayload {
  action: 'created' | 'edited' | 'deleted';
  issue: {
    number: number;
    pull_request?: {
      url: string;
    };
  };
  comment: {
    id: number;
    body: string;
    user: GitHubUser;
  };
  repository: GitHubRepository;
  sender: GitHubUser;
  installation?: {
    id: number;
  };
}
