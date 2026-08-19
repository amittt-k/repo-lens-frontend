import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeSymbolRelationships } from "../src/analyzers/javascript/symbolRelationshipAnalyzer.js";
import { RelationshipService, SYMBOL_RELATIONSHIP_TYPES } from "../src/services/relationship.service.js";
import { analyzeSource } from "../src/analyzers/javascript/astAnalyzer.js";
import { resolveFileDependencies, createFileLookupMap } from "../src/analyzers/javascript/dependencyResolver.js";


describe("Symbol Relationship Analyzer Unit Tests", () => {
  it("extracts CONTAINS relationships for file-level symbols and class methods", () => {
    const code = `
export function computeTotal(a, b) {
  return a + b;
}

export class OrderService {
  constructor() {}
  processOrder() {}
}
`;
    const ast = analyzeSource(code, { filePath: "src/order.ts" });
    const fileData = [
      {
        id: "file-order",
        path: "src/order.ts",
        content: code,
        symbols: ast.symbols.map((s, idx) => ({ ...s, id: `sym-order-${idx}` })),
        imports: ast.imports,
        dependencies: [],
      },
    ];

    const rels = analyzeSymbolRelationships(fileData);

    // File contains computeTotal
    const fileContainsFunc = rels.find(
      (r) => r.relationshipType === "CONTAINS" && r.sourceId === "file-order" && r.metadata.name === "computeTotal",
    );
    assert.ok(fileContainsFunc);

    // File contains OrderService
    const fileContainsCls = rels.find(
      (r) => r.relationshipType === "CONTAINS" && r.sourceId === "file-order" && r.metadata.name === "OrderService",
    );
    assert.ok(fileContainsCls);

    // OrderService contains constructor and processOrder
    const clsId = fileContainsCls.targetId;
    const clsContainsConstructor = rels.find(
      (r) => r.relationshipType === "CONTAINS" && r.sourceId === clsId && r.metadata.methodName === "constructor",
    );
    assert.ok(clsContainsConstructor);

    const clsContainsProcessOrder = rels.find(
      (r) => r.relationshipType === "CONTAINS" && r.sourceId === clsId && r.metadata.methodName === "processOrder",
    );
    assert.ok(clsContainsProcessOrder);
  });

  it("extracts EXTENDS and IMPLEMENTS relationships in same file and across files", () => {
    const baseCode = `
export class BaseService {}
export interface IAuthService {}
`;

    const appCode = `
import { BaseService, IAuthService } from "./base";

export class LocalBase {}

export class AuthService extends BaseService implements IAuthService {}
export class SubService extends LocalBase {}
`;

    const baseAst = analyzeSource(baseCode, { filePath: "src/base.ts" });
    const appAst = analyzeSource(appCode, { filePath: "src/app.ts" });

    const baseSymbols = baseAst.symbols.map((s, idx) => ({ ...s, id: `sym-base-${idx}` }));
    const appSymbols = appAst.symbols.map((s, idx) => ({ ...s, id: `sym-app-${idx}` }));

    const files = [
      { id: "f-base", path: "src/base.ts" },
      { id: "f-app", path: "src/app.ts" },
    ];
    const fileMap = createFileLookupMap(files);

    const appDeps = resolveFileDependencies("src/app.ts", appAst.imports, fileMap).dependencies;

    const fileData = [
      {
        id: "f-base",
        path: "src/base.ts",
        content: baseCode,
        symbols: baseSymbols,
        imports: baseAst.imports,
        dependencies: [],
      },
      {
        id: "f-app",
        path: "src/app.ts",
        content: appCode,
        symbols: appSymbols,
        imports: appAst.imports,
        dependencies: appDeps,
      },
    ];

    const rels = analyzeSymbolRelationships(fileData);

    // Cross-file EXTENDS: AuthService extends BaseService
    const extendsRel = rels.find(
      (r) => r.relationshipType === "EXTENDS" && r.metadata.sourceName === "AuthService" && r.metadata.targetName === "BaseService",
    );
    assert.ok(extendsRel);
    assert.equal(extendsRel.targetId, baseSymbols.find((s) => s.name === "BaseService").id);

    // Cross-file IMPLEMENTS: AuthService implements IAuthService
    const implementsRel = rels.find(
      (r) => r.relationshipType === "IMPLEMENTS" && r.metadata.sourceName === "AuthService" && r.metadata.targetName === "IAuthService",
    );
    assert.ok(implementsRel);
    assert.equal(implementsRel.targetId, baseSymbols.find((s) => s.name === "IAuthService").id);

    // Same-file EXTENDS: SubService extends LocalBase
    const sameFileExtends = rels.find(
      (r) => r.relationshipType === "EXTENDS" && r.metadata.sourceName === "SubService" && r.metadata.targetName === "LocalBase",
    );
    assert.ok(sameFileExtends);
    assert.equal(sameFileExtends.targetId, appSymbols.find((s) => s.name === "LocalBase").id);
  });

  it("extracts CALLS relationships for functions and methods across files", () => {
    const mathCode = `
export function add(a, b) { return a + b; }
`;

    const calcCode = `
import { add } from "./math";

function helperMultiply(a, b) {
  return a * b;
}

export function calculate(x, y) {
  const sum = add(x, y);
  return helperMultiply(sum, 2);
}
`;

    const mathAst = analyzeSource(mathCode, { filePath: "src/math.ts" });
    const calcAst = analyzeSource(calcCode, { filePath: "src/calc.ts" });

    const mathSymbols = mathAst.symbols.map((s, idx) => ({ ...s, id: `sym-math-${idx}` }));
    const calcSymbols = calcAst.symbols.map((s, idx) => ({ ...s, id: `sym-calc-${idx}` }));

    const files = [
      { id: "f-math", path: "src/math.ts" },
      { id: "f-calc", path: "src/calc.ts" },
    ];
    const fileMap = createFileLookupMap(files);
    const calcDeps = resolveFileDependencies("src/calc.ts", calcAst.imports, fileMap).dependencies;

    const fileData = [
      {
        id: "f-math",
        path: "src/math.ts",
        content: mathCode,
        symbols: mathSymbols,
        imports: mathAst.imports,
        dependencies: [],
      },
      {
        id: "f-calc",
        path: "src/calc.ts",
        content: calcCode,
        symbols: calcSymbols,
        imports: calcAst.imports,
        dependencies: calcDeps,
      },
    ];

    const rels = analyzeSymbolRelationships(fileData);

    // calculate -> add (cross-file CALLS)
    const callAdd = rels.find(
      (r) => r.relationshipType === "CALLS" && r.metadata.sourceName === "calculate" && r.metadata.targetName === "add",
    );
    assert.ok(callAdd);
    assert.equal(callAdd.targetId, mathSymbols.find((s) => s.name === "add").id);

    // calculate -> helperMultiply (same-file CALLS)
    const callHelper = rels.find(
      (r) => r.relationshipType === "CALLS" && r.metadata.sourceName === "calculate" && r.metadata.targetName === "helperMultiply",
    );
    assert.ok(callHelper);
    assert.equal(callHelper.targetId, calcSymbols.find((s) => s.name === "helperMultiply").id);
  });

  it("extracts USES relationships for React JSX components and class instantiations", () => {
    const cardCode = `
import React from 'react';
export function UserCard() { return <div>Card</div>; }
`;

    const dashCode = `
import React from 'react';
import { UserCard } from './UserCard';

class AnalyticsEngine {}

export function Dashboard() {
  const engine = new AnalyticsEngine();
  return (
    <div>
      <UserCard />
    </div>
  );
}
`;

    const cardAst = analyzeSource(cardCode, { filePath: "src/UserCard.tsx" });
    const dashAst = analyzeSource(dashCode, { filePath: "src/Dashboard.tsx" });

    const cardSymbols = cardAst.symbols.map((s, idx) => ({ ...s, id: `sym-card-${idx}` }));
    const dashSymbols = dashAst.symbols.map((s, idx) => ({ ...s, id: `sym-dash-${idx}` }));

    const files = [
      { id: "f-card", path: "src/UserCard.tsx" },
      { id: "f-dash", path: "src/Dashboard.tsx" },
    ];
    const fileMap = createFileLookupMap(files);
    const dashDeps = resolveFileDependencies("src/Dashboard.tsx", dashAst.imports, fileMap).dependencies;

    const fileData = [
      {
        id: "f-card",
        path: "src/UserCard.tsx",
        content: cardCode,
        symbols: cardSymbols,
        imports: cardAst.imports,
        dependencies: [],
      },
      {
        id: "f-dash",
        path: "src/Dashboard.tsx",
        content: dashCode,
        symbols: dashSymbols,
        imports: dashAst.imports,
        dependencies: dashDeps,
      },
    ];

    const rels = analyzeSymbolRelationships(fileData);

    // Dashboard USES UserCard (JSX component)
    const usesCard = rels.find(
      (r) => r.relationshipType === "USES" && r.metadata.sourceName === "Dashboard" && r.metadata.targetName === "UserCard",
    );
    assert.ok(usesCard);
    assert.equal(usesCard.targetId, cardSymbols.find((s) => s.name === "UserCard").id);

    // Dashboard USES AnalyticsEngine (instantiation)
    const usesEngine = rels.find(
      (r) => r.relationshipType === "USES" && r.metadata.sourceName === "Dashboard" && r.metadata.targetName === "AnalyticsEngine",
    );
    assert.ok(usesEngine);
    assert.equal(usesEngine.targetId, dashSymbols.find((s) => s.name === "AnalyticsEngine").id);
  });

  it("handles unresolvable symbol references cleanly without creating fake IDs", () => {
    const code = `
import { unexportedSymbol } from './unknownModule';

export function testFn() {
  unexportedSymbol();
}
`;
    const ast = analyzeSource(code, { filePath: "src/test.ts" });
    const fileData = [
      {
        id: "f-test",
        path: "src/test.ts",
        content: code,
        symbols: ast.symbols.map((s, idx) => ({ ...s, id: `sym-${idx}` })),
        imports: ast.imports,
        dependencies: [],
      },
    ];

    const rels = analyzeSymbolRelationships(fileData);
    // Unresolvable call to unexportedSymbol should not create a fake dangling relationship
    const fakeRel = rels.find((r) => r.relationshipType === "CALLS" && r.metadata.targetName === "unexportedSymbol");
    assert.equal(fakeRel, undefined);
  });

  it("prevents duplicate relationships deterministically", () => {
    const code = `
function helper() { return 1; }

export function caller() {
  helper();
  helper();
  helper();
}
`;
    const ast = analyzeSource(code, { filePath: "src/dup.ts" });
    const symbols = ast.symbols.map((s, idx) => ({ ...s, id: `sym-${idx}` }));
    const fileData = [
      {
        id: "f-dup",
        path: "src/dup.ts",
        content: code,
        symbols,
        imports: [],
        dependencies: [],
      },
    ];

    const rels = analyzeSymbolRelationships(fileData);
    const callRels = rels.filter(
      (r) => r.relationshipType === "CALLS" && r.metadata.sourceName === "caller" && r.metadata.targetName === "helper",
    );
    // Even though helper() was called 3 times in caller(), exactly 1 relationship edge is created
    assert.equal(callRels.length, 1);
  });

  it("handles malformed source files without throwing or halting analysis", () => {
    const fileData = [
      {
        id: "f-broken",
        path: "src/broken.ts",
        content: "function brokenSyntax( { const = ;",
        symbols: [],
        imports: [],
        dependencies: [],
      },
      {
        id: "f-valid",
        path: "src/valid.ts",
        content: "export function validFn() {}",
        symbols: [{ id: "sym-valid", name: "validFn", type: "FUNCTION", startLine: 1, endLine: 1 }],
        imports: [],
        dependencies: [],
      },
    ];

    const rels = analyzeSymbolRelationships(fileData);
    assert.ok(Array.isArray(rels));
    const validRel = rels.find((r) => r.relationshipType === "CONTAINS" && r.sourceId === "f-valid");
    assert.ok(validRel);
  });
});

