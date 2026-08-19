import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import {
  buildFileTree,
  findNodeByPath,
  flattenTree,
  getDirectoryChildren,
  normalizePath,
  sortTreeNodes,
} from "../src/utils/fileTree.js";
import { FileTreeService, FileTreeError } from "../src/services/fileTree.service.js";

describe("File Tree Utility Tests", () => {
  it("normalizes path separators and trims trailing slashes", () => {
    assert.equal(normalizePath("src\\components\\Header.tsx"), "src/components/Header.tsx");
    assert.equal(normalizePath("/src/index.ts/"), "src/index.ts");
    assert.equal(normalizePath("///a//b///c.js"), "a/b/c.js");
    assert.equal(normalizePath(""), "");
    assert.equal(normalizePath(null), "");
  });

  it("builds a hierarchical tree representing nested folders and root files", () => {
    const rawFiles = [
      { path: "README.md", size: 800 },
      { path: "package.json", size: 350 },
      { path: "src/index.ts", size: 500 },
      { path: "src/components/Header.tsx", size: 1200 },
      { path: "src/components/Button.tsx", size: 600 },
      { path: "src/utils/math.ts", size: 300 },
      { path: "public/favicon.ico", size: 1500 },
    ];

    const tree = buildFileTree(rawFiles, { repositoryId: "repo-1" });

    assert.equal(tree.length, 4); // public (dir), src (dir), package.json (file), README.md (file)

    // Check directory sorting: directories first, then alphabetical
    assert.equal(tree[0].name, "public");
    assert.equal(tree[0].type, "dir");
    assert.equal(tree[1].name, "src");
    assert.equal(tree[1].type, "dir");
    assert.equal(tree[2].name, "package.json");
    assert.equal(tree[2].type, "file");
    assert.equal(tree[3].name, "README.md");
    assert.equal(tree[3].type, "file");

    // Check nested src children
    const srcNode = tree.find((n) => n.name === "src");
    assert.ok(srcNode);
    assert.equal(srcNode.children.length, 3); // components (dir), utils (dir), index.ts (file)
    assert.equal(srcNode.children[0].name, "components");
    assert.equal(srcNode.children[0].type, "dir");
    assert.equal(srcNode.children[1].name, "utils");
    assert.equal(srcNode.children[1].type, "dir");
    assert.equal(srcNode.children[2].name, "index.ts");
    assert.equal(srcNode.children[2].type, "file");

    // Check nested components children
    const compNode = srcNode.children.find((n) => n.name === "components");
    assert.ok(compNode);
    assert.equal(compNode.children.length, 2);
    assert.equal(compNode.children[0].name, "Button.tsx");
    assert.equal(compNode.children[1].name, "Header.tsx");
  });

  it("captures complete and accurate file metadata", () => {
    const fileEntries = [
      {
        path: "src/components/Button.tsx",
        name: "Button.tsx",
        size: 1024,
        repositoryId: "custom-repo-id",
      },
    ];

    const tree = buildFileTree(fileEntries, { repositoryId: "default-repo-id" });
    const buttonNode = findNodeByPath(tree, "src/components/Button.tsx");

    assert.ok(buttonNode);
    assert.equal(buttonNode.name, "Button.tsx");
    assert.equal(buttonNode.filename, "Button.tsx");
    assert.equal(buttonNode.path, "src/components/Button.tsx");
    assert.equal(buttonNode.extension, ".tsx");
    assert.equal(buttonNode.type, "file");
    assert.equal(buttonNode.size, 1024);
    assert.equal(buttonNode.repositoryId, "custom-repo-id");
    assert.equal(buttonNode.isSupportedSource, true);
  });

  it("distinguishes supported and unsupported source extensions", () => {
    const mixedFiles = [
      { path: "src/app.js" },
      { path: "src/App.jsx" },
      { path: "src/main.ts" },
      { path: "src/Header.tsx" },
      { path: "src/server.mjs" },
      { path: "src/config.cjs" },
      { path: "README.md" },
      { path: "package.json" },
      { path: "styles/main.css" },
    ];

    const tree = buildFileTree(mixedFiles);

    assert.equal(findNodeByPath(tree, "src/app.js").isSupportedSource, true);
    assert.equal(findNodeByPath(tree, "src/App.jsx").isSupportedSource, true);
    assert.equal(findNodeByPath(tree, "src/main.ts").isSupportedSource, true);
    assert.equal(findNodeByPath(tree, "src/Header.tsx").isSupportedSource, true);
    assert.equal(findNodeByPath(tree, "src/server.mjs").isSupportedSource, true);
    assert.equal(findNodeByPath(tree, "src/config.cjs").isSupportedSource, true);
    assert.equal(findNodeByPath(tree, "README.md").isSupportedSource, false);
    assert.equal(findNodeByPath(tree, "package.json").isSupportedSource, false);
    assert.equal(findNodeByPath(tree, "styles/main.css").isSupportedSource, false);
  });

  it("handles duplicate paths deterministically without creating duplicate nodes", () => {
    const duplicates = [
      { path: "src/index.ts", size: 100 },
      { path: "src/index.ts", size: 200 },
      { path: "src", type: "dir" },
      { path: "src", type: "dir" },
      { path: "package.json", size: 50 },
      { path: "package.json", size: 50 },
    ];

    const tree = buildFileTree(duplicates);

    assert.equal(tree.length, 2); // src (dir), package.json (file)
    const srcNode = tree.find((n) => n.name === "src");
    assert.equal(srcNode.children.length, 1); // single index.ts
    assert.equal(srcNode.children[0].path, "src/index.ts");

    const flat = flattenTree(tree);
    assert.equal(flat.length, 3); // src (dir), index.ts (file), package.json (file)
  });

  it("handles empty repository / entries array gracefully", () => {
    assert.deepEqual(buildFileTree([]), []);
    assert.deepEqual(buildFileTree(null), []);
    assert.deepEqual(buildFileTree(undefined), []);
  });

  it("finds nodes by path and gets directory children accurately", () => {
    const files = [
      { path: "src/a.ts" },
      { path: "src/b.ts" },
      { path: "src/sub/c.ts" },
      { path: "root.txt" },
    ];

    const tree = buildFileTree(files);

    const found = findNodeByPath(tree, "src/sub/c.ts");
    assert.ok(found);
    assert.equal(found.name, "c.ts");

    const notFound = findNodeByPath(tree, "nonexistent/file.ts");
    assert.equal(notFound, null);

    const srcChildren = getDirectoryChildren(tree, "src");
    assert.equal(srcChildren.length, 3); // sub (dir), a.ts (file), b.ts (file)

    const rootChildren = getDirectoryChildren(tree, "");
    assert.equal(rootChildren.length, 2); // src (dir), root.txt (file)
  });
});

