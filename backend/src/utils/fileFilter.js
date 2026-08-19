import path from "node:path";

/**
 * Directories that must be ignored during repository ingestion.
 */
export const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".github",
  ".gitlab",
  "node_modules",
  "dist",
  "dist-ssr",
  "build",
  ".next",
  ".nuxt",
  ".nitro",
  ".output",
  ".vinxi",
  ".tanstack",
  ".wrangler",
  ".turbo",
  "coverage",
  ".nyc_output",
  "vendor",
  ".cache",
  ".idea",
  ".vscode",
  "out",
  "storybook-static",
  "tmp",
  "temp",
  ".svn",
  ".hg",
  ".venv",
  "__pycache__",
]);

/**
 * Ignored file patterns and exact names.
 */
export const IGNORED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.test",
  ".env.production",
  ".env.example",
  ".gitignore",
  ".gitattributes",
  ".npmignore",
  ".dockerignore",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "gemfile.lock",
  "composer.lock",
  ".ds_store",
  "thumbs.db",
]);

/**
 * Extensions for binaries, media, fonts, and assets that should be ignored.
 */
export const IGNORED_EXTENSIONS = new Set([
  // Images / Media
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".bmp",
  ".tiff",
  ".mp4",
  ".webm",
  ".ogg",
  ".mp3",
  ".wav",
  // Fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  // Archives / Binaries
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".rar",
  ".7z",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".iso",
  // Build / Maps
  ".map",
  ".min.js",
  ".min.css",
]);

/**
 * Supported initial source code extensions for deep code/AST analysis.
 */
export const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
]);

/**
 * Determines whether a given repository file path should be ingested.
 *
 * @param {string} filePath - Repository relative file path (e.g. "src/components/Button.tsx")
 * @param {string} [entryType="blob"] - GitHub tree entry type ("blob" or "tree")
 * @returns {boolean}
 */
export function shouldIngestFile(filePath, entryType = "blob") {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  // Normalize path separators to forward slashes
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalizedPath) {
    return false;
  }

  const segments = normalizedPath.split("/");
  const fileName = segments[segments.length - 1].toLowerCase();

  // Check if any ancestor folder or current folder is in the ignored list
  for (const segment of segments) {
    if (IGNORED_DIRECTORIES.has(segment.toLowerCase())) {
      return false;
    }
  }

  // Check if it's an exact ignored filename
  if (IGNORED_FILES.has(fileName)) {
    return false;
  }

  // Check if it starts with .env (e.g. .env.staging)
  if (fileName.startsWith(".env")) {
    return false;
  }

  // Check minified file suffixes
  if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css") || fileName.endsWith(".map")) {
    return false;
  }

  // Check ignored extensions for files
  if (entryType === "blob" || entryType === "file") {
    const ext = path.extname(fileName).toLowerCase();
    if (ext && IGNORED_EXTENSIONS.has(ext)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a file is a supported JavaScript/TypeScript source code file.
 *
 * @param {string} filePath - Repository relative file path.
 * @returns {boolean}
 */
export function isSupportedSourceFile(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_SOURCE_EXTENSIONS.has(ext);
}

export default {
  shouldIngestFile,
  isSupportedSourceFile,
  IGNORED_DIRECTORIES,
  IGNORED_FILES,
  IGNORED_EXTENSIONS,
  SUPPORTED_SOURCE_EXTENSIONS,
};
