import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IngestionService } from "../src/services/ingestion.service.js";

describe("TEST-002: Concurrent Repository Ingestion Race Condition Tests", () => {
  it("safely handles multiple simultaneous ingestion requests for the same repository without duplicate records", async () => {
    // In-memory mock database with simulated unique constraint on (owner, name)
    const dbState = {
      repositories: new Map(), // key: "owner/name" -> repo object
      files: [],
      analyses: [],
    };

    let repoIdCounter = 1;
    let analysisIdCounter = 1;

    const mockPrisma = {
      repository: {
        upsert: async ({ where, update, create }) => {
          const key = `${where.owner_name.owner}/${where.owner_name.name}`;
          let repo = dbState.repositories.get(key);
          if (repo) {
            repo = { ...repo, ...update, updatedAt: new Date() };
          } else {
            repo = {
              id: `repo-uuid-${repoIdCounter++}`,
              ...create,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          dbState.repositories.set(key, repo);
          return repo;
        },
        findUnique: async ({ where }) => {
          if (where.id) {
            for (const r of dbState.repositories.values()) {
              if (r.id === where.id) return r;
            }
          }
          return null;
        },
      },
      file: {
        deleteMany: async ({ where }) => {
          const initialLen = dbState.files.length;
          dbState.files = dbState.files.filter((f) => f.repositoryId !== where.repositoryId);
          return { count: initialLen - dbState.files.length };
        },
        createMany: async ({ data }) => {
          dbState.files.push(...data);
          return { count: data.length };
        },
      },
      analysis: {
        create: async ({ data }) => {
          const rec = {
            id: `analysis-uuid-${analysisIdCounter++}`,
            ...data,
          };
          dbState.analyses.push(rec);
          return rec;
        },
      },
    };

    const mockGithubService = {
      validateAndFetchRepository: async (url) => ({
        valid: true,
        repository: {
          owner: "facebook",
          name: "react",
          fullName: "facebook/react",
          githubUrl: "https://github.com/facebook/react",
          defaultBranch: "main",
          language: "JavaScript",
          description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
          stars: 220000,
        },
      }),
      fetchRepositoryTree: async () => [
        { path: "package.json", type: "blob", size: 1024, sha: "s1" },
        { path: "packages/react/index.js", type: "blob", size: 2048, sha: "s2" },
        { path: "packages/react-dom/index.js", type: "blob", size: 4096, sha: "s3" },
      ],
    };

    const service = new IngestionService({
      githubService: mockGithubService,
      prisma: mockPrisma,
    });

    const repoUrl = "https://github.com/facebook/react";
    const CONCURRENT_REQUESTS = 6;

    // Fire 6 simultaneous ingestion requests for the exact same repository
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      service.ingestRepository(repoUrl),
    );

    const results = await Promise.all(promises);

    // 1. Verify all concurrent requests succeeded with consistent metadata
    assert.equal(results.length, CONCURRENT_REQUESTS);
    for (const res of results) {
      assert.equal(res.success, true);
      assert.equal(res.repository.owner, "facebook");
      assert.equal(res.repository.name, "react");
      assert.equal(res.stats.ingestedFiles, 3);
    }

    // 2. Verify that EXACTLY ONE repository record exists in the database
    assert.equal(dbState.repositories.size, 1);
    const storedRepo = dbState.repositories.get("facebook/react");
    assert.ok(storedRepo);
    assert.equal(storedRepo.owner, "facebook");
    assert.equal(storedRepo.name, "react");

    // 3. Verify files are properly populated without duplication
    const filesForRepo = dbState.files.filter((f) => f.repositoryId === storedRepo.id);
    assert.equal(filesForRepo.length, 3);
  });
});
