import { parseSourceCode } from "./astAnalyzer.js";

/**
 * Standard supported HTTP methods in Express and REST frameworks.
 */
export const SUPPORTED_HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "ALL",
  "HEAD",
  "OPTIONS",
]);

/**
 * Normalizes an API route path string.
 *
 * @param {string} rawPath - Raw path string (e.g. "users/", "/api//users/:id/").
 * @returns {string} - Normalized path (e.g. "/users", "/api/users/:id").
 */
export function normalizeRoutePath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return "/";
  let p = rawPath.trim().replace(/\\/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p;
}

/**
 * Combines a mount prefix with a route subpath.
 *
 * @param {string} prefix - Mount prefix (e.g. "/api/v1").
 * @param {string} subPath - Route subpath (e.g. "/users/:id").
 * @returns {string} - Combined path (e.g. "/api/v1/users/:id").
 */
export function combineRoutePaths(prefix, subPath) {
  const normPrefix = normalizeRoutePath(prefix);
  const normSub = normalizeRoutePath(subPath);

  if (normPrefix === "/") return normSub;
  if (normSub === "/") return normPrefix;

  return normalizeRoutePath(`${normPrefix}/${normSub.replace(/^\/+/, "")}`);
}

/**
 * Extracts handler name string from an AST argument node.
 *
 * @param {object} node - AST node representing handler.
 * @returns {string|null}
 */
function extractHandlerName(node) {
  if (!node || typeof node !== "object") return null;

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "MemberExpression") {
    const objName = node.object?.name || (node.object?.type === "ThisExpression" ? "this" : "");
    const propName = node.property?.name;
    if (objName && propName) return `${objName}.${propName}`;
    if (propName) return propName;
  }

  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    if (node.id?.name) return node.id.name;
    return "inline";
  }

  return null;
}

/**
 * Normalizes a file path.
 *
 * @param {string} p - Path.
 * @returns {string}
 */
