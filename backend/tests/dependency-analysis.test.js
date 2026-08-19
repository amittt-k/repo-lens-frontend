import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveImport,
  resolveFileDependencies,
  detectCircularDependencies,
  buildRepositoryDependencyGraph,
  extractPackageName,
  isPackageImport,
} from "../src/analyzers/javascript/dependencyResolver.js";
import { DependencyService } from "../src/services/dependency.service.js";
import { analyzeSource } from "../src/analyzers/javascript/astAnalyzer.js";

describe("Dependency Resolver Unit Tests", () => {
  const repositoryFiles = [
    "src/index.ts",
    "src/App.tsx",
    "src/components/Header.tsx",
    "src/components/Button.tsx",
    "src/components/index.ts",
    "src/utils/math.ts",
    "src/utils/format.js",
    "src/config/app.json",
    "lib/helper.ts",
  ];

  it("resolves same-directory relative imports (extensionless and explicit)", () => {
    // Same directory extensionless
    const res1 = resolveImport("src/index.ts", "./App", repositoryFiles);
    assert.equal(res1.resolved, true);
    assert.equal(res1.targetPath, "src/App.tsx");
    assert.equal(res1.isExternal, false);

    // Same directory explicit extension
    const res2 = resolveImport("src/utils/math.ts", "./format.js", repositoryFiles);
    assert.equal(res2.resolved, true);
    assert.equal(res2.targetPath, "src/utils/format.js");
  });

  it("resolves parent-directory relative imports (../ and ../../)", () => {
    const res1 = resolveImport("src/components/Header.tsx", "../utils/math", repositoryFiles);
    assert.equal(res1.resolved, true);
    assert.equal(res1.targetPath, "src/utils/math.ts");

    const res2 = resolveImport("src/components/Header.tsx", "../../lib/helper", repositoryFiles);
    assert.equal(res2.resolved, true);
    assert.equal(res2.targetPath, "lib/helper.ts");
  });

  it("resolves directory imports via index files", () => {
    const res = resolveImport("src/App.tsx", "./components", repositoryFiles);
    assert.equal(res.resolved, true);
    assert.equal(res.targetPath, "src/components/index.ts");
  });

  it("classifies external package imports accurately", () => {
    const packages = [
      { source: "react", expectedPkg: "react" },
      { source: "react-dom/client", expectedPkg: "react-dom" },
      { source: "@babel/parser", expectedPkg: "@babel/parser" },
      { source: "@babel/parser/lib/index", expectedPkg: "@babel/parser" },
      { source: "lodash/debounce", expectedPkg: "lodash" },
      { source: "node:path", expectedPkg: "node:path" },
    ];

    for (const { source, expectedPkg } of packages) {
      assert.equal(isPackageImport(source), true);
      assert.equal(extractPackageName(source), expectedPkg);

      const res = resolveImport("src/index.ts", source, repositoryFiles);
      assert.equal(res.resolved, false);
      assert.equal(res.isExternal, true);
      assert.equal(res.packageName, expectedPkg);
      assert.equal(res.targetPath, null);
    }
  });

  it("marks missing local imports as unresolved without throwing", () => {
    const res = resolveImport("src/index.ts", "./nonExistentFile", repositoryFiles);
    assert.equal(res.resolved, false);
    assert.equal(res.isExternal, false);
    assert.equal(res.targetPath, null);
    assert.equal(res.unresolvedReason, "file_not_found");
  });

  it("resolves common path aliases (@/ -> src/)", () => {
    const res1 = resolveImport("src/App.tsx", "@/components/Header", repositoryFiles);
    assert.equal(res1.resolved, true);
    assert.equal(res1.targetPath, "src/components/Header.tsx");

    const res2 = resolveImport("src/App.tsx", "@/utils/math", repositoryFiles);
    assert.equal(res2.resolved, true);
    assert.equal(res2.targetPath, "src/utils/math.ts");
  });

  it("prevents false-positive dependency resolution", () => {
    // Unmatched alias or relative path that does not exist
    const res1 = resolveImport("src/App.tsx", "@/unknown/path", repositoryFiles);
    assert.equal(res1.resolved, false);
    assert.equal(res1.targetPath, null);

    const res2 = resolveImport("src/App.tsx", "./components/FakeComponent", repositoryFiles);
    assert.equal(res2.resolved, false);
    assert.equal(res2.targetPath, null);
  });
});

