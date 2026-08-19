import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSourceCode, analyzeSource } from "../src/analyzers/javascript/astAnalyzer.js";
import { AstService } from "../src/services/ast.service.js";

describe("AST Analyzer Unit Tests", () => {
  it("extracts various JavaScript import patterns", () => {
    const code = `
import React, { useState, useEffect as useEff } from "react";
import * as path from "node:path";
import axios from "axios";
import "./styles.css";
`;
    const result = analyzeSource(code);

    assert.equal(result.success, true);
    assert.equal(result.imports.length, 4);

    // React import
    assert.equal(result.imports[0].source, "react");
    assert.equal(result.imports[0].specifiers.length, 3);
    assert.deepEqual(result.imports[0].specifiers[0], { type: "default", local: "React", imported: "default" });
    assert.deepEqual(result.imports[0].specifiers[1], { type: "named", local: "useState", imported: "useState" });
    assert.deepEqual(result.imports[0].specifiers[2], { type: "named", local: "useEff", imported: "useEffect" });

    // Namespace import
    assert.equal(result.imports[1].source, "node:path");
    assert.deepEqual(result.imports[1].specifiers[0], { type: "namespace", local: "path", imported: "*" });

    // Default import
    assert.equal(result.imports[2].source, "axios");
    assert.deepEqual(result.imports[2].specifiers[0], { type: "default", local: "axios", imported: "default" });

    // Side-effect import
    assert.equal(result.imports[3].source, "./styles.css");
    assert.equal(result.imports[3].specifiers.length, 0);
  });

  it("extracts named exports with declarations and specifiers", () => {
    const code = `
export const API_URL = "https://api.example.com";
export function formatData(d) { return d; }
export class Formatter {}
const helper = () => {};
export { helper, helper as aliasHelper };
`;
    const result = analyzeSource(code);

    assert.equal(result.success, true);
    assert.ok(result.exports.some((e) => e.name === "API_URL" && e.type === "named"));
    assert.ok(result.exports.some((e) => e.name === "formatData" && e.type === "named"));
    assert.ok(result.exports.some((e) => e.name === "Formatter" && e.type === "named"));
    assert.ok(result.exports.some((e) => e.name === "helper" && e.exportedName === "helper"));
    assert.ok(result.exports.some((e) => e.name === "helper" && e.exportedName === "aliasHelper"));
  });

  it("extracts default exports for functions, classes, and expressions", () => {
    const code1 = `export default function mainApp() {}`;
    const result1 = analyzeSource(code1);
    assert.equal(result1.success, true);
    assert.ok(result1.exports.some((e) => e.type === "default" && e.name === "mainApp"));

    const code2 = `export default class MainService {}`;
    const result2 = analyzeSource(code2);
    assert.equal(result2.success, true);
    assert.ok(result2.exports.some((e) => e.type === "default" && e.name === "MainService"));

    const code3 = `const config = {}; export default config;`;
    const result3 = analyzeSource(code3);
    assert.equal(result3.success, true);
    assert.ok(result3.exports.some((e) => e.type === "default"));
  });

  it("extracts functions (declarations, expressions, and arrow functions)", () => {
    const code = `
function calculateTotal(a, b) {
  return a + b;
}

const multiply = (x, y) => x * y;

const divide = function(x, y) {
  return x / y;
};
`;
    const result = analyzeSource(code);

    assert.equal(result.success, true);
    const fnNames = result.symbols.filter((s) => s.type === "FUNCTION").map((s) => s.name);
    assert.ok(fnNames.includes("calculateTotal"));
    assert.ok(fnNames.includes("multiply"));
    assert.ok(fnNames.includes("divide"));
  });

  it("extracts classes and class methods with precise locations", () => {
    const code = `
class UserService {
  constructor(db) {
    this.db = db;
  }

  async getUser(id) {
    return this.db.find(id);
  }

  get status() {
    return "active";
  }
}
`;
    const result = analyzeSource(code);

    assert.equal(result.success, true);

    const classSymbol = result.symbols.find((s) => s.name === "UserService" && s.type === "CLASS");
    assert.ok(classSymbol);
    assert.equal(classSymbol.startLine, 2);
    assert.equal(classSymbol.endLine, 14);

    const methods = result.symbols.filter((s) => s.type === "METHOD");
    const methodNames = methods.map((m) => m.name);
    assert.ok(methodNames.includes("constructor"));
    assert.ok(methodNames.includes("getUser"));
    assert.ok(methodNames.includes("status"));

    const getUserMethod = methods.find((m) => m.name === "getUser");
    assert.equal(getUserMethod.startLine, 7);
    assert.equal(getUserMethod.endLine, 9);
  });

  it("detects React JSX components (function and class components)", () => {
    const code = `
import React, { Component } from 'react';

function UserCard({ name }) {
  return <div className="card"><h1>{name}</h1></div>;
}

const NavigationBar = () => {
  return (
    <nav>
      <a href="/">Home</a>
    </nav>
  );
};

class Sidebar extends Component {
  render() {
    return <aside>Menu</aside>;
  }
}

function helperUtil() {
  return 42;
}
`;
    const result = analyzeSource(code);

    assert.equal(result.success, true);

    const componentSymbols = result.symbols.filter((s) => s.type === "COMPONENT");
    const compNames = componentSymbols.map((c) => c.name);

    assert.ok(compNames.includes("UserCard"));
    assert.ok(compNames.includes("NavigationBar"));
    assert.ok(compNames.includes("Sidebar"));

    // helperUtil does not return JSX and is not PascalCase component
    const funcSymbols = result.symbols.filter((s) => s.type === "FUNCTION");
    assert.ok(funcSymbols.some((f) => f.name === "helperUtil"));
    assert.ok(!compNames.includes("helperUtil"));
  });

  it("extracts TypeScript interfaces and type aliases", () => {
    const tsCode = `
interface UserProfile {
  id: string;
  username: string;
  email: string;
}

type UserRole = "ADMIN" | "USER" | "GUEST";

type Callback<T> = (data: T) => void;
`;
    const result = analyzeSource(tsCode);

    assert.equal(result.success, true);

    const interfaceSymbol = result.symbols.find((s) => s.name === "UserProfile" && s.type === "INTERFACE");
    assert.ok(interfaceSymbol);
    assert.equal(interfaceSymbol.startLine, 2);
    assert.equal(interfaceSymbol.endLine, 6);

    const roleType = result.symbols.find((s) => s.name === "UserRole" && s.type === "TYPE");
    assert.ok(roleType);

    const callbackType = result.symbols.find((s) => s.name === "Callback" && s.type === "TYPE");
    assert.ok(callbackType);
  });

  it("analyzes TSX constructs with generic types and JSX", () => {
    const tsxCode = `
import React from 'react';

interface ButtonProps<T> {
  value: T;
  onClick: (val: T) => void;
}

export const GenericButton = <T,>({ value, onClick }: ButtonProps<T>): React.JSX.Element => {
  return <button onClick={() => onClick(value)}>Click</button>;
};
`;
    const result = analyzeSource(tsxCode);

    assert.equal(result.success, true);

    const iface = result.symbols.find((s) => s.name === "ButtonProps" && s.type === "INTERFACE");
    assert.ok(iface);

    const comp = result.symbols.find((s) => s.name === "GenericButton" && s.type === "COMPONENT");
    assert.ok(comp);
  });

  it("extracts source locations accurately for multiple symbols in one file", () => {
    const code = `// line 1
function firstFunc() {
  return 1;
}

// line 6
class SecondClass {
  methodA() {}
}

// line 11
interface ThirdInterface {}
`;
    const result = analyzeSource(code);

    assert.equal(result.success, true);

    const first = result.symbols.find((s) => s.name === "firstFunc");
    assert.equal(first.startLine, 2);
    assert.equal(first.endLine, 4);

    const second = result.symbols.find((s) => s.name === "SecondClass");
    assert.equal(second.startLine, 7);
    assert.equal(second.endLine, 9);

    const third = result.symbols.find((s) => s.name === "ThirdInterface");
    assert.equal(third.startLine, 12);
    assert.equal(third.endLine, 12);
  });

  it("handles empty and whitespace-only source files gracefully", () => {
    const emptyResult = analyzeSource("");
    assert.equal(emptyResult.success, true);
    assert.equal(emptyResult.symbols.length, 0);
    assert.equal(emptyResult.imports.length, 0);
    assert.equal(emptyResult.exports.length, 0);

    const wsResult = analyzeSource("   \n\n  \t  ");
    assert.equal(wsResult.success, true);
    assert.equal(wsResult.symbols.length, 0);
  });

  it("handles malformed source code cleanly without crashing", () => {
    const malformedCode = `
function broken( {
  const x = ;
  return
`;
    const result = analyzeSource(malformedCode);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.symbols.length, 0);
  });

  it("does not attempt dependency resolution during import/export extraction", () => {
    const code = `
import { helper } from "./utils/helper";
import { config } from "../config";
export { helper };
`;
    const result = analyzeSource(code);

    assert.equal(result.success, true);
    // Raw import sources remain unresolved relative strings without path resolution
    assert.equal(result.imports[0].source, "./utils/helper");
    assert.equal(result.imports[1].source, "../config");
    // No dependency objects, nodes, edges, or resolved file paths are present
    assert.equal(result.dependencies, undefined);
    assert.equal(result.graph, undefined);
  });
});

