import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";

describe("Backend Foundation Tests", () => {
  let server;
  let baseUrl;

  before((t, done) => {
    // Start on ephemeral port for tests
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((t, done) => {
    server.close(done);
  });

  it("GET /api/health returns 200 and indicates backend is running", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(body.message, "RepoLens backend is running");
    assert.ok(body.timestamp, "Expected timestamp to be present");
    assert.ok(body.environment, "Expected environment to be present");
    assert.equal(typeof body.uptime, "number");
  });

  it("GET /api/nonexistent-route returns 404 with structured error", async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-route`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.status, "error");
    assert.equal(body.statusCode, 404);
    assert.match(body.message, /Route not found/);
  });

  it("CORS headers are present on responses", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: "http://localhost:5173",
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });
});
