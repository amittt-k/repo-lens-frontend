import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { shouldIngestFile, isSupportedSourceFile } from "../src/utils/fileFilter.js";
import { IngestionService } from "../src/services/ingestion.service.js";
import { GitHubApiError } from "../src/services/github.service.js";

describe("File Filter Unit Tests", () => {
  it("ignores standard excluded directories", () => {
    assert.equal(shouldIngestFile(".git/config", "file"), false);
    assert.equal(shouldIngestFile(".github/workflows/ci.yml", "file"), false);
    assert.equal(shouldIngestFile("node_modules/express/index.js", "file"), false);
    assert.equal(shouldIngestFile("dist/bundle.js", "file"), false);
    assert.equal(shouldIngestFile("build/static/main.js", "file"), false);
    assert.equal(shouldIngestFile(".next/server/pages/index.js", "file"), false);
    assert.equal(shouldIngestFile("coverage/lcov.info", "file"), false);
    assert.equal(shouldIngestFile(".output/server/index.mjs", "file"), false);
    assert.equal(shouldIngestFile(".wrangler/state/v3", "file"), false);
  });

  it("ignores secret and environment files", () => {
    assert.equal(shouldIngestFile(".env", "file"), false);
    assert.equal(shouldIngestFile(".env.local", "file"), false);
    assert.equal(shouldIngestFile(".env.production", "file"), false);
    assert.equal(shouldIngestFile("config/.env.staging", "file"), false);
  });

  it("ignores lockfiles, minified files, and source maps", () => {
    assert.equal(shouldIngestFile("package-lock.json", "file"), false);
    assert.equal(shouldIngestFile("yarn.lock", "file"), false);
    assert.equal(shouldIngestFile("pnpm-lock.yaml", "file"), false);
    assert.equal(shouldIngestFile("public/vendor.min.js", "file"), false);
    assert.equal(shouldIngestFile("dist/bundle.js.map", "file"), false);
  });

  it("ignores binary media and font files", () => {
    assert.equal(shouldIngestFile("assets/logo.png", "file"), false);
    assert.equal(shouldIngestFile("public/icon.ico", "file"), false);
    assert.equal(shouldIngestFile("fonts/inter.woff2", "file"), false);
    assert.equal(shouldIngestFile("docs/manual.pdf", "file"), false);
  });

  it("accepts valid source code and configuration files", () => {
    assert.equal(shouldIngestFile("src/index.ts", "file"), true);
    assert.equal(shouldIngestFile("src/components/Header.tsx", "file"), true);
    assert.equal(shouldIngestFile("lib/utils.js", "file"), true);
    assert.equal(shouldIngestFile("package.json", "file"), true);
    assert.equal(shouldIngestFile("README.md", "file"), true);
    assert.equal(shouldIngestFile("src/styles.css", "file"), true);
    assert.equal(shouldIngestFile("src", "tree"), true);
  });

  it("identifies supported JavaScript and TypeScript source files", () => {
    assert.equal(isSupportedSourceFile("src/app.js"), true);
    assert.equal(isSupportedSourceFile("src/App.jsx"), true);
    assert.equal(isSupportedSourceFile("src/main.ts"), true);
    assert.equal(isSupportedSourceFile("src/Button.tsx"), true);
    assert.equal(isSupportedSourceFile("src/server.mjs"), true);
    assert.equal(isSupportedSourceFile("src/config.cjs"), true);
    assert.equal(isSupportedSourceFile("package.json"), false);
    assert.equal(isSupportedSourceFile("README.md"), false);
  });
});

