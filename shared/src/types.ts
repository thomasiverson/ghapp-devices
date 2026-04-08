export interface RepoTarget {
  owner: string;
  repo: string;
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  encoding: string;
}

export interface ReleaseAsset {
  name: string;
  size: number;
  data: Buffer;
}

export interface CreatedIssue {
  number: number;
  title: string;
  html_url: string;
}

export interface CommitResult {
  sha: string;
  path: string;
  html_url: string;
}

export interface TokenResponse {
  token: string;
  expires_at: string;
}
