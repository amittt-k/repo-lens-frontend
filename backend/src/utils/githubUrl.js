/**
 * Custom error for invalid GitHub URL formats.
 */
export class GitHubUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = "GitHubUrlError";
    this.statusCode = 400;
  }
}

/**
 * Validates and parses a GitHub repository URL.
 * Accepts formats:
 * - https://github.com/owner/repo
 * - http://github.com/owner/repo
 * - github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/
 *
 * @param {string} inputUrl - The raw URL string provided by user.
 * @returns {{ owner: string, name: string, fullName: string, cleanUrl: string }}
 * @throws {GitHubUrlError}
 */
export function parseGitHubUrl(inputUrl) {
  if (typeof inputUrl !== "string") {
    throw new GitHubUrlError("A repository URL is required.");
  }

  let trimmed = inputUrl.trim();
  if (!trimmed) {
    throw new GitHubUrlError("A repository URL cannot be empty.");
  }

  // Prepend https:// if protocol is omitted
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new GitHubUrlError("Invalid URL format.");
  }

  // Validate hostname
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    throw new GitHubUrlError("Only public GitHub repositories (github.com) are supported.");
  }

  // Normalize pathname: remove leading/trailing slashes and .git suffix
  let pathname = parsed.pathname.replace(/^\/+|\/+$/g, "");
  if (pathname.endsWith(".git")) {
    pathname = pathname.slice(0, -4);
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length !== 2) {
    throw new GitHubUrlError(
      "Invalid GitHub repository URL. Expected format: https://github.com/owner/repository",
    );
  }

  const [owner, name] = segments;

  // Validate owner and name format (alphanumeric, hyphens, underscores, dots)
  const validNameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!validNameRegex.test(owner) || !validNameRegex.test(name)) {
    throw new GitHubUrlError("Invalid characters in GitHub owner or repository name.");
  }

  return {
    owner,
    name,
    fullName: `${owner}/${name}`,
    cleanUrl: `https://github.com/${owner}/${name}`,
  };
}

export default parseGitHubUrl;
