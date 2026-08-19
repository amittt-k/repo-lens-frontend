import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRepositoryPrompt,
  buildNodePrompt,
  buildFlowPrompt,
  SYSTEM_PROMPT,
} from "../src/services/aiPrompt.service.js";

describe("TEST-003: Mega-Repository AI Context Window Token Clamping Tests", () => {
  it("bounds mega-repository context with 10,000+ symbols and sanitizes embedded secrets", () => {
    // Generate 12,000 synthetic symbols with realistic properties and embedded sensitive token
    const symbols = [];
    for (let i = 0; i < 12000; i++) {
      symbols.push({
        id: `sym-${i}`,
        name: i === 5 ? "authWithSecret_sk-proj12345678901234567890" : `symbolHandler_${i}`,
        kind: i % 2 === 0 ? "FUNCTION" : "CLASS",
        filePath: `src/module_${Math.floor(i / 100)}/file_${i % 100}.ts`,
      });
    }

    // Generate 1,000 synthetic API routes
    const routes = [];
    for (let i = 0; i < 1000; i++) {
      routes.push({
        id: `route-${i}`,
        method: i % 3 === 0 ? "POST" : "GET",
        path: `/api/v1/resource_${i}`,
        handler: `handleResource_${i}`,
        filePath: `src/routes/resource_${i}.ts`,
      });
    }

    // Generate 5,000 synthetic files
    const files = [];
    for (let i = 0; i < 5000; i++) {
      files.push({
        id: `file-${i}`,
        path: `src/file_${i}.ts`,
        size: 2048,
      });
    }

    const megaRepoContext = {
      repository: {
        owner: "enterprise",
        name: "mega-enterprise-monorepo",
        description: "Monorepo with thousands of modules and embedded token ghp_abcdefghijklmnopqrstuvwx",
        language: "TypeScript",
        defaultBranch: "main",
      },
      fileCount: files.length,
      symbols,
      routes,
      metrics: {
        totalFiles: files.length,
        totalSymbols: symbols.length,
        totalRoutes: routes.length,
      },
    };

    const startTime = performance.now();
    const prompt = buildRepositoryPrompt(megaRepoContext);
    const durationMs = performance.now() - startTime;

    // 1. Verify rapid execution under 100ms
    assert.ok(durationMs < 100, `Expected prompt generation under 100ms, took ${durationMs.toFixed(2)}ms`);

    // 2. Verify prompt size stays bounded and does not bloat uncontrollably
    assert.ok(prompt.userPrompt.length < 15000, `User prompt length was ${prompt.userPrompt.length}, expected < 15000`);

    // 3. Verify grounded facts enclosure
    assert.match(prompt.userPrompt, /<untrusted_repository_facts>/);
    assert.match(prompt.userPrompt, /<\/untrusted_repository_facts>/);

    // 4. Verify sensitive tokens are strictly redacted
    assert.ok(!prompt.userPrompt.includes("sk-proj12345678901234567890"), "OpenAI secret must be redacted");
    assert.ok(!prompt.userPrompt.includes("ghp_abcdefghijklmnopqrstuvwx"), "GitHub token must be redacted");
    assert.match(prompt.userPrompt, /\[REDACTED_SECRET\]/);

    // 5. Verify high-value summary facts are preserved
    assert.match(prompt.userPrompt, /Total Files Analyzed: 5000/);
    assert.match(prompt.userPrompt, /Primary Language: TypeScript/);
    assert.match(prompt.userPrompt, /Discovered API Routes \(1000\)/);
    assert.match(prompt.userPrompt, /Key Symbols & Modules \(12000\)/);

    // 6. Verify deterministic output across multiple runs
    const promptSecondRun = buildRepositoryPrompt(megaRepoContext);
    assert.equal(prompt.userPrompt, promptSecondRun.userPrompt, "Context generation must be 100% deterministic");
  });

  it("bounds mega-node entity with 10,000 contained symbols and dependencies", () => {
    const contained = [];
    const outbound = [];
    const inbound = [];

    for (let i = 0; i < 10000; i++) {
      contained.push({ name: `method_${i}`, kind: "METHOD" });
      if (i < 5000) {
        outbound.push({ targetLabel: `Service_${i}`, relationshipType: "CALLS" });
        inbound.push({ sourceLabel: `Controller_${i}`, relationshipType: "CALLS" });
      }
    }

    const megaNodeContext = {
      id: "node-god-object",
      label: "GodService",
      kind: "CLASS",
      filePath: "src/services/GodService.ts",
      startLine: 1,
      endLine: 25000,
      loc: 25000,
      containedSymbols: contained,
      outbound,
      inbound,
    };

    const startTime = performance.now();
    const prompt = buildNodePrompt(megaNodeContext);
    const durationMs = performance.now() - startTime;

    assert.ok(durationMs < 100, `Expected node prompt under 100ms, took ${durationMs.toFixed(2)}ms`);
    assert.ok(prompt.userPrompt.length < 10000, `Node prompt length was ${prompt.userPrompt.length}, expected < 10000`);
    assert.match(prompt.userPrompt, /Entity Name: GodService/);
    assert.match(prompt.userPrompt, /Contained Functions \/ Classes \/ Symbols \(10000\)/);
    assert.match(prompt.userPrompt, /Outbound Dependencies \/ "Depends on" \(5000\)/);
    assert.match(prompt.userPrompt, /Inbound Callers \/ "Used by" \(5000\)/);
  });

  it("bounds mega-flow with 500 execution steps cleanly", () => {
    const steps = [];
    for (let i = 0; i < 500; i++) {
      steps.push({
        nodeId: `step-${i}`,
        label: `StepHandler_${i}`,
        kind: "function",
        path: `src/steps/step_${i}.ts`,
        relationshipType: i === 0 ? undefined : "CALLS",
        detail: `Calls step ${i}`,
      });
    }

    const megaFlowContext = {
      id: "flow-mega",
      name: "Mega Workflow Trace",
      startNodeId: "step-0",
      steps,
    };

    const prompt = buildFlowPrompt(megaFlowContext);

    assert.match(prompt.userPrompt, /STRUCTURED EXECUTION PATH \(500 Steps\)/);
    assert.match(prompt.userPrompt, /Step 1: StepHandler_0/);
    assert.match(prompt.userPrompt, /Step 500: StepHandler_499/);
    assert.match(prompt.userPrompt, /<untrusted_repository_facts>/);
  });
});
