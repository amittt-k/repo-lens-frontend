import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GitHubService } from "../src/services/github.service.js";

describe("GitHub Service Source-Fetching Strategy & Timeout Regression Tests", () => {
  it("1. selects parallel raw-file strategy directly when supportedPaths <= 50", async () => {
    let tarballCalled = false;
    const rawCalls = [];

    const mockFetch = async (url) => {
      if (url.includes("/tarball/")) {
        tarballCalled = true;
        throw new Error("Tarball should not be called for sparse repos");
      }
      if (url.includes("raw.githubusercontent.com")) {
        rawCalls.push(url);
        return {
          ok: true,
          status: 200,
          text: async () => `// content of ${url}`,
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    };

    const service = new GitHubService({ fetchFn: mockFetch });
    const supportedPaths = [
      "src/index.js",
      "src/components/App.jsx",
      "Part-1 Spring Boot/src/main/resources/static/app.js",
    ];

    const result = await service.fetchRepositorySourceFiles("owner", "repo", "main", supportedPaths);

    assert.equal(tarballCalled, false, "Must not invoke tarball for sparse repository (<=50 files)");
    assert.equal(result.size, 3);
    assert.equal(rawCalls.length, 3);
    assert.ok(result.has("src/index.js"));
    assert.ok(result.has("Part-1 Spring Boot/src/main/resources/static/app.js"));
    assert.match(rawCalls[2], /Part-1%20Spring%20Boot/);
  });

  it("2. selects tarball strategy for repositories with > 50 supported files", async () => {
    let tarballCalled = false;

    const mockFetch = async (url) => {
      if (url.includes("/tarball/")) {
        tarballCalled = true;
        // Return 404 to simulate tarball not found and test fallback
        return {
          ok: false,
          status: 404,
        };
      }
      if (url.includes("raw.githubusercontent.com")) {
        return {
          ok: true,
          status: 200,
          text: async () => "// content",
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    };

    const service = new GitHubService({ fetchFn: mockFetch });
    const supportedPaths = Array.from({ length: 55 }, (_, i) => `src/file_${i}.js`);

    const result = await service.fetchRepositorySourceFiles("owner", "repo", "main", supportedPaths);

    assert.equal(tarballCalled, true, "Must attempt tarball strategy for repository with > 50 supported files");
    assert.equal(result.size, 55, "Fallback must preserve all files");
  });

  it("3. tarball timeout falls back cleanly to parallel raw-file fetching", async () => {
    let tarballAttempted = false;
    let fallbackCalls = 0;

    const mockFetch = async (url, opts) => {
      if (url.includes("/tarball/")) {
        tarballAttempted = true;
        // Simulate a stalled stream that aborts
        throw new Error("Tarball download stalled or timed out");
      }
      if (url.includes("raw.githubusercontent.com")) {
        fallbackCalls++;
        return {
          ok: true,
          status: 200,
          text: async () => "export const foo = 1;",
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    };

    const service = new GitHubService({ fetchFn: mockFetch });
    const supportedPaths = Array.from({ length: 60 }, (_, i) => `src/file_${i}.js`);

    const result = await service.fetchRepositorySourceFiles("owner", "repo", "main", supportedPaths, {
      tarballTimeoutMs: 50,
    });

    assert.equal(tarballAttempted, true);
    assert.equal(result.size, 60);
    assert.equal(fallbackCalls, 60);
  });

  it("4. handles single raw-file failure or timeout without failing the entire batch", async () => {
    const mockFetch = async (url) => {
      if (url.includes("broken-file.js")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
        };
      }
      if (url.includes("raw.githubusercontent.com")) {
        return {
          ok: true,
          status: 200,
          text: async () => "export default function() {}",
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    };

    const service = new GitHubService({ fetchFn: mockFetch });
    const supportedPaths = [
      "src/good-1.js",
      "src/broken-file.js",
      "src/good-2.js",
    ];

    const result = await service.fetchRepositorySourceFiles("owner", "repo", "main", supportedPaths);

    assert.equal(result.size, 2, "Successful files must be preserved even if one fails");
    assert.ok(result.has("src/good-1.js"));
    assert.ok(result.has("src/good-2.js"));
    assert.equal(result.has("src/broken-file.js"), false);
  });

  it("5. encodes file paths with spaces and special characters properly", async () => {
    let capturedUrl = "";
    const mockFetch = async (url) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        text: async () => "console.log('hello');",
      };
    };

    const service = new GitHubService({ fetchFn: mockFetch });
    const rawContent = await service.fetchRawFileContent(
      "Urunov",
      "SpringBoot-Projects-FullStack",
      "master",
      "Part-6 Spring Boot Security/0. SpringUnSecureProject/src/main/resources/static/fontawesome/js/all.js"
    );

    assert.ok(rawContent.includes("hello"));
    assert.ok(capturedUrl.includes("Part-6%20Spring%20Boot%20Security/0.%20SpringUnSecureProject"));
  });
});
