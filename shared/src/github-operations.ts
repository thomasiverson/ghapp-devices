import { Octokit } from "@octokit/rest";
import type {
  FileContent,
  ReleaseAsset,
  CreatedIssue,
  CommitResult,
} from "./types.js";

function createClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

/**
 * Read a file from a repository via the Contents API.
 */
export async function readRepoContents(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<FileContent> {
  const octokit = createClient(token);
  const { data } = await octokit.repos.getContent({ owner, repo, path });

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`Path "${path}" is not a file`);
  }

  return {
    path: data.path,
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha: data.sha,
    encoding: data.encoding,
  };
}

/**
 * Download a release asset by tag and asset name.
 */
export async function downloadReleaseAsset(
  token: string,
  owner: string,
  repo: string,
  tag: string,
  assetName: string
): Promise<ReleaseAsset> {
  const octokit = createClient(token);

  const { data: release } = await octokit.repos.getReleaseByTag({
    owner,
    repo,
    tag,
  });

  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(
      `Asset "${assetName}" not found in release "${tag}". Available: ${release.assets.map((a) => a.name).join(", ")}`
    );
  }

  const response = await octokit.repos.getReleaseAsset({
    owner,
    repo,
    asset_id: asset.id,
    headers: { accept: "application/octet-stream" },
  });

  const data = response.data as unknown as ArrayBuffer;

  return {
    name: asset.name,
    size: asset.size,
    data: Buffer.from(data),
  };
}

/**
 * Create an issue in a repository.
 */
export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string
): Promise<CreatedIssue> {
  const octokit = createClient(token);
  const { data } = await octokit.issues.create({ owner, repo, title, body });

  return {
    number: data.number,
    title: data.title,
    html_url: data.html_url,
  };
}

/**
 * Create or update a single file via the Contents API (single-file commit).
 * If the file already exists, its SHA is fetched automatically for the update.
 */
export async function pushCommit(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
): Promise<CommitResult> {
  const octokit = createClient(token);

  // Check if the file already exists to get its SHA for updates
  let existingSha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data) && data.type === "file") {
      existingSha = data.sha;
    }
  } catch (err: any) {
    if (err.status !== 404) throw err;
    // File does not exist yet — will be created
  }

  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    ...(existingSha ? { sha: existingSha } : {}),
  });

  return {
    sha: data.commit.sha!,
    path,
    html_url: data.content?.html_url ?? "",
  };
}
