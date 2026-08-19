import path from "node:path";

/**
 * Standard source code extensions tried during extensionless module resolution.
 */
export const RESOLUTION_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

/**
 * Standard index file names tried during directory module resolution.
 */
export const INDEX_FILES = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "index.mjs",
  "index.cjs",
];

/**
 * Normalizes a path string to forward slashes without leading or trailing slashes.
 *
 * @param {string} p - Path string.
 * @returns {string}
 */
export function normalizePath(p) {
  if (!p || typeof p !== "string") return "";
  return p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

/**
 * Extracts the base package name from an import source.
 * Handles scoped packages (@scope/pkg) and subpath imports (pkg/subpath).
 *
 * @param {string} source - Import source string (e.g. "@babel/parser/lib", "lodash/get").
 * @returns {string} - Package name (e.g. "@babel/parser", "lodash").
 */
export function extractPackageName(source) {
  if (!source || typeof source !== "string") return "";
  if (source.startsWith("node:")) return source;
  const parts = source.split("/");
  if (source.startsWith("@") && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

/**
 * Checks whether an import source string represents an external package dependency.
 *
 * @param {string} source - Import source.
 * @returns {boolean}
 */
export function isPackageImport(source) {
  if (!source || typeof source !== "string") return false;
  // Relative or absolute or alias imports are not bare packages
  if (source.startsWith(".") || source.startsWith("/") || source.startsWith("@/") || source.startsWith("~/") || source.startsWith("#/")) {
    return false;
  }
  return true;
}

/**
 * Builds a Map of normalized file paths for fast lookup.
 *
 * @param {Array<string|object>|Set<string>|Map<string, object>} availableFiles - List or map of repository files.
 * @returns {Map<string, object|boolean>}
 */
export function createFileLookupMap(availableFiles) {
  const map = new Map();
  if (!availableFiles) return map;

  if (availableFiles instanceof Map) {
    for (const [key, value] of availableFiles.entries()) {
      map.set(normalizePath(key), value);
    }
    return map;
  }

  if (availableFiles instanceof Set || Array.isArray(availableFiles)) {
    for (const item of availableFiles) {
      const p = typeof item === "string" ? item : item.path;
      if (p) {
        map.set(normalizePath(p), item);
      }
    }
  }

  return map;
}

/**
 * Resolves a single import source statement relative to an importing file.
 *
 * @param {string} sourceFilePath - Relative path of the importing file (e.g. "src/components/Button.tsx").
 * @param {string} importSource - Raw import string (e.g. "../utils/helper", "react", "@/config").
 * @param {Map<string, object>|Set<string>|Array<string|object>} availableFiles - Available repository files.
 * @param {object} [options={}] - Resolver options.
 * @param {Record<string, string>} [options.aliases={}] - Custom path aliases.
 * @returns {{
 *   rawSource: string,
 *   resolved: boolean,
 *   targetPath: string|null,
 *   targetFile: object|null,
 *   isExternal: boolean,
 *   packageName: string|null,
 *   unresolvedReason: string|null
 * }}
 */
export function resolveImport(sourceFilePath, importSource, availableFiles, options = {}) {
  const normSourceFile = normalizePath(sourceFilePath);
  const fileMap = availableFiles instanceof Map ? availableFiles : createFileLookupMap(availableFiles);

  if (!importSource || typeof importSource !== "string") {
    return {
      rawSource: importSource || "",
      resolved: false,
      targetPath: null,
      targetFile: null,
      isExternal: false,
      packageName: null,
      unresolvedReason: "invalid_source",
    };
  }

  const rawSource = importSource.trim();

  // 1. External package imports
  if (isPackageImport(rawSource)) {
    return {
      rawSource,
      resolved: false,
      targetPath: null,
      targetFile: null,
      isExternal: true,
      packageName: extractPackageName(rawSource),
      unresolvedReason: null,
    };
  }

  // 2. Resolve target candidate base path
  let candidateBase = "";
  const sourceDir = path.posix.dirname(normSourceFile);
  const aliases = options.aliases || { "@": "src", "~": "src" };

  if (rawSource.startsWith("./") || rawSource.startsWith("../")) {
    candidateBase = path.posix.normalize(path.posix.join(sourceDir === "." ? "" : sourceDir, rawSource));
  } else if (rawSource.startsWith("/")) {
    candidateBase = path.posix.normalize(rawSource.slice(1));
  } else {
    // Handle path aliases (e.g. "@/components/Header" -> "src/components/Header")
    let matchedAlias = false;
    for (const [aliasPrefix, aliasTarget] of Object.entries(aliases)) {
      const prefixWithSlash = aliasPrefix.endsWith("/") ? aliasPrefix : `${aliasPrefix}/`;
      if (rawSource.startsWith(prefixWithSlash) || rawSource === aliasPrefix) {
        const subPath = rawSource.slice(aliasPrefix.length).replace(/^\/+/, "");
        candidateBase = path.posix.normalize(path.posix.join(aliasTarget, subPath));
        matchedAlias = true;
        break;
      }
    }

    if (!matchedAlias) {
      // Fallback: unresolved
      return {
        rawSource,
        resolved: false,
        targetPath: null,
        targetFile: null,
        isExternal: false,
        packageName: null,
        unresolvedReason: "unknown_alias_or_path",
      };
    }
  }

  candidateBase = normalizePath(candidateBase);

  // 3. Generate candidate file paths to test against known repository files
  const candidates = [];

  // Direct match (e.g. exact file name or already has extension)
  candidates.push(candidateBase);

  // If import specified .js or .jsx, also try .ts / .tsx for TypeScript projects
  if (candidateBase.endsWith(".js")) {
    candidates.push(candidateBase.slice(0, -3) + ".ts");
    candidates.push(candidateBase.slice(0, -3) + ".tsx");
  } else if (candidateBase.endsWith(".jsx")) {
    candidates.push(candidateBase.slice(0, -4) + ".tsx");
  }

  // Try extension candidates
  for (const ext of RESOLUTION_EXTENSIONS) {
    candidates.push(`${candidateBase}${ext}`);
  }

  // Try index file candidates
  for (const idx of INDEX_FILES) {
    candidates.push(`${candidateBase}/${idx}`);
  }

  // 4. Test candidates against available files map
  for (const cand of candidates) {
    const normCand = normalizePath(cand);
    if (fileMap.has(normCand)) {
      const match = fileMap.get(normCand);
      return {
        rawSource,
        resolved: true,
        targetPath: normCand,
        targetFile: typeof match === "object" ? match : null,
        isExternal: false,
        packageName: null,
        unresolvedReason: null,
      };
    }
  }

  // 5. Unresolved local file
  return {
    rawSource,
    resolved: false,
    targetPath: null,
    targetFile: null,
    isExternal: false,
    packageName: null,
    unresolvedReason: "file_not_found",
  };
}

/**
 * Resolves all import statements for a given source file against available repository files.
 *
 * @param {string} sourceFilePath - Path of the importing file.
 * @param {Array<object>} astImports - Imports array from Phase 8 AST analysis.
 * @param {Map<string, object>|Set<string>|Array<string|object>} availableFiles - Available repository files.
 * @param {object} [options={}] - Options object.
 * @returns {{
 *   sourcePath: string,
 *   dependencies: Array<object>,
 *   resolvedFiles: Array<string>,
 *   externalPackages: Array<string>,
 *   unresolvedImports: Array<string>
 * }}
 */
export function resolveFileDependencies(sourceFilePath, astImports = [], availableFiles, options = {}) {
  const normSource = normalizePath(sourceFilePath);
  const fileMap = availableFiles instanceof Map ? availableFiles : createFileLookupMap(availableFiles);

  const dependencies = [];
  const resolvedFilesSet = new Set();
  const externalPackagesSet = new Set();
  const unresolvedImportsSet = new Set();

  for (const imp of astImports) {
    const rawSource = imp.source;
    const resolved = resolveImport(normSource, rawSource, fileMap, options);

    const depRecord = {
      rawSource,
      specifiers: imp.specifiers || [],
      startLine: imp.startLine || 1,
      endLine: imp.endLine || 1,
      resolved: resolved.resolved,
      targetPath: resolved.targetPath,
      targetFile: resolved.targetFile,
      isExternal: resolved.isExternal,
      packageName: resolved.packageName,
      unresolvedReason: resolved.unresolvedReason,
    };

    dependencies.push(depRecord);

    if (resolved.resolved && resolved.targetPath) {
      resolvedFilesSet.add(resolved.targetPath);
    } else if (resolved.isExternal && resolved.packageName) {
      externalPackagesSet.add(resolved.packageName);
    } else {
      unresolvedImportsSet.add(rawSource);
    }
  }

  return {
    sourcePath: normSource,
    dependencies,
    resolvedFiles: Array.from(resolvedFilesSet).sort(),
    externalPackages: Array.from(externalPackagesSet).sort(),
    unresolvedImports: Array.from(unresolvedImportsSet).sort(),
  };
}

/**
 * Detects circular dependency cycles in a file dependency graph.
 *
 * @param {Record<string, Array<string>>|Map<string, Array<string>>} dependencyGraph - Adjacency map of resolved dependencies.
 * @returns {Array<Array<string>>} - List of detected cycle paths (e.g. [["src/a.ts", "src/b.ts", "src/a.ts"]]).
 */
export function detectCircularDependencies(dependencyGraph) {
  const graph = dependencyGraph instanceof Map ? dependencyGraph : new Map(Object.entries(dependencyGraph || {}));
  const visited = new Set();
  const recursionStack = new Set();
  const currentPath = [];
  const detectedCycles = [];
  const cycleSignatures = new Set();

  const getCanonicalCycleSignature = (cycleNodes) => {
    // cycleNodes is e.g. [A, B, C]
    if (cycleNodes.length === 0) return "";
    // Find min element and rotate loop to start with min
    let minIdx = 0;
    for (let i = 1; i < cycleNodes.length; i++) {
      if (cycleNodes[i].localeCompare(cycleNodes[minIdx]) < 0) {
        minIdx = i;
      }
    }
    const rotated = [...cycleNodes.slice(minIdx), ...cycleNodes.slice(0, minIdx)];
    return rotated.join(" -> ");
  };

  const dfs = (node) => {
    visited.add(node);
    recursionStack.add(node);
    currentPath.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected: slice from neighbor to end of currentPath and add neighbor to close loop
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycleLoop = currentPath.slice(cycleStartIndex);
          const signature = getCanonicalCycleSignature(cycleLoop);

          if (!cycleSignatures.has(signature)) {
            cycleSignatures.add(signature);
            detectedCycles.push([...cycleLoop, neighbor]);
          }
        }
      }
    }

    currentPath.pop();
    recursionStack.delete(node);
  };

  const allNodes = Array.from(graph.keys()).sort();
  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  // Sort cycles deterministically
  return detectedCycles.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Builds a complete repository dependency graph from file AST analyses.
 *
 * @param {Array<{ path: string, imports: Array<object>, fileId?: string }>} fileAnalyses - Array of file AST analyses.
 * @param {Array<string|object>|Set<string>|Map<string, object>} availableFiles - Known repository files.
 * @param {object} [options={}] - Options object.
 * @returns {{
 *   totalFiles: number,
 *   fileDependencies: Array<object>,
 *   dependencyGraph: Record<string, Array<string>>,
 *   packages: Array<string>,
 *   unresolvedCount: number,
 *   cycles: Array<Array<string>>,
 *   hasCycles: boolean
 * }}
 */
export function buildRepositoryDependencyGraph(fileAnalyses = [], availableFiles, options = {}) {
  const fileMap = availableFiles instanceof Map ? availableFiles : createFileLookupMap(availableFiles);
  const fileDependencies = [];
  const dependencyGraph = {};
  const allPackages = new Set();
  let unresolvedCount = 0;

  for (const fileAnalysis of fileAnalyses) {
    const normPath = normalizePath(fileAnalysis.path);
    const resolved = resolveFileDependencies(normPath, fileAnalysis.imports || [], fileMap, options);

    fileDependencies.push({
      fileId: fileAnalysis.fileId || null,
      ...resolved,
    });

    dependencyGraph[normPath] = resolved.resolvedFiles;

    for (const pkg of resolved.externalPackages) {
      allPackages.add(pkg);
    }

    unresolvedCount += resolved.unresolvedImports.length;
  }

  const cycles = detectCircularDependencies(dependencyGraph);

  return {
    totalFiles: fileAnalyses.length,
    fileDependencies,
    dependencyGraph,
    packages: Array.from(allPackages).sort(),
    unresolvedCount,
    cycles,
    hasCycles: cycles.length > 0,
  };
}

export default {
  RESOLUTION_EXTENSIONS,
  INDEX_FILES,
  normalizePath,
  extractPackageName,
  isPackageImport,
  createFileLookupMap,
  resolveImport,
  resolveFileDependencies,
  detectCircularDependencies,
  buildRepositoryDependencyGraph,
};