function normalizePath(p) {
  if (!p || typeof p !== "string") return "";
  return p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

/**
 * Statically analyzes JavaScript/TypeScript AST to discover Express-style API routes,
 * mount prefixes, and client API calls.
 *
 * @param {Array<object>} fileDataList - List of files with { path, id, content, symbols, imports, dependencies }.
 * @param {object} [options={}] - Options.
 * @returns {{
 *   routes: Array<{
 *     id?: string,
 *     repositoryId?: string,
 *     method: string,
 *     path: string,
 *     fileId: string|null,
 *     filePath: string,
 *     handler: string|null,
 *     handlerSymbolId: string|null,
 *     startLine: number,
 *     endLine: number
 *   }>,
 *   relationships: Array<{
 *     sourceId: string,
 *     targetId: string,
 *     relationshipType: string,
 *     metadata: object
 *   }>
 * }}
 */
export function analyzeApiRoutes(fileDataList = [], options = {}) {
  const routes = [];
  const relationships = [];
  const routeKeySet = new Set();
  const relKeySet = new Set();

  // 1. Build lookup tables for files, symbols, and dependencies
  const fileByPath = new Map();
  const symbolMap = new Map();

  for (const f of fileDataList) {
    const normPath = normalizePath(f.path);
    fileByPath.set(normPath, f);

    const fileId = f.id || normPath;
    for (const sym of f.symbols || []) {
      const symId = sym.id || `${normPath}::${sym.name}::${sym.type}`;
      symbolMap.set(`${normPath}::${sym.name}`, { ...sym, resolvedId: symId, filePath: normPath, fileId });
      symbolMap.set(`${fileId}::${sym.name}`, { ...sym, resolvedId: symId, filePath: normPath, fileId });
    }
  }

  // Helper to resolve symbol across files
  const resolveSymbol = (sourceFilePath, sourceFileImports, symbolName) => {
    if (!symbolName) return null;
    const baseName = symbolName.includes(".") ? symbolName.split(".").pop() : symbolName;
    const normSource = normalizePath(sourceFilePath);

    // 1. Same-file symbol
    const sameFile = symbolMap.get(`${normSource}::${baseName}`);
    if (sameFile) return sameFile;

    // 2. Imported symbol
    for (const imp of sourceFileImports || []) {
      for (const spec of imp.specifiers || []) {
        if (spec.local === baseName || spec.local === symbolName.split(".")[0]) {
          const resolvedDep = (fileByPath.get(normSource)?.dependencies || []).find(
            (d) => d.rawSource === imp.source && d.resolved && d.targetPath,
          );
          if (resolvedDep && resolvedDep.targetPath) {
            const targetNorm = normalizePath(resolvedDep.targetPath);
            const targetImportedName = spec.imported === "default" ? "default" : (spec.local === baseName ? spec.imported : baseName);
            let targetSym = symbolMap.get(`${targetNorm}::${targetImportedName}`);
            if (!targetSym) {
              targetSym = symbolMap.get(`${targetNorm}::${baseName}`);
            }
            if (targetSym) return targetSym;
          }
        }
      }
    }

    return null;
  };

  // Helper to add relationship
  const addRelationship = (sourceId, targetId, relationshipType, metadata = {}) => {
    if (!sourceId || !targetId || !relationshipType) return;
    const key = `${sourceId}::${relationshipType}::${targetId}`;
    if (!relKeySet.has(key)) {
      relKeySet.add(key);
      relationships.push({
        sourceId,
        targetId,
        relationshipType,
        metadata,
      });
    }
  };

  // 2. Step 1: Detect router mounts (e.g. app.use("/api/users", userRouter))
  const routerMounts = new Map(); // key: routerVarName or imported path -> prefix

  for (const f of fileDataList) {
    if (!f.content) continue;
    let ast;
    try {
      ast = parseSourceCode(f.content);
    } catch {
      continue;
    }

    const visitMounts = (node) => {
      if (!node || typeof node !== "object") return;

      if (
        node.type === "CallExpression" &&
        node.callee?.type === "MemberExpression" &&
        node.callee.property?.name === "use" &&
        node.arguments?.length >= 2
      ) {
        const firstArg = node.arguments[0];
        const secondArg = node.arguments[1];

        if (firstArg.type === "StringLiteral" && secondArg.type === "Identifier") {
          const prefix = normalizeRoutePath(firstArg.value);
          const routerName = secondArg.name;
          routerMounts.set(routerName, prefix);
        }
      }

      for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "comments") continue;
        const val = node[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === "object") visitMounts(item);
          }
        } else if (val && typeof val === "object") {
          visitMounts(val);
        }
      }
    };

    if (ast.program?.body) {
      for (const stmt of ast.program.body) {
        visitMounts(stmt);
      }
    }
  }

  // 3. Step 2: Extract API routes
  for (const f of fileDataList) {
    if (!f.content) continue;
    const normPath = normalizePath(f.path);
    const fileId = f.id || normPath;
    const fileImports = f.imports || [];

    let ast;
    try {
      ast = parseSourceCode(f.content);
    } catch {
      continue;
    }

    const visitRoutes = (node) => {
      if (!node || typeof node !== "object") return;

      // Pattern 1: router.get('/path', ...handlers) or app.post('/path', ...handlers)
      if (
        node.type === "CallExpression" &&
        node.callee?.type === "MemberExpression" &&
        node.callee.property?.type === "Identifier"
      ) {
        const methodName = node.callee.property.name.toUpperCase();
        const objName = node.callee.object?.name || "";
        const clientCallNames = new Set([
          "axios",
          "http",
          "https",
          "fetch",
          "api",
          "request",
          "client",
          "apiClient",
          "supertest",
          "superagent",
          "got",
          "res",
          "req",
          "response",
          "console",
          "db",
          "prisma",
        ]);

        if (
          SUPPORTED_HTTP_METHODS.has(methodName) &&
          !clientCallNames.has(objName.toLowerCase()) &&
          node.arguments?.length >= 2
        ) {
          const firstArg = node.arguments[0];
          let routePathStr = null;

          if (firstArg.type === "StringLiteral") {
            routePathStr = firstArg.value;
          }

          if (routePathStr !== null) {
            // Check if this router was mounted with a prefix
            const prefix = routerMounts.get(objName) || "";
            const finalPath = prefix ? combineRoutePaths(prefix, routePathStr) : normalizeRoutePath(routePathStr);

            // Extract handlers (can be multiple middleware, last one is primary handler)
            let handlerName = null;
            let handlerNode = null;

            if (node.arguments.length > 1) {
              handlerNode = node.arguments[node.arguments.length - 1];
              handlerName = extractHandlerName(handlerNode);
            }

            const loc = node.loc || { start: { line: 1 }, end: { line: 1 } };
            const routeKey = `${fileId}::${methodName}::${finalPath}`;

            if (!routeKeySet.has(routeKey)) {
              routeKeySet.add(routeKey);

              const routeRecord = {
                id: `route-${fileId}-${methodName}-${finalPath.replace(/[^a-zA-Z0-9]/g, "_")}`,
                method: methodName,
                path: finalPath,
                fileId: f.id || null,
                filePath: normPath,
                handler: handlerName,
                handlerSymbolId: null,
                startLine: loc.start.line,
                endLine: loc.end.line,
              };

              // Resolve handler symbol if available
              if (handlerName && handlerName !== "inline") {
                const resolvedSym = resolveSymbol(normPath, fileImports, handlerName);
                if (resolvedSym) {
                  const symId = resolvedSym.resolvedId || resolvedSym.id;
                  routeRecord.handlerSymbolId = symId;

                  // Create HANDLES_ROUTE relationship: Handler Symbol -> ApiRoute
                  addRelationship(symId, routeRecord.id, "HANDLES_ROUTE", {
                    method: methodName,
                    path: finalPath,
                    handler: handlerName,
                    sourceFile: normPath,
                  });
                }
              }

              routes.push(routeRecord);
            }
          }
        }
      }

      // Pattern 2: router.route('/path').get(handler).post(handler) (Chained routes)
      if (
        node.type === "CallExpression" &&
        node.callee?.type === "MemberExpression" &&
        SUPPORTED_HTTP_METHODS.has(node.callee.property?.name?.toUpperCase())
      ) {
        let current = node.callee.object;
        let chainedPath = null;

        while (current && current.type === "CallExpression") {
          if (current.callee?.type === "MemberExpression" && current.callee.property?.name === "route") {
            if (current.arguments?.[0]?.type === "StringLiteral") {
              chainedPath = current.arguments[0].value;
            }
            break;
          }
          current = current.callee?.object;
        }

        if (chainedPath) {
          const methodName = node.callee.property.name.toUpperCase();
          const finalPath = normalizeRoutePath(chainedPath);
          const loc = node.loc || { start: { line: 1 }, end: { line: 1 } };
          const routeKey = `${fileId}::${methodName}::${finalPath}`;

          if (!routeKeySet.has(routeKey)) {
            routeKeySet.add(routeKey);

            let handlerName = null;
            if (node.arguments?.length >= 1) {
              handlerName = extractHandlerName(node.arguments[node.arguments.length - 1]);
            }

            const routeRecord = {
              id: `route-${fileId}-${methodName}-${finalPath.replace(/[^a-zA-Z0-9]/g, "_")}`,
              method: methodName,
              path: finalPath,
              fileId: f.id || null,
              filePath: normPath,
              handler: handlerName,
              handlerSymbolId: null,
              startLine: loc.start.line,
              endLine: loc.end.line,
            };

            if (handlerName && handlerName !== "inline") {
              const resolvedSym = resolveSymbol(normPath, fileImports, handlerName);
              if (resolvedSym) {
                const symId = resolvedSym.resolvedId || resolvedSym.id;
                routeRecord.handlerSymbolId = symId;
                addRelationship(symId, routeRecord.id, "HANDLES_ROUTE", {
                  method: methodName,
                  path: finalPath,
                  handler: handlerName,
                  sourceFile: normPath,
                });
              }
            }

            routes.push(routeRecord);
          }
        }
      }

      // Traverse children
      for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "comments") continue;
        const val = node[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === "object") visitRoutes(item);
          }
        } else if (val && typeof val === "object") {
          visitRoutes(val);
        }
      }
    };

    if (ast.program?.body) {
      for (const stmt of ast.program.body) {
        visitRoutes(stmt);
      }
    }
  }

  // 4. Step 3: Detect client API calls (CALLS_API)
  for (const f of fileDataList) {
    if (!f.content) continue;
    const normPath = normalizePath(f.path);
    const fileSymbols = f.symbols || [];

    let ast;
    try {
      ast = parseSourceCode(f.content);
    } catch {
      continue;
    }

    const visitClientCalls = (node, currentEnclosingSymbolId) => {
      if (!node || typeof node !== "object") return;

      // Track enclosing symbol if entering function/method/component
      let enclosingSymId = currentEnclosingSymbolId;
      if (
        (node.type === "FunctionDeclaration" && node.id?.name) ||
        (node.type === "ClassMethod" && node.key?.name)
      ) {
        const name = node.id?.name || node.key?.name;
        const sym = fileSymbols.find((s) => s.name === name);
        if (sym) enclosingSymId = sym.id || `${normPath}::${sym.name}::${sym.type}`;
      }

      // Check for fetch("/path") or axios.get("/path") or api.post("/path")
      if (node.type === "CallExpression" && enclosingSymId) {
        let calledPath = null;

        // Direct fetch('/api/users')
        if (node.callee?.type === "Identifier" && node.callee.name === "fetch" && node.arguments?.[0]?.type === "StringLiteral") {
          calledPath = normalizeRoutePath(node.arguments[0].value);
        }

        // axios.get('/api/users') or api.post('/api/users')
        if (
          node.callee?.type === "MemberExpression" &&
          node.arguments?.[0]?.type === "StringLiteral"
        ) {
          const prop = node.callee.property?.name?.toUpperCase();
          if (SUPPORTED_HTTP_METHODS.has(prop)) {
            calledPath = normalizeRoutePath(node.arguments[0].value);
          }
        }

        if (calledPath) {
          // Find matching ApiRoute
          const matchedRoute = routes.find(
            (r) => r.path === calledPath || calledPath.endsWith(r.path) || r.path.endsWith(calledPath),
          );

          if (matchedRoute) {
            addRelationship(enclosingSymId, matchedRoute.id, "CALLS_API", {
              path: matchedRoute.path,
              method: matchedRoute.method,
              sourceFile: normPath,
            });
          }
        }
      }

      for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "comments") continue;
        const val = node[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === "object") visitClientCalls(item, enclosingSymId);
          }
        } else if (val && typeof val === "object") {
          visitClientCalls(val, enclosingSymId);
        }
      }
    };

    if (ast.program?.body) {
      for (const stmt of ast.program.body) {
        visitClientCalls(stmt, null);
      }
    }
  }

  return {
    routes,
    relationships,
  };
}

export default {
  SUPPORTED_HTTP_METHODS,
  normalizeRoutePath,
  combineRoutePaths,
  analyzeApiRoutes,
};
