import { parseGitHubUrl, GitHubUrlError } from "../utils/githubUrl.js";

/**
 * Custom error for GitHub API interactions.
 */
export class GitHubApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "GitHubApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class GitHubService {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || "https://api.github.com";
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.token = options.token || process.env.GITHUB_TOKEN || null;
  }

  /**
   * Validates a GitHub repository URL and retrieves basic metadata.
   *
   * @param {string} url - GitHub repository URL.
   * @returns {Promise<{ valid: boolean, repository: object }>}
   */
  async validateAndFetchRepository(url) {
    // 1. Parse and validate URL structure
    const parsed = parseGitHubUrl(url);
    const { owner, name, cleanUrl } = parsed;

    // 2. Fetch repository metadata from GitHub REST API
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoLens-Analyzer",
    };

    if (this.token) {
      headers.Authorization = `token ${this.token}`;
    }

    let response;
    try {
      response = await this.fetchFn(`${this.apiBaseUrl}/repos/${owner}/${name}`, {
        method: "GET",
        headers,
      });
    } catch (networkErr) {
      throw new GitHubApiError(
        `Failed to reach GitHub API: ${networkErr.message}`,
        502,
        networkErr,
      );
    }

    // 3. Handle response status codes
    if (response.status === 404) {
      throw new GitHubApiError(
        `Repository "${owner}/${name}" not found on GitHub. Please check the URL and ensure the repository is public.`,
        404,
      );
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers?.get?.("x-ratelimit-remaining");
      if (remaining === "0" || response.status === 429) {
        throw new GitHubApiError(
          "GitHub API rate limit exceeded. Please try again in a few minutes.",
          429,
        );
      }
      throw new GitHubApiError(
        `GitHub API access forbidden: ${response.statusText || "Forbidden"}`,
        403,
      );
    }

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub API returned error (${response.status}): ${response.statusText || "Unknown error"}`,
        response.status >= 500 ? 502 : response.status,
      );
    }

    const data = await response.json();

    // Reject private repositories if returned with a token
    if (data.private) {
      throw new GitHubApiError(
        `Repository "${owner}/${name}" is private. RepoLens currently supports public repositories only.`,
        400,
      );
    }

    // 4. Return clean, normalized metadata
    return {
      valid: true,
      repository: {
        owner: data.owner?.login || owner,
        name: data.name || name,
        fullName: data.full_name || `${owner}/${name}`,
        githubUrl: data.html_url || cleanUrl,
        description: data.description || "",
        defaultBranch: data.default_branch || "main",
        language: data.language || null,
        stars: data.stargazers_count ?? 0,
        forks: data.forks_count ?? 0,
        openIssues: data.open_issues_count ?? 0,
        size: data.size ?? 0,
        isPrivate: data.private ?? false,
        isArchived: data.archived ?? false,
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
        pushedAt: data.pushed_at || null,
      },
    };
  }

  /**
   * Fetches the complete recursive file tree of a repository branch.
   *
   * @param {string} owner - Repository owner login.
   * @param {string} name - Repository name.
   * @param {string} [branch="main"] - Target branch or ref.
   * @returns {Promise<Array<{ path: string, type: string, size?: number, sha: string }>>}
   */
  async fetchRepositoryTree(owner, name, branch = "main") {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoLens-Analyzer",
    };

    if (this.token) {
      headers.Authorization = `token ${this.token}`;
    }

    let response;
    try {
      response = await this.fetchFn(
        `${this.apiBaseUrl}/repos/${owner}/${name}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        {
          method: "GET",
          headers,
        },
      );
    } catch (networkErr) {
      throw new GitHubApiError(
        `Failed to reach GitHub API while fetching tree: ${networkErr.message}`,
        502,
        networkErr,
      );
    }

    if (response.status === 404 || response.status === 409) {
      // Could be an empty repository without commits
      return [];
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers?.get?.("x-ratelimit-remaining");
      if (remaining === "0" || response.status === 429) {
        throw new GitHubApiError(
          "GitHub API rate limit exceeded. Please try again in a few minutes.",
          429,
        );
      }
      throw new GitHubApiError(
        `GitHub API access forbidden: ${response.statusText || "Forbidden"}`,
        403,
      );
    }

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub API tree retrieval failed (${response.status}): ${response.statusText || "Unknown error"}`,
        response.status >= 500 ? 502 : response.status,
      );
    }

    const data = await response.json();
    const tree = Array.isArray(data.tree) ? data.tree : [];
    const MAX_TREE_ENTRIES = 5000;
    return tree.slice(0, MAX_TREE_ENTRIES);
  }
}

export const githubService = new GitHubService();
export default githubService;