describe("File Tree Service Unit Tests", () => {
  it("retrieves file tree from database and returns structured stats", async () => {
    const mockRepo = {
      id: "repo-uuid-1",
      owner: "testowner",
      name: "testrepo",
      githubUrl: "https://github.com/testowner/testrepo",
      defaultBranch: "main",
      language: "TypeScript",
      description: "Test description",
      stars: 55,
    };

    const mockFiles = [
      { id: "f1", repositoryId: "repo-uuid-1", path: "src/index.ts", name: "index.ts", extension: ".ts", type: "file", size: 500, loc: 0 },
      { id: "f2", repositoryId: "repo-uuid-1", path: "src/components/App.tsx", name: "App.tsx", extension: ".tsx", type: "file", size: 1500, loc: 0 },
      { id: "f3", repositoryId: "repo-uuid-1", path: "package.json", name: "package.json", extension: ".json", type: "file", size: 300, loc: 0 },
      { id: "f4", repositoryId: "repo-uuid-1", path: "README.md", name: "README.md", extension: ".md", type: "file", size: 700, loc: 0 },
    ];

    const mockDb = {
      repository: {
        findUnique: async ({ where }) => {
          if (where.id === "repo-uuid-1") return mockRepo;
          return null;
        },
      },
      file: {
        findMany: async ({ where }) => {
          if (where.repositoryId === "repo-uuid-1") return mockFiles;
          return [];
        },
      },
    };

    const service = new FileTreeService({ prisma: mockDb });
    const result = await service.getRepositoryFileTree("repo-uuid-1");

    assert.equal(result.success, true);
    assert.equal(result.repository.id, "repo-uuid-1");
    assert.equal(result.repository.owner, "testowner");
    assert.equal(result.repository.name, "testrepo");
    assert.equal(result.stats.totalFiles, 4);
    assert.equal(result.stats.totalDirs, 2); // src, src/components
    assert.equal(result.stats.sourceFiles, 2); // index.ts, App.tsx
    assert.equal(result.stats.totalSize, 3000);
    assert.ok(Array.isArray(result.tree));
  });

  it("throws 404 when repository is not found in database", async () => {
    const mockDb = {
      repository: {
        findUnique: async () => null,
      },
    };

    const service = new FileTreeService({ prisma: mockDb });

    await assert.rejects(
      () => service.getRepositoryFileTree("nonexistent-uuid"),
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /not found/i);
        return true;
      },
    );
  });

  it("retrieves a single file record by path", async () => {
    const mockDb = {
      file: {
        findUnique: async ({ where }) => {
          if (where.repositoryId_path.path === "src/index.ts") {
            return {
              id: "f-123",
              repositoryId: "repo-uuid-1",
              path: "src/index.ts",
              name: "index.ts",
              extension: ".ts",
              type: "file",
              size: 500,
              loc: 25,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        },
      },
    };

    const service = new FileTreeService({ prisma: mockDb });
    const result = await service.getFileByPath("repo-uuid-1", "src/index.ts");

    assert.equal(result.success, true);
    assert.equal(result.file.id, "f-123");
    assert.equal(result.file.name, "index.ts");
    assert.equal(result.file.isSupportedSource, true);
  });
});

describe("GET /api/repositories/:id/files HTTP Endpoint Tests", () => {
  let server;
  let baseUrl;

  before((t, done) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((t, done) => {
    server.close(done);
  });

  it("returns 404 for nonexistent repository ID", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/00000000-0000-0000-0000-000000000000/files`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, "error");
    assert.match(body.message, /not found/i);
  });

  it("returns 404 for nonexistent repository ID on GET /api/repositories/:id", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/00000000-0000-0000-0000-000000000000`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.status, "error");
    assert.match(body.message, /not found/i);
  });
});