describe("Relationship Service Unit Tests", () => {
  it("persists symbol relationships while preserving Phase 9 IMPORTS relationships", async () => {
    let deletedWhere = null;
    let createdRecords = null;

    const mockPrisma = {
      relationship: {
        deleteMany: async ({ where }) => {
          deletedWhere = where;
          return { count: 0 };
        },
        createMany: async ({ data }) => {
          createdRecords = data;
          return { count: data.length };
        },
      },
    };

    const service = new RelationshipService({ prisma: mockPrisma });
    const relationships = [
      { sourceId: "sym-1", targetId: "sym-2", relationshipType: "CALLS", metadata: { caller: "a" } },
      { sourceId: "sym-1", targetId: "sym-3", relationshipType: "EXTENDS", metadata: {} },
    ];

    const result = await service.persistSymbolRelationships("repo-test", relationships);

    assert.equal(result.count, 2);
    assert.equal(deletedWhere.repositoryId, "repo-test");
    // Verify that deletion ONLY targeted symbol relationship types, preserving IMPORTS
    assert.deepEqual(deletedWhere.relationshipType.in, SYMBOL_RELATIONSHIP_TYPES);
    assert.ok(!deletedWhere.relationshipType.in.includes("IMPORTS"));

    assert.equal(createdRecords.length, 2);
    assert.equal(createdRecords[0].repositoryId, "repo-test");
    assert.equal(createdRecords[0].relationshipType, "CALLS");
  });
});
