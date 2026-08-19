import path from "node:path";
import { isSupportedSourceFile } from "./fileFilter.js";

/**
 * Normalizes a repository-relative path to use consistent forward slashes
 * and remove any leading/trailing slashes.
 *
 * @param {string} rawPath - Raw file path.
 * @returns {string} - Clean normalized path.
 */
export function normalizePath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return "";
  }
  return rawPath
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

/**
 * Sorts child nodes deterministically:
 * 1. Directories ("dir") come before Files ("file").
 * 2. Within the same type, entries are sorted alphabetically by name.
 *
 * @param {Array<object>} children - Array of file/folder nodes.
 * @returns {Array<object>} - Sorted array.
 */
export function sortTreeNodes(children) {
  return [...children].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

/**
 * Builds a deterministic hierarchical file and folder tree from a flat list of file/directory entries.
 *
 * Handles:
 * - Nested folders at arbitrary depth
 * - Root-level files and folders
 * - Automatic creation of implicit intermediate directories
 * - Deterministic deduplication of duplicate paths
 * - Preservation of file metadata (path, name, filename, extension, type, size, repositoryId, isSupportedSource)
 *
 * @param {Array<object|string>} entries - Array of file records or path strings.
 * @param {object} [options={}] - Options object.
 * @param {string} [options.repositoryId] - Associated repository ID.
 * @returns {Array<object>} - Array of root-level tree nodes with nested children.
 */
export function buildFileTree(entries = [], options = {}) {
  const repositoryId = options.repositoryId || null;

  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  // 1. Normalize and deduplicate entries by path
  const normalizedEntriesMap = new Map();

  for (const entry of entries) {
    const rawPath = typeof entry === "string" ? entry : entry.path;
    const cleanPath = normalizePath(rawPath);
    if (!cleanPath) continue;

    // If duplicate path encountered, prefer explicit file over dir or keep first valid
    if (normalizedEntriesMap.has(cleanPath)) {
      const existing = normalizedEntriesMap.get(cleanPath);
      if (typeof entry === "object" && existing.type === "dir" && entry.type === "file") {
        normalizedEntriesMap.set(cleanPath, entry);
      }
      continue;
    }

    normalizedEntriesMap.set(cleanPath, entry);
  }

  // 2. Build map of all nodes (ensuring parent directories exist)
  const nodeMap = new Map();
  const rootNodes = [];

  // Helper to ensure a directory node exists in nodeMap
  const ensureDirectoryNode = (dirPath) => {
    const normDirPath = normalizePath(dirPath);
    if (!normDirPath) return null;

    if (nodeMap.has(normDirPath)) {
      return nodeMap.get(normDirPath);
    }

    const dirBaseName = path.posix.basename(normDirPath);
    const dirNode = {
      name: dirBaseName,
      filename: dirBaseName,
      path: normDirPath,
      extension: null,
      type: "dir",
      size: 0,
      repositoryId,
      isSupportedSource: false,
      children: [],
    };

    nodeMap.set(normDirPath, dirNode);

    // Recursively link to parent directory or root
    const parentPath = path.posix.dirname(normDirPath);
    if (parentPath === "." || parentPath === "") {
      rootNodes.push(dirNode);
    } else {
      const parentDirNode = ensureDirectoryNode(parentPath);
      if (parentDirNode && !parentDirNode.children.some((c) => c.path === dirNode.path)) {
        parentDirNode.children.push(dirNode);
      }
    }

    return dirNode;
  };

  // Process all normalized entries
  for (const [cleanPath, entry] of normalizedEntriesMap.entries()) {
    const isExplicitDir = typeof entry === "object" && entry.type === "dir";
    const baseName = path.posix.basename(cleanPath);
    const parentPath = path.posix.dirname(cleanPath);
    const isRootLevel = parentPath === "." || parentPath === "";

    if (isExplicitDir) {
      ensureDirectoryNode(cleanPath);
      continue;
    }

    const ext = path.posix.extname(cleanPath) || null;
    const size = (typeof entry === "object" && typeof entry.size === "number") ? entry.size : 0;
    const entryRepoId = (typeof entry === "object" && entry.repositoryId) ? entry.repositoryId : repositoryId;

    const fileNode = {
      name: baseName,
      filename: baseName,
      path: cleanPath,
      extension: ext,
      type: "file",
      size,
      repositoryId: entryRepoId,
      isSupportedSource: isSupportedSourceFile(cleanPath),
    };

    nodeMap.set(cleanPath, fileNode);

    if (isRootLevel) {
      rootNodes.push(fileNode);
    } else {
      const parentDirNode = ensureDirectoryNode(parentPath);
      if (parentDirNode && !parentDirNode.children.some((c) => c.path === fileNode.path)) {
        parentDirNode.children.push(fileNode);
      }
    }
  }

  // 3. Recursively sort all children deterministically
  const sortRecursively = (nodes) => {
    const sorted = sortTreeNodes(nodes);
    for (const node of sorted) {
      if (node.type === "dir" && Array.isArray(node.children)) {
        node.children = sortRecursively(node.children);
      }
    }
    return sorted;
  };

  return sortRecursively(rootNodes);
}

/**
 * Searches a file tree to locate a node by its repository relative path.
 *
 * @param {Array<object>} tree - Hierarchical file tree array.
 * @param {string} targetPath - Relative target path.
 * @returns {object|null} - Found node or null.
 */
export function findNodeByPath(tree, targetPath) {
  const cleanTarget = normalizePath(targetPath);
  if (!cleanTarget || !Array.isArray(tree)) {
    return null;
  }

  for (const node of tree) {
    if (node.path === cleanTarget) {
      return node;
    }
    if (node.type === "dir" && Array.isArray(node.children)) {
      const found = findNodeByPath(node.children, cleanTarget);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Flattens a hierarchical file tree into a single flat array of all nodes.
 *
 * @param {Array<object>} tree - Hierarchical file tree array.
 * @returns {Array<object>} - Flat array of nodes.
 */
export function flattenTree(tree) {
  if (!Array.isArray(tree)) {
    return [];
  }

  const result = [];
  const traverse = (nodes) => {
    for (const node of nodes) {
      result.push(node);
      if (node.type === "dir" && Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  };

  traverse(tree);
  return result;
}

/**
 * Retrieves the direct child nodes of a given directory in the tree.
 *
 * @param {Array<object>} tree - Hierarchical file tree array.
 * @param {string} dirPath - Directory path (empty string or "/" for root children).
 * @returns {Array<object>} - Direct child nodes.
 */
export function getDirectoryChildren(tree, dirPath = "") {
  const cleanDir = normalizePath(dirPath);
  if (!cleanDir) {
    return tree;
  }

  const dirNode = findNodeByPath(tree, cleanDir);
  if (dirNode && dirNode.type === "dir" && Array.isArray(dirNode.children)) {
    return dirNode.children;
  }

  return [];
}

export default {
  normalizePath,
  sortTreeNodes,
  buildFileTree,
  findNodeByPath,
  flattenTree,
  getDirectoryChildren,
};
