import { parseSourceCode, unwrapFunctionOrComponent } from "./astAnalyzer.js";

/**
 * Normalizes a path string to forward slashes without leading or trailing slashes.
 *
 * @param {string} p - Path.
 * @returns {string}
 */
function normalizePath(p) {
  if (!p || typeof p !== "string") return "";
  return p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

/**
 * Traverses an AST subtree to find all CallExpression callees, JSX elements, and new expressions.
 *
 * @param {object} astNode - AST node (e.g. FunctionDeclaration body).
 * @returns {{
 *   calls: Array<{ name: string, isThisCall: boolean, startLine: number, endLine: number }>,
 *   jsxUsages: Array<{ name: string, startLine: number, endLine: number }>,
 *   instantiations: Array<{ name: string, startLine: number, endLine: number }>
 * }}
 */
function extractBodyReferences(astNode) {
  const calls = [];
  const jsxUsages = [];
  const instantiations = [];

  if (!astNode || typeof astNode !== "object") {
    return { calls, jsxUsages, instantiations };
  }

  const visit = (node) => {
    if (!node || typeof node !== "object") return;

    // Direct function call: foo() or this.method()
    if (node.type === "CallExpression") {
      const loc = node.loc || { start: { line: 1 }, end: { line: 1 } };
      if (node.callee) {
        if (node.callee.type === "Identifier") {
          calls.push({
            name: node.callee.name,
            isThisCall: false,
            startLine: loc.start.line,
            endLine: loc.end.line,
          });
        } else if (
          node.callee.type === "MemberExpression" &&
          node.callee.object?.type === "ThisExpression" &&
          node.callee.property?.type === "Identifier"
        ) {
          calls.push({
            name: node.callee.property.name,
            isThisCall: true,
            startLine: loc.start.line,
            endLine: loc.end.line,
          });
        }
      }
    }

    // JSX element usage: <Header />
    if (node.type === "JSXElement" && node.openingElement?.name) {
      const nameNode = node.openingElement.name;
      const loc = node.loc || { start: { line: 1 }, end: { line: 1 } };
      if (nameNode.type === "JSXIdentifier" && /^[A-Z]/.test(nameNode.name)) {
        jsxUsages.push({
          name: nameNode.name,
          startLine: loc.start.line,
          endLine: loc.end.line,
        });
      }
    }

    // Class instantiation: new UserService()
    if (node.type === "NewExpression" && node.callee) {
      const loc = node.loc || { start: { line: 1 }, end: { line: 1 } };
      if (node.callee.type === "Identifier") {
        instantiations.push({
          name: node.callee.name,
          startLine: loc.start.line,
          endLine: loc.end.line,
        });
      }
    }

    // Traverse children
    for (const key of Object.keys(node)) {
      if (key === "parent" || key === "loc" || key === "comments") continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object") visit(item);
        }
      } else if (val && typeof val === "object") {
        visit(val);
      }
    }
  };

  visit(astNode);
  return { calls, jsxUsages, instantiations };
}

/**
 * Analyzes symbol-level relationships across files in a repository.
 *
 * Extracted Relationships:
 * - CONTAINS: File -> Symbol, Class -> Method
 * - EXTENDS: Class -> Superclass
 * - IMPLEMENTS: Class -> Interface
 * - CALLS: Function/Method -> Function/Method
 * - USES: Function/Component -> Component/Class/Symbol
 *
 * @param {Array<object>} fileDataList - Array of analyzed files with { path, id, content, symbols, imports, dependencies }.
 * @param {object} [options={}] - Options object.
 * @returns {Array<{
 *   sourceId: string,
 *   targetId: string,
 *   relationshipType: string,
 *   metadata: object
 * }>}
 */
