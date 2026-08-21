import { parseGitHubUrl, GitHubUrlError } from "../utils/githubUrl.js";
import { isSupportedSourceFile } from "../utils/fileFilter.js";
import { extractTarStream } from "../utils/tarExtractor.js";

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
    this.rawBaseUrl = options.rawBaseUrl || "https://raw.githubusercontent.com";
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

  /**
   * Fetches raw text content of a single source file from GitHub.
   *
   * @param {string} owner - Repository owner.
   * @param {string} name - Repository name.
   * @param {string} [branch="main"] - Target branch.
   * @param {string} filePath - Repository-relative file path.
   * @param {object} [options={}] - Options (e.g. timeoutMs, signal).
   * @returns {Promise<string>}
   */
  async fetchRawFileContent(owner, name, branch = "main", filePath = "", options = {}) {
    const cleanPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const encodedPath = cleanPath
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    const rawUrl = `${this.rawBaseUrl}/${owner}/${name}/${encodeURIComponent(branch)}/${encodedPath}`;

    const headers = {
      "User-Agent": "RepoLens-Analyzer",
    };

    const timeoutMs = options.timeoutMs || 3500;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // If caller provided an external abort signal, listen to it
    const externalSignal = options.signal;
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new GitHubApiError(`Operation aborted before fetching "${cleanPath}"`, 504);
      }
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }

    try {
      const res = await this.fetchFn(rawUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }

      if (!res.ok) {
        throw new GitHubApiError(`Failed to fetch raw file "${cleanPath}" (${res.status}): ${res.statusText}`, res.status);
      }

      return await res.text();
    } catch (err) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
      if (err.name === "AbortError" || controller.signal.aborted) {
        throw new GitHubApiError(`Timeout fetching raw file "${cleanPath}" after ${timeoutMs}ms`, 504);
      }
      throw err;
    }
  }

  /**
   * Fetches multiple source files in parallel using bounded concurrency and Promise.allSettled.
   *
   * @param {string} owner - Repository owner.
   * @param {string} name - Repository name.
   * @param {string} [branch="main"] - Target branch.
   * @param {Array<string>} [targetPaths=[]] - File paths to fetch.
   * @param {object} [options={}] - Concurrency and timeout options.
   * @returns {Promise<Map<string, string>>}
   */
  async fetchRawFilesParallel(owner, name, branch = "main", targetPaths = [], options = {}) {
    const fileMap = new Map();
    const pathsToFetch = targetPaths.slice(0, options.maxRawFiles || 300);
    const concurrency = options.concurrency || 16;
    const perFileTimeout = options.rawFileTimeoutMs || 3500;
    const batchTotalTimeoutMs = options.batchTotalTimeoutMs || 15000;

    const batchController = new AbortController();
    const batchTimeoutId = setTimeout(() => {
      batchController.abort();
    }, batchTotalTimeoutMs);

    try {
      for (let i = 0; i < pathsToFetch.length; i += concurrency) {
        if (batchController.signal.aborted) break;
        const chunk = pathsToFetch.slice(i, i + concurrency);
        await Promise.allSettled(
          chunk.map(async (filePath) => {
            try {
              const content = await this.fetchRawFileContent(owner, name, branch, filePath, {
                timeoutMs: perFileTimeout,
                signal: batchController.signal,
                ...options,
              });
              if (typeof content === "string") {
                fileMap.set(filePath, content);
              }
            } catch {
              // Promise.allSettled guarantees one failed file never fails the batch
            }
          }),
        );
      }
    } finally {
      clearTimeout(batchTimeoutId);
    }

    return fileMap;
  }

  /**
   * Fetches repository source files for static analysis using an intelligent strategy:
   * 1. Sparse/non-JS repositories (<= 50 supported files): fetches supported files directly in parallel from raw CDN,
   *    avoiding multi-minute downloads of massive multi-hundred-megabyte non-JS/TS archives (e.g. Java, Python, monorepos).
   * 2. Large supported repositories (> 50 supported files): attempts 1 single archive tarball stream with an 8-second timeout,
   *    and automatically falls back cleanly to bounded parallel raw fetching if tarball streaming is unavailable or slow.
   *
   * @param {string} owner - Repository owner.
   * @param {string} name - Repository name.
   * @param {string} [branch="main"] - Target branch.
   * @param {Array<string>} [supportedPaths=[]] - Known supported file paths.
   * @param {object} [options={}] - Options.
   * @returns {Promise<Map<string, string>>} - Map of relative path -> source content.
   */
  async fetchRepositorySourceFiles(owner, name, branch = "main", supportedPaths = [], options = {}) {
    const supportedSet = new Set(supportedPaths.map((p) => p.replace(/\\/g, "/").replace(/^\/+/, "")));
    const shouldExtract = (p) => {
      if (supportedSet.size > 0) {
        return supportedSet.has(p);
      }
      return isSupportedSourceFile(p);
    };

    const sparseThreshold = options.sparseThreshold !== undefined ? options.sparseThreshold : 50;

    // Strategy 1: Sparse repository (<= 50 files) -> fetch directly in parallel via raw files
    if (supportedPaths.length > 0 && supportedPaths.length <= sparseThreshold) {
      return await this.fetchRawFilesParallel(owner, name, branch, supportedPaths, options);
    }

    // Strategy 2: Large supported repository (> 50 files) -> try bounded tarball streaming
    const tarballTimeoutMs = options.tarballTimeoutMs || 8000;
    try {
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoLens-Analyzer",
      };
      if (this.token) {
        headers.Authorization = `token ${this.token}`;
      }

      const archiveUrl = `${this.apiBaseUrl}/repos/${owner}/${name}/tarball/${encodeURIComponent(branch)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), tarballTimeoutMs);

      const res = await this.fetchFn(archiveUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (res.ok && res.body) {
        const fileMap = await extractTarStream(res.body, shouldExtract, {
          ...options,
          timeoutMs: tarballTimeoutMs,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (fileMap && fileMap.size > 0) {
          return fileMap;
        }
      } else {
        clearTimeout(timeoutId);
      }
    } catch {
      // Tarball download or extraction timed out or failed -> fall back cleanly to parallel raw fetching
    }

    // Fallback: Bounded-concurrency raw file fetching
    return await this.fetchRawFilesParallel(owner, name, branch, supportedPaths, options);
  }
}

export const githubService = new GitHubService();
export default githubService;


