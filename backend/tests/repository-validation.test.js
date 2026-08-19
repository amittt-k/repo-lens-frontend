import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { parseGitHubUrl, GitHubUrlError } from "../src/utils/githubUrl.js";
import { GitHubService } from "../src/services/github.service.js";

describe("GitHub URL Parser Tests", () => {
  it("parses valid HTTPS GitHub URLs", () => {
    const result = parseGitHubUrl("https://github.com/facebook/react");
    assert.equal(result.owner, "facebook");
    assert.equal(result.name, "react");
    assert.equal(result.fullName, "facebook/react");
    assert.equal(result.cleanUrl, "https://github.com/facebook/react");
  });

  it("parses URLs without protocol", () => {
    const result = parseGitHubUrl("github.com/vercel/next.js");
    assert.equal(result.owner, "vercel");
    assert.equal(result.name, "next.js");
    assert.equal(result.fullName, "vercel/next.js");
  });

  it("normalizes .git suffix and trailing slashes", () => {
    const result = parseGitHubUrl("https://github.com/torvalds/linux.git/");
    assert.equal(result.owner, "torvalds");
    assert.equal(result.name, "linux");
    assert.equal(result.cleanUrl, "https://github.com/torvalds/linux");
  });

  it("handles www.github.com host", () => {
    const result = parseGitHubUrl("https://www.github.com/expressjs/express");
    assert.equal(result.owner, "expressjs");
    assert.equal(result.name, "express");
  });

  it("rejects non-GitHub domains", () => {
    assert.throws(
      () => parseGitHubUrl("https://gitlab.com/owner/repo"),
      /Only public GitHub repositories/i,
    );
  });

  it("rejects subpath URLs (e.g. tree/main)", () => {
    assert.throws(
      () => parseGitHubUrl("https://github.com/owner/repo/tree/main"),
      /Invalid GitHub repository URL/i,
    );
  });

  it("rejects single segment user/org URLs", () => {
    assert.throws(
      () => parseGitHubUrl("https://github.com/owner"),
      /Invalid GitHub repository URL/i,
    );
  });

  it("rejects empty or non-string inputs", () => {
    assert.throws(() => parseGitHubUrl(""), /URL cannot be empty/i);
    assert.throws(() => parseGitHubUrl(null), /URL is required/i);
  });
});

describe("GitHub Service Unit Tests", () => {
  it("returns metadata on successful 200 response", async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        name: "react",
        full_name: "facebook/react",
        owner: { login: "facebook" },
        html_url: "https://github.com/facebook/react",
        description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
        default_branch: "main",
        language: "JavaScript",
        stargazers_count: 220000,
        forks_count: 45000,
        open_issues_count: 800,
        size: 350000,
        private: false,
        archived: false,
        created_at: "2013-05-24T16:15:54Z",
        updated_at: "2026-08-19T12:00:00Z",
        pushed_at: "2026-08-19T11:00:00Z",
      }),
    });

    const service = new GitHubService({ fetchFn: mockFetch });
    const result = await service.validateAndFetchRepository("https://github.com/facebook/react");

    assert.equal(result.valid, true);
    assert.equal(result.repository.name, "react");
    assert.equal(result.repository.owner, "facebook");
    assert.equal(result.repository.stars, 220000);
    assert.equal(result.repository.defaultBranch, "main");
    assert.equal(result.repository.isPrivate, false);
  });

  it("throws 404 when repository is not found", async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const service = new GitHubService({ fetchFn: mockFetch });
    await assert.rejects(
      () => service.validateAndFetchRepository("https://github.com/fake-user/non-existent-repo"),
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /not found on GitHub/i);
        return true;
      },
    );
  });

  it("throws 429 when rate limit is exceeded", async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 403,
      headers: new Map([["x-ratelimit-remaining", "0"]]),
    });

    const service = new GitHubService({ fetchFn: mockFetch });
    await assert.rejects(
      () => service.validateAndFetchRepository("https://github.com/facebook/react"),
      (err) => {
        assert.equal(err.statusCode, 429);
        assert.match(err.message, /rate limit exceeded/i);
        return true;
      },
    );
  });

  it("throws 502 when GitHub API returns 500 error", async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const service = new GitHubService({ fetchFn: mockFetch });
    await assert.rejects(
      () => service.validateAndFetchRepository("https://github.com/facebook/react"),
      (err) => {
        assert.equal(err.statusCode, 502);
        assert.match(err.message, /GitHub API returned error/i);
        return true;
      },
    );
  });

  it("throws 502 on network connection failure", async () => {
    const mockFetch = async () => {
      throw new Error("ENOTFOUND api.github.com");
    };

    const service = new GitHubService({ fetchFn: mockFetch });
    await assert.rejects(
      () => service.validateAndFetchRepository("https://github.com/facebook/react"),
      (err) => {
        assert.equal(err.statusCode, 502);
        assert.match(err.message, /Failed to reach GitHub API/i);
        return true;
      },
    );
  });
});

describe("POST /api/repositories/validate HTTP Endpoint Tests", () => {
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
    const res = await fetch(`${baseUrl}/api/repositories/validate`, {
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
    const res = await fetch(`${baseUrl}/api/repositories/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://gitlab.com/owner/repo" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, "error");
    assert.match(body.message, /Only public GitHub repositories/i);
  });

  it("returns 400 when url is malformed", async () => {
    const res = await fetch(`${baseUrl}/api/repositories/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-valid-url" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, "error");
  });
});