describe("Ingestion Service Unit Tests", () => {
  it("ingests repository, filters files, and persists metadata cleanly", async () => {
    const mockRepoMeta = {
      valid: true,
      repository: {
        owner: "test-org",
        name: "test-app",
        fullName: "test-org/test-app",
        githubUrl: "https://github.com/test-org/test-app",
        defaultBranch: "main",
        language: "TypeScript",
        description: "A test application",
        stars: 42,
      },
    };

    const mockTree = [
      { path: "src", type: "tree" },
      { path: "src/index.ts", type: "blob", size: 500 },
      { path: "src/App.tsx", type: "blob", size: 1200 },
      { path: "package.json", type: "blob", size: 300 },
      { path: "node_modules/express/index.js", type: "blob", size: 9000 },
      { path: ".env", type: "blob", size: 100 },
      { path: "assets/banner.png", type: "blob", size: 25000 },
    ];

    let upsertCalledWith = null;
    let deleteCalledWith = null;
    let createdFiles = null;
    let createdAnalysis = null;

    const mockPrisma = {
      repository: {
        upsert: async (args) => {
          upsertCalledWith = args;
          return {
            id: "repo-123",
            owner: "test-org",
            name: "test-app",
            githubUrl: "https://github.com/test-org/test-app",
            defaultBranch: "main",
            language: "TypeScript",
            description: "A test application",
            stars: 42,
          };
        },
      },
      file: {
        deleteMany: async (args) => {
          deleteCalledWith = args;
          return { count: 0 };
        },
        createMany: async (args) => {
          createdFiles = args.data;
          return { count: args.data.length };
        },
      },
      analysis: {
        create: async (args) => {
          createdAnalysis = args.data;
          return {
            id: "analysis-123",
            status: "COMPLETED",
            ...args.data,
          };
        },
      },
    };

    const mockGithub = {
      validateAndFetchRepository: async () => mockRepoMeta,
      fetchRepositoryTree: async () => mockTree,
    };

    const service = new IngestionService({
      githubService: mockGithub,
      prisma: mockPrisma,
    });

    const result = await service.ingestRepository("https://github.com/test-org/test-app");

    // 1. Ingestion outcome assertions
    assert.equal(result.success, true);
    assert.equal(result.repository.id, "repo-123");
    assert.equal(result.repository.owner, "test-org");
    assert.equal(result.repository.name, "test-app");
    assert.equal(result.repository.githubUrl, "https://github.com/test-org/test-app");
    assert.equal(result.stats.totalEntries, 7);
    assert.equal(result.stats.ingestedFiles, 3); // src/index.ts, src/App.tsx, package.json
    assert.equal(result.stats.ingestedDirs, 1); // src
    assert.equal(result.stats.sourceFiles, 2); // src/index.ts, src/App.tsx
    assert.equal(result.stats.ignoredEntries, 3); // node_modules, .env, assets/banner.png

    // 2. Repository persistence assertions
    assert.equal(upsertCalledWith.where.owner_name.owner, "test-org");
    assert.equal(upsertCalledWith.where.owner_name.name, "test-app");
    assert.equal(upsertCalledWith.create.stars, 42);

    // 3. File persistence assertions
    assert.equal(deleteCalledWith.where.repositoryId, "repo-123");
    assert.equal(createdFiles.length, 4); // 3 files + 1 dir
    assert.ok(createdFiles.some((f) => f.name === "index.ts" && f.extension === ".ts" && f.repositoryId === "repo-123"));
    assert.ok(createdFiles.some((f) => f.name === "src" && f.type === "dir" && f.extension === null));

    // 4. Analysis record assertion
    assert.equal(createdAnalysis.status, "COMPLETED");
    assert.equal(createdAnalysis.metadata.stage, "INGESTION");
  });

  it("handles duplicate/repeated ingestion idempotently", async () => {
    let upsertCount = 0;
    let deleteCount = 0;
    let fileCreateCount = 0;

    const mockRepoMeta = {
      valid: true,
      repository: {
        owner: "test-org",
        name: "test-app",
        githubUrl: "https://github.com/test-org/test-app",
        defaultBranch: "main",
        language: "JavaScript",
        stars: 100,
      },
    };

    const mockPrisma = {
      repository: {
        upsert: async () => {
          upsertCount++;
          return { id: "repo-123", owner: "test-org", name: "test-app", stars: 100 };
        },
      },
      file: {
        deleteMany: async () => {
          deleteCount++;
          return { count: 2 };
        },
        createMany: async (args) => {
          fileCreateCount += args.data.length;
          return { count: args.data.length };
        },
      },
      analysis: {
        create: async (args) => ({ id: "analysis-re", status: "COMPLETED", ...args.data }),
      },
    };

    const mockGithub = {
      validateAndFetchRepository: async () => mockRepoMeta,
      fetchRepositoryTree: async () => [
        { path: "index.js", type: "blob", size: 100 },
        { path: "package.json", type: "blob", size: 200 },
      ],
    };

    const service = new IngestionService({
      githubService: mockGithub,
      prisma: mockPrisma,
    });

    // Ingest first time
    const result1 = await service.ingestRepository("https://github.com/test-org/test-app");
    assert.equal(result1.success, true);

    // Ingest second time (re-ingestion)
    const result2 = await service.ingestRepository("https://github.com/test-org/test-app");
    assert.equal(result2.success, true);

    assert.equal(upsertCount, 2);
    assert.equal(deleteCount, 2);
    assert.equal(fileCreateCount, 4); // 2 files each run
  });

  it("handles empty repositories cleanly", async () => {
    const mockRepoMeta = {
      valid: true,
      repository: {
        owner: "test-org",
        name: "empty-repo",
        fullName: "test-org/empty-repo",
        githubUrl: "https://github.com/test-org/empty-repo",
        defaultBranch: "main",
        language: null,
        description: null,
        stars: 0,
      },
    };

    const mockPrisma = {
      repository: {
        upsert: async () => ({
          id: "repo-empty",
          owner: "test-org",
          name: "empty-repo",
          githubUrl: "https://github.com/test-org/empty-repo",
          defaultBranch: "main",
          language: null,
          description: null,
          stars: 0,
        }),
      },
      file: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async () => ({ count: 0 }),
      },
      analysis: {
        create: async () => ({
          id: "analysis-empty",
          status: "COMPLETED",
        }),
      },
    };

    const mockGithub = {
      validateAndFetchRepository: async () => mockRepoMeta,
      fetchRepositoryTree: async () => [],
    };

    const service = new IngestionService({
      githubService: mockGithub,
      prisma: mockPrisma,
    });

    const result = await service.ingestRepository("https://github.com/test-org/empty-repo");

    assert.equal(result.success, true);
    assert.equal(result.stats.totalEntries, 0);
    assert.equal(result.stats.ingestedFiles, 0);
  });

  it("propagates repository not found (404) during ingestion", async () => {
    const mockGithub = {
      validateAndFetchRepository: async () => {
        throw new GitHubApiError("Repository not found on GitHub", 404);
      },
      fetchRepositoryTree: async () => [],
    };

    const service = new IngestionService({
      githubService: mockGithub,
      prisma: {},
    });

    await assert.rejects(
      () => service.ingestRepository("https://github.com/fake-user/missing-repo"),
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /not found on GitHub/i);
        return true;
      },
    );
  });

  it("propagates rate-limit error (429) during ingestion", async () => {
    const mockGithub = {
      validateAndFetchRepository: async () => {
        throw new GitHubApiError("GitHub API rate limit exceeded", 429);
      },
      fetchRepositoryTree: async () => [],
    };

    const service = new IngestionService({
      githubService: mockGithub,
      prisma: {},
    });

    await assert.rejects(
      () => service.ingestRepository("https://github.com/facebook/react"),
      (err) => {
        assert.equal(err.statusCode, 429);
        assert.match(err.message, /rate limit exceeded/i);
        return true;
      },
    );
  });

  it("handles tree retrieval failures cleanly", async () => {
    const mockRepoMeta = {
      valid: true,
      repository: {
        owner: "facebook",
        name: "react",
        defaultBranch: "main",
      },
    };

    const mockGithub = {
      validateAndFetchRepository: async () => mockRepoMeta,
      fetchRepositoryTree: async () => {
        throw new GitHubApiError("GitHub API tree retrieval failed (500)", 502);
      },
    };

    const service = new IngestionService({
      githubService: mockGithub,
      prisma: {},
    });

    await assert.rejects(
      () => service.ingestRepository("https://github.com/facebook/react"),
      (err) => {
        assert.equal(err.statusCode, 502);
        assert.match(err.message, /tree retrieval failed/i);
        return true;
      },
    );
  });
});

describe("POST /api/repositories/ingest HTTP Endpoint Tests", () => {
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

  it("returns 400 when body is missing or empty", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, "error");
    assert.match(body.message, /Field "url" is required/);
  });

  it("returns 400 when url is not a valid GitHub repository", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://bitbucket.org/owner/repo" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, "error");
  });

  it("returns 400 when url is malformed", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-valid-url" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, "error");
  });
});
