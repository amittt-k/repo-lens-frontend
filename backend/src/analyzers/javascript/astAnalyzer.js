import * as babelParser from "@babel/parser";

/**
 * Checks if a given AST subtree contains any JSX element or JSX fragment.
 *
 * @param {object} node - AST node.
 * @returns {boolean}
 */
function containsJsx(node) {
  if (!node || typeof node !== "object") return false;

  if (node.type === "JSXElement" || node.type === "JSXFragment") {
    return true;
  }

  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "loc" || key === "comments") continue;
    const val = node[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (containsJsx(item)) return true;
      }
    } else if (val && typeof val === "object") {
      if (containsJsx(val)) return true;
    }
  }

  return false;
}

/**
 * Checks if an identifier name follows React component naming convention (PascalCase).
 *
 * @param {string} name - Identifier name.
 * @returns {boolean}
 */
function isPascalCase(name) {
  return typeof name === "string" && /^[A-Z][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Checks if a class extends a React component superclass.
 *
 * @param {object} node - ClassDeclaration or ClassExpression node.
 * @returns {boolean}
 */
function isReactClassComponent(node) {
  if (!node.superClass) return false;

  const sc = node.superClass;
  if (sc.type === "Identifier" && (sc.name === "Component" || sc.name === "PureComponent")) {
    return true;
  }
  if (
    sc.type === "MemberExpression" &&
    sc.object?.name === "React" &&
    (sc.property?.name === "Component" || sc.property?.name === "PureComponent")
  ) {
    return true;
  }

  return false;
}

/**
 * Unwraps higher-order function/component wrappers (e.g. asyncHandler, React.memo, memo, forwardRef, withAuth)
 * to retrieve the underlying function or class body and JSX characteristics.
 *
 * @param {object} init - Initializer node.
 * @returns {{
 *   isFunction: boolean,
 *   isClass: boolean,
 *   body: object|null,
 *   node: object|null
 * }}
 */
export function unwrapFunctionOrComponent(init) {
  if (!init || typeof init !== "object") {
    return { isFunction: false, isClass: false, body: null, node: null };
  }

  if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
    return { isFunction: true, isClass: false, body: init.body, node: init };
  }

  if (init.type === "ClassExpression") {
    return { isFunction: false, isClass: true, body: init.body, node: init };
  }

  // Handle wrappers: asyncHandler(async (req, res) => ...), memo((props) => ...), forwardRef((props, ref) => ...)
  if (init.type === "CallExpression" && Array.isArray(init.arguments)) {
    for (const arg of init.arguments) {
      if (arg && (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression")) {
        return { isFunction: true, isClass: false, body: arg.body, node: arg };
      }
      if (arg && arg.type === "ClassExpression") {
        return { isFunction: false, isClass: true, body: arg.body, node: arg };
      }
    }
  }

  return { isFunction: false, isClass: false, body: null, node: null };
}

/**
 * Parses raw JavaScript/TypeScript/JSX/TSX source code into an AST.
 *
 * @param {string} sourceCode - Raw source code string.
 * @param {object} [options={}] - Parser options.
 * @returns {object} - Parsed Babel AST.
 */
export function parseSourceCode(sourceCode, options = {}) {
  if (typeof sourceCode !== "string") {
    throw new TypeError("sourceCode must be a string");
  }

  return babelParser.parse(sourceCode, {
    sourceType: "module",
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    plugins: [
      "typescript",
      "jsx",
      "exportDefaultFrom",
    ],
    ...options,
  });
}

/**
 * Statically analyzes a source code string and extracts imports, exports, and symbols.
 *
 * @param {string} sourceCode - Raw source code string.
 * @param {object} [options={}] - Options object.
 * @param {string} [options.filePath=""] - Relative file path for reference.
 * @returns {{
 *   success: boolean,
 *   error: string|null,
 *   symbols: Array<{ name: string, type: string, startLine: number, endLine: number }>,
 *   imports: Array<object>,
 *   exports: Array<object>
 * }}
 */
export function analyzeSource(sourceCode, options = {}) {
  if (typeof sourceCode !== "string") {
    return {
      success: false,
      error: "sourceCode must be a string",
      symbols: [],
      imports: [],
      exports: [],
    };
  }

  if (!sourceCode.trim()) {
    return {
      success: true,
      error: null,
      symbols: [],
      imports: [],
      exports: [],
    };
  }

  let ast;
  try {
    ast = parseSourceCode(sourceCode, options);
  } catch (parseErr) {
    return {
      success: false,
      error: parseErr.message || "Failed to parse source code",
      symbols: [],
      imports: [],
      exports: [],
    };
  }

  const symbols = [];
  const imports = [];
  const exportsList = [];

  const addSymbol = (name, type, startLine, endLine) => {
    if (!name || typeof name !== "string") return;
    symbols.push({
      name,
      type,
      startLine: startLine ?? 1,
      endLine: endLine ?? startLine ?? 1,
    });
  };

  // Traverse top-level program statements and nested structures
  const traverseStatement = (node) => {
    if (!node || typeof node !== "object") return;

    const loc = node.loc || { start: { line: 1 }, end: { line: 1 } };
    const startLine = loc.start.line;
    const endLine = loc.end.line;

    switch (node.type) {
      // 1. Imports
      case "ImportDeclaration": {
        const specifiers = (node.specifiers || []).map((s) => {
          if (s.type === "ImportDefaultSpecifier") {
            return { type: "default", local: s.local.name, imported: "default" };
          }
          if (s.type === "ImportNamespaceSpecifier") {
            return { type: "namespace", local: s.local.name, imported: "*" };
          }
          if (s.type === "ImportSpecifier") {
            return {
              type: "named",
              local: s.local.name,
              imported: s.imported.type === "Identifier" ? s.imported.name : s.imported.value,
            };
          }
          return { type: "unknown", local: s.local?.name || "unknown" };
        });

        imports.push({
          source: node.source.value,
          specifiers,
          startLine,
          endLine,
        });
        break;
      }

      // 2. Named Exports
      case "ExportNamedDeclaration": {
        if (node.declaration) {
          traverseStatement(node.declaration);

          // Record export information
          if (node.declaration.id?.name) {
            exportsList.push({
              type: "named",
              name: node.declaration.id.name,
              exportedName: node.declaration.id.name,
              source: node.source?.value || null,
              startLine,
              endLine,
            });
          } else if (node.declaration.declarations) {
            for (const d of node.declaration.declarations) {
              if (d.id?.name) {
                exportsList.push({
                  type: "named",
                  name: d.id.name,
                  exportedName: d.id.name,
                  source: node.source?.value || null,
                  startLine,
                  endLine,
                });
              }
            }
          }
        }

        if (node.specifiers && node.specifiers.length > 0) {
          for (const s of node.specifiers) {
            const localName = s.local?.name || (s.local?.type === "StringLiteral" ? s.local.value : "unknown");
            const exportedName = s.exported?.name || (s.exported?.type === "StringLiteral" ? s.exported.value : localName);
            exportsList.push({
              type: "named",
              name: localName,
              exportedName,
              source: node.source?.value || null,
              startLine,
              endLine,
            });
          }
        }
        break;
      }

      // 3. Default Exports
      case "ExportDefaultDeclaration": {
        let exportName = "default";
        if (node.declaration) {
          if (node.declaration.id?.name) {
            exportName = node.declaration.id.name;
          }
          traverseStatement(node.declaration);
        }

        exportsList.push({
          type: "default",
          name: exportName,
          exportedName: "default",
          source: null,
          startLine,
          endLine,
        });
        break;
      }

      // 4. Export All (re-export)
      case "ExportAllDeclaration": {
        exportsList.push({
          type: "all",
          name: "*",
          exportedName: "*",
          source: node.source.value,
          startLine,
          endLine,
        });
        break;
      }

      // 5. Function Declarations
      case "FunctionDeclaration": {
        if (node.id?.name) {
          const fnName = node.id.name;
          const isComp = isPascalCase(fnName) && containsJsx(node);
          addSymbol(fnName, isComp ? "COMPONENT" : "FUNCTION", startLine, endLine);
        }
        break;
      }

      // 6. Class Declarations
      case "ClassDeclaration": {
        if (node.id?.name) {
          const clsName = node.id.name;
          const isComp = isReactClassComponent(node) || (isPascalCase(clsName) && containsJsx(node));
          addSymbol(clsName, isComp ? "COMPONENT" : "CLASS", startLine, endLine);

          // Extract methods
          if (node.body?.body) {
            for (const member of node.body.body) {
              if (
                member.type === "ClassMethod" ||
                member.type === "ClassPrivateMethod"
              ) {
                const methodName = member.key?.name || member.key?.id?.name || (member.kind === "constructor" ? "constructor" : null);
                if (methodName) {
                  const mLoc = member.loc || loc;
                  addSymbol(methodName, "METHOD", mLoc.start.line, mLoc.end.line);
                }
              }
            }
          }
        }
        break;
      }

      // 7. Variable Declarations (Functions, Arrow Functions, Components, Wrappers)
      case "VariableDeclaration": {
        if (node.declarations) {
          for (const decl of node.declarations) {
            if (decl.id?.type === "Identifier" && decl.init) {
              const varName = decl.id.name;
              const init = decl.init;
              const dLoc = decl.loc || loc;
              const unwrapped = unwrapFunctionOrComponent(init);

              if (unwrapped.isFunction) {
                const isComp = isPascalCase(varName) && (containsJsx(unwrapped.node) || containsJsx(init));
                addSymbol(varName, isComp ? "COMPONENT" : "FUNCTION", dLoc.start.line, dLoc.end.line);
              } else if (unwrapped.isClass) {
                const isComp = isReactClassComponent(unwrapped.node || init) || (isPascalCase(varName) && containsJsx(init));
                addSymbol(varName, isComp ? "COMPONENT" : "CLASS", dLoc.start.line, dLoc.end.line);
              }
            }
          }
        }
        break;
      }

      // 8. TypeScript Interfaces
      case "TSInterfaceDeclaration": {
        if (node.id?.name) {
          addSymbol(node.id.name, "INTERFACE", startLine, endLine);
        }
        break;
      }

      // 9. TypeScript Type Aliases
      case "TSTypeAliasDeclaration": {
        if (node.id?.name) {
          addSymbol(node.id.name, "TYPE", startLine, endLine);
        }
        break;
      }

      default:
        break;
    }
  };

  if (ast.program?.body) {
    for (const stmt of ast.program.body) {
      traverseStatement(stmt);
    }
  }

  return {
    success: true,
    error: null,
    ast,
    symbols,
    imports,
    exports: exportsList,
  };
}

export default {
  parseSourceCode,
  analyzeSource,
};