describe("AST Service Unit Tests", () => {
  const service = new AstService();

  it("ignores unsupported file extensions without errors", () => {
    const result = service.analyzeFile("README.md", "# Heading\nSome text");
    assert.equal(result.isSupported, false);
    assert.equal(result.success, true);
    assert.equal(result.symbols.length, 0);
  });

  it("isolates syntax errors in one file from other valid files in batch analysis", () => {
    const files = [
      {
        path: "src/valid1.js",
        content: "export function validOne() { return 1; }",
      },
      {
        path: "src/broken.js",
        content: "function brokenSyntax( { const = ;",
      },
      {
        path: "src/valid2.ts",
        content: "export interface ValidTwo { id: string; }",
      },
      {
        path: "package.json",
        content: '{"name": "test"}',
      },
    ];

    const results = service.analyzeRepositoryFiles(files);

    assert.equal(results.length, 4);

    // File 1: Success
    assert.equal(results[0].filePath, "src/valid1.js");
    assert.equal(results[0].success, true);
    assert.ok(results[0].symbols.some((s) => s.name === "validOne"));

    // File 2: Broken syntax, recorded error, failed gracefully
    assert.equal(results[1].filePath, "src/broken.js");
    assert.equal(results[1].success, false);
    assert.ok(results[1].error);

    // File 3: Success despite file 2 failing
    assert.equal(results[2].filePath, "src/valid2.ts");
    assert.equal(results[2].success, true);
    assert.ok(results[2].symbols.some((s) => s.name === "ValidTwo"));

    // File 4: Unsupported JSON file ignored cleanly
    assert.equal(results[3].filePath, "package.json");
    assert.equal(results[3].isSupported, false);
    assert.equal(results[3].success, true);
  });

  it("persists symbols into database via Prisma delegate cleanly", async () => {
    let deletedFileId = null;
    let createdSymbols = null;

    const mockPrisma = {
      symbol: {
        deleteMany: async ({ where }) => {
          deletedFileId = where.fileId;
          return { count: 0 };
        },
        createMany: async ({ data }) => {
          createdSymbols = data;
          return { count: data.length };
        },
      },
    };

    const customService = new AstService({ prisma: mockPrisma });
    const symbols = [
      { name: "UserService", type: "CLASS", startLine: 1, endLine: 10 },
      { name: "getUser", type: "METHOD", startLine: 3, endLine: 5 },
    ];

    const persistResult = await customService.persistFileSymbols("file-uuid-1", symbols);

    assert.equal(persistResult.count, 2);
    assert.equal(deletedFileId, "file-uuid-1");
    assert.equal(createdSymbols.length, 2);
    assert.equal(createdSymbols[0].name, "UserService");
    assert.equal(createdSymbols[0].type, "CLASS");
    assert.equal(createdSymbols[0].fileId, "file-uuid-1");
  });
});
