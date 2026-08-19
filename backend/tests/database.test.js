import { describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/config/database.js";

describe("Database Foundation Tests", () => {
  it("Prisma Client exports all Phase 4 models", () => {
    assert.ok(prisma.repository, "Expected 'repository' model delegate to exist on Prisma Client");
    assert.ok(prisma.file, "Expected 'file' model delegate to exist on Prisma Client");
    assert.ok(prisma.symbol, "Expected 'symbol' model delegate to exist on Prisma Client");
    assert.ok(prisma.relationship, "Expected 'relationship' model delegate to exist on Prisma Client");
    assert.ok(prisma.apiRoute, "Expected 'apiRoute' model delegate to exist on Prisma Client");
    assert.ok(prisma.analysis, "Expected 'analysis' model delegate to exist on Prisma Client");
  });

  it("Prisma Client model methods are callable functions", () => {
    assert.equal(typeof prisma.repository.findMany, "function");
    assert.equal(typeof prisma.file.findMany, "function");
    assert.equal(typeof prisma.symbol.findMany, "function");
    assert.equal(typeof prisma.relationship.findMany, "function");
    assert.equal(typeof prisma.apiRoute.findMany, "function");
    assert.equal(typeof prisma.analysis.findMany, "function");
  });
});