describe("Circular Dependency Detection Tests", () => {
  it("detects direct two-node circular dependencies (A -> B -> A)", () => {
    const graph = {
      "src/a.ts": ["src/b.ts"],
      "src/b.ts": ["src/a.ts"],
    };

    const cycles = detectCircularDependencies(graph);
    assert.equal(cycles.length, 1);
    assert.deepEqual(cycles[0], ["src/a.ts", "src/b.ts", "src/a.ts"]);
  });

  it("detects three-node circular dependencies (A -> B -> C -> A)", () => {
    const graph = {
      "src/a.ts": ["src/b.ts"],
      "src/b.ts": ["src/c.ts"],
      "src/c.ts": ["src/a.ts"],
      "src/d.ts": ["src/b.ts"], // non-cyclic incoming branch
    };

    const cycles = detectCircularDependencies(graph);
    assert.equal(cycles.length, 1);
    assert.deepEqual(cycles[0], ["src/a.ts", "src/b.ts", "src/c.ts", "src/a.ts"]);
  });

  it("returns empty array for acyclic dependency graphs (DAG)", () => {
    const graph = {
      "src/index.ts": ["src/App.tsx", "src/utils.ts"],
      "src/App.tsx": ["src/components/Button.tsx", "src/utils.ts"],
      "src/components/Button.tsx": ["src/utils.ts"],
      "src/utils.ts": [],
    };

    const cycles = detectCircularDependencies(graph);
    assert.equal(cycles.length, 0);
  });

  it("handles self-referential import cycles cleanly", () => {
    const graph = {
      "src/self.ts": ["src/self.ts"],
    };

    const cycles = detectCircularDependencies(graph);
    assert.equal(cycles.length, 1);
    assert.deepEqual(cycles[0], ["src/self.ts", "src/self.ts"]);
  });
});

describe("Complete Repository Dependency Analysis Tests", () => {
  it("integrates with Phase 8 AST analysis results seamlessly", () => {
    const indexCode = `
import React from 'react';
import { App } from './App';
import { helper } from './utils/helper';
`;

    const appCode = `
import React from 'react';
import { Button } from './components/Button';
import { helper } from './utils/helper';
`;

    const buttonCode = `
import React from 'react';
import { helper } from '../utils/helper';
`;

    const helperCode = `
export function helper() { return 1; }
`;

    const availableFiles = [
      { id: "f-index", path: "src/index.tsx" },
      { id: "f-app", path: "src/App.tsx" },
      { id: "f-btn", path: "src/components/Button.tsx" },
      { id: "f-help", path: "src/utils/helper.ts" },
    ];

    const fileAnalyses = [
      { path: "src/index.tsx", fileId: "f-index", imports: analyzeSource(indexCode).imports },
      { path: "src/App.tsx", fileId: "f-app", imports: analyzeSource(appCode).imports },
      { path: "src/components/Button.tsx", fileId: "f-btn", imports: analyzeSource(buttonCode).imports },
      { path: "src/utils/helper.ts", fileId: "f-help", imports: analyzeSource(helperCode).imports },
    ];

    const result = buildRepositoryDependencyGraph(fileAnalyses, availableFiles);

    assert.equal(result.totalFiles, 4);
    assert.deepEqual(result.packages, ["react"]);
    assert.equal(result.hasCycles, false);

    // Verify index.tsx dependencies
    const indexDep = result.fileDependencies.find((f) => f.sourcePath === "src/index.tsx");
    assert.ok(indexDep);
    assert.deepEqual(indexDep.resolvedFiles, ["src/App.tsx", "src/utils/helper.ts"]);
    assert.deepEqual(indexDep.externalPackages, ["react"]);

    // Multiple files (index, app, button) importing the same helper
    assert.ok(result.dependencyGraph["src/index.tsx"].includes("src/utils/helper.ts"));
    assert.ok(result.dependencyGraph["src/App.tsx"].includes("src/utils/helper.ts"));
    assert.ok(result.dependencyGraph["src/components/Button.tsx"].includes("src/utils/helper.ts"));
  });
});

describe("Dependency Service Unit Tests", () => {
  it("persists IMPORTS relationships via Prisma Relationship delegate", async () => {
    let deletedWhere = null;
    let createdRelationships = null;

    const mockPrisma = {
      relationship: {
        deleteMany: async ({ where }) => {
          deletedWhere = where;
          return { count: 0 };
        },
        createMany: async ({ data }) => {
          createdRelationships = data;
          return { count: data.length };
        },
      },
    };

    const service = new DependencyService({ prisma: mockPrisma });

    const fileDependencies = [
      {
        sourceFileId: "f-app",
        sourcePath: "src/App.tsx",
        dependencies: [
          {
            rawSource: "./components/Button",
            resolved: true,
            targetPath: "src/components/Button.tsx",
            targetFileId: "f-btn",
            startLine: 1,
            endLine: 1,
          },
          {
            rawSource: "react",
            resolved: false,
            targetPath: null,
            isExternal: true,
          },
        ],
      },
    ];

    const result = await service.persistDependencies("repo-123", fileDependencies);

    assert.equal(result.count, 1);
    assert.equal(deletedWhere.repositoryId, "repo-123");
    assert.equal(deletedWhere.relationshipType, "IMPORTS");
    assert.equal(createdRelationships.length, 1);
    assert.equal(createdRelationships[0].repositoryId, "repo-123");
    assert.equal(createdRelationships[0].sourceId, "f-app");
    assert.equal(createdRelationships[0].targetId, "f-btn");
    assert.equal(createdRelationships[0].relationshipType, "IMPORTS");
    assert.equal(createdRelationships[0].metadata.rawSource, "./components/Button");
  });
});