export function analyzeSymbolRelationships(fileDataList = [], options = {}) {
  const relationships = [];
  const relationshipKeySet = new Set();

  // Helper to add unique relationship
  const addRelationship = (sourceId, targetId, relationshipType, metadata = {}) => {
    if (!sourceId || !targetId || !relationshipType) return;
    if (sourceId === targetId && relationshipType === "CONTAINS") return; // no self-containment

    const key = `${sourceId}::${relationshipType}::${targetId}`;
    if (!relationshipKeySet.has(key)) {
      relationshipKeySet.add(key);
      relationships.push({
        sourceId,
        targetId,
        relationshipType,
        metadata,
      });
    }
  };

  // 1. Build lookup tables
  const fileByPath = new Map();
  const symbolMap = new Map(); // key: `${filePath}::${symbolName}` -> Symbol object
  const symbolsByFileId = new Map(); // key: fileId -> Array<Symbol>

  for (const f of fileDataList) {
    const normPath = normalizePath(f.path);
    fileByPath.set(normPath, f);

    const fileSymbols = f.symbols || [];
    const fileId = f.id || normPath;
    symbolsByFileId.set(fileId, fileSymbols);

    for (const sym of fileSymbols) {
      const symIdentifier = sym.id || `${normPath}::${sym.name}::${sym.type}`;
      symbolMap.set(`${normPath}::${sym.name}`, { ...sym, resolvedId: symIdentifier, filePath: normPath, fileId });
      symbolMap.set(`${fileId}::${sym.name}`, { ...sym, resolvedId: symIdentifier, filePath: normPath, fileId });
    }
  }

  // 2. Helper to resolve a symbol name from the perspective of a source file
  const resolveTargetSymbol = (sourceFilePath, sourceFileImports, targetName) => {
    const normSourcePath = normalizePath(sourceFilePath);

    // Check same-file symbol first
    const sameFileSym = symbolMap.get(`${normSourcePath}::${targetName}`);
    if (sameFileSym) return sameFileSym;

    // Check if targetName was imported from another file
    for (const imp of sourceFileImports || []) {
      for (const spec of imp.specifiers || []) {
        if (spec.local === targetName) {
          // Find resolved target file from dependencies
          const targetImportedName = spec.imported === "default" ? "default" : spec.imported;
          const resolvedDep = (fileByPath.get(normSourcePath)?.dependencies || []).find(
            (d) => d.rawSource === imp.source && d.resolved && d.targetPath,
          );

          if (resolvedDep && resolvedDep.targetPath) {
            const targetNormPath = normalizePath(resolvedDep.targetPath);
            // Look up symbol in target file
            let targetSym = symbolMap.get(`${targetNormPath}::${targetImportedName}`);
            if (!targetSym && targetImportedName === "default") {
              // Try to find any exported or main symbol in target file
              const targetFileEntry = fileByPath.get(targetNormPath);
              if (targetFileEntry?.symbols?.length > 0) {
                targetSym = targetFileEntry.symbols[0];
              }
            }
            if (targetSym) return targetSym;
          }
        }
      }
    }

    return null;
  };

  // 3. Process each file
  for (const f of fileDataList) {
    const normPath = normalizePath(f.path);
    const fileId = f.id || normPath;
    const fileSymbols = f.symbols || [];
    const fileImports = f.imports || [];
    const content = f.content || "";

    // A. CONTAINS relationships (File -> Top-level Symbols)
    for (const sym of fileSymbols) {
      const symId = sym.resolvedId || sym.id || `${normPath}::${sym.name}::${sym.type}`;
      if (sym.type !== "METHOD") {
        addRelationship(fileId, symId, "CONTAINS", {
          parentType: "file",
          childType: sym.type,
          name: sym.name,
          path: normPath,
        });
      }
    }

    let ast = f.ast;
    if (!ast) {
      if (!content.trim()) continue;
      try {
        ast = parseSourceCode(content);
      } catch {
        continue;
      }
    }

    // Traverse top-level AST items to find classes, methods, functions, calls, extensions, and implements
    const traverseAst = (node) => {
      if (!node || typeof node !== "object") return;

      // Handle ClassDeclaration
      if (node.type === "ClassDeclaration" || (node.type === "ExportNamedDeclaration" && node.declaration?.type === "ClassDeclaration")) {
        const clsNode = node.declaration || node;
        const clsName = clsNode.id?.name;
        const clsSym = symbolMap.get(`${normPath}::${clsName}`);
        const clsId = clsSym?.resolvedId || clsSym?.id;

        if (clsName && clsId) {
          // B. CONTAINS relationships (Class -> Method)
          if (clsNode.body?.body) {
            for (const member of clsNode.body.body) {
              if (member.type === "ClassMethod" || member.type === "ClassPrivateMethod") {
                const methodName = member.key?.name || member.key?.id?.name || (member.kind === "constructor" ? "constructor" : null);
                if (methodName) {
                  const methodSym = fileSymbols.find(
                    (s) => s.type === "METHOD" && s.name === methodName && Math.abs(s.startLine - (member.loc?.start.line || 0)) <= 1,
                  );
                  const methodId = methodSym?.resolvedId || methodSym?.id || `${normPath}::${clsName}.${methodName}`;
                  addRelationship(clsId, methodId, "CONTAINS", {
                    parentType: "class",
                    childType: "method",
                    className: clsName,
                    methodName,
                    path: normPath,
                  });

                  // Extract calls/references inside this method
                  const methodRefs = extractBodyReferences(member.body);
                  for (const call of methodRefs.calls) {
                    const calleeSym = call.isThisCall
                      ? fileSymbols.find((s) => s.type === "METHOD" && s.name === call.name)
                      : resolveTargetSymbol(normPath, fileImports, call.name);

                    if (calleeSym) {
                      const calleeId = calleeSym.resolvedId || calleeSym.id;
                      addRelationship(methodId, calleeId, "CALLS", {
                        sourceName: `${clsName}.${methodName}`,
                        targetName: calleeSym.name,
                        sourceFile: normPath,
                        targetFile: calleeSym.filePath || normPath,
                        startLine: call.startLine,
                        endLine: call.endLine,
                      });
                    }
                  }
                }
              }
            }
          }

          // C. EXTENDS relationships (Class -> Superclass)
          if (clsNode.superClass) {
            const superName = clsNode.superClass.name || clsNode.superClass.property?.name;
            if (superName && superName !== "Component" && superName !== "PureComponent") {
              const superSym = resolveTargetSymbol(normPath, fileImports, superName);
              if (superSym) {
                const superId = superSym.resolvedId || superSym.id;
                addRelationship(clsId, superId, "EXTENDS", {
                  sourceName: clsName,
                  targetName: superSym.name,
                  sourceFile: normPath,
                  targetFile: superSym.filePath || normPath,
                });
              }
            }
          }

          // D. IMPLEMENTS relationships (Class -> Interface)
          const implementsList = clsNode.implements || [];
          for (const impl of implementsList) {
            const ifaceName = impl.expression?.name || impl.id?.name;
            if (ifaceName) {
              const ifaceSym = resolveTargetSymbol(normPath, fileImports, ifaceName);
              if (ifaceSym) {
                const ifaceId = ifaceSym.resolvedId || ifaceSym.id;
                addRelationship(clsId, ifaceId, "IMPLEMENTS", {
                  sourceName: clsName,
                  targetName: ifaceSym.name,
                  sourceFile: normPath,
                  targetFile: ifaceSym.filePath || normPath,
                });
              }
            }
          }
        }
      }

      // Helper to process calls and usages within a function, arrow function, or component body
      const processFunctionOrComponentBody = (fnName, fnBody) => {
        if (!fnName || !fnBody) return;
        const fnSym = symbolMap.get(`${normPath}::${fnName}`);
        const fnId = fnSym?.resolvedId || fnSym?.id;

        if (fnId) {
          const bodyRefs = extractBodyReferences(fnBody);

          // E. CALLS relationships (Function -> Function/Method)
          for (const call of bodyRefs.calls) {
            const calleeSym = resolveTargetSymbol(normPath, fileImports, call.name);
            if (calleeSym) {
              const calleeId = calleeSym.resolvedId || calleeSym.id;
              addRelationship(fnId, calleeId, "CALLS", {
                sourceName: fnName,
                targetName: calleeSym.name,
                sourceFile: normPath,
                targetFile: calleeSym.filePath || normPath,
                startLine: call.startLine,
                endLine: call.endLine,
              });
            }
          }

          // F. USES relationships (Component -> Component in JSX, Function -> Instantiated Class)
          for (const jsx of bodyRefs.jsxUsages) {
            const targetCompSym = resolveTargetSymbol(normPath, fileImports, jsx.name);
            if (targetCompSym) {
              const targetId = targetCompSym.resolvedId || targetCompSym.id;
              addRelationship(fnId, targetId, "USES", {
                sourceName: fnName,
                targetName: targetCompSym.name,
                sourceFile: normPath,
                targetFile: targetCompSym.filePath || normPath,
                usageType: "jsx_component",
                startLine: jsx.startLine,
                endLine: jsx.endLine,
              });
            }
          }

          for (const inst of bodyRefs.instantiations) {
            const targetClsSym = resolveTargetSymbol(normPath, fileImports, inst.name);
            if (targetClsSym) {
              const targetId = targetClsSym.resolvedId || targetClsSym.id;
              addRelationship(fnId, targetId, "USES", {
                sourceName: fnName,
                targetName: targetClsSym.name,
                sourceFile: normPath,
                targetFile: targetClsSym.filePath || normPath,
                usageType: "instantiation",
                startLine: inst.startLine,
                endLine: inst.endLine,
              });
            }
          }
        }
      };

      // Handle FunctionDeclaration & VariableDeclaration functions/components
      if (
        node.type === "FunctionDeclaration" ||
        (node.type === "ExportNamedDeclaration" && node.declaration?.type === "FunctionDeclaration")
      ) {
        const decl = node.declaration || node;
        if (decl.id?.name && decl.body) {
          processFunctionOrComponentBody(decl.id.name, decl.body);
        }
      } else if (
        node.type === "VariableDeclaration" ||
        (node.type === "ExportNamedDeclaration" && node.declaration?.type === "VariableDeclaration")
      ) {
        const decl = node.declaration || node;
        if (decl.declarations) {
          for (const d of decl.declarations) {
            if (d.id?.type === "Identifier" && d.init) {
              const unwrapped = unwrapFunctionOrComponent(d.init);
              if (unwrapped.isFunction && unwrapped.body) {
                processFunctionOrComponentBody(d.id.name, unwrapped.body);
              }
            }
          }
        }
      }
    };

    if (ast.program?.body) {
      for (const stmt of ast.program.body) {
        traverseAst(stmt);
      }
    }
  }

  return relationships;
}

export default {
  analyzeSymbolRelationships,
};
