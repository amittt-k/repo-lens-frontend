/**
 * Service for aggregating verified repository facts for AI context.
 *
 * Assembles structured analysis facts, symbols, relationships, and routes
 * from the database and node service without performing prompt construction
 * or LLM calls.
 */

import prisma from "../config/database.js";
import { NodeService, nodeService as defaultNodeService } from "./node.service.js";

export class AiContextService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
    this.nodeService = options.nodeService || (options.prisma ? new NodeService({ prisma: this.db }) : defaultNodeService);
  }

  /**
   * Assembles verified structured facts for a repository.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {object} [overrides] - Database / service overrides
   * @returns {Promise<object|null>} - Structured repository context or null if not found.
   */
  async assembleRepositoryContext(repositoryId, overrides = {}) {
    const db = overrides.prisma || this.db;

    // 1. Retrieve repository record
    const repository = await db.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      return null;
    }

    // 2. Retrieve latest analysis record
    const latestAnalysis = await db.analysis.findFirst({
      where: { repositoryId },
      orderBy: { startedAt: "desc" },
    });

    // 3. Retrieve files
    const files = await db.file.findMany({
      where: { repositoryId },
      select: { id: true, path: true, size: true },
    });

    // 4. Retrieve API routes
    const routes = await db.apiRoute.findMany({
      where: { repositoryId },
      orderBy: [{ path: "asc" }, { method: "asc" }],
    });

    // 5. Retrieve key symbols
    const symbols = await db.symbol.findMany({
      where: { file: { repositoryId } },
      take: 50,
      select: { id: true, name: true, kind: true, filePath: true },
    });

    // 6. Retrieve relationship count
    const relationshipsCount = await db.relationship.count({
      where: { repositoryId },
    });

    // 7. Aggregate structured facts
    return {
      repository: {
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
        fullName: `${repository.owner}/${repository.name}`,
        description: repository.description,
        language: repository.language,
        defaultBranch: repository.defaultBranch,
      },
      analysisId: latestAnalysis?.id || null,
      fileCount: files.length,
      files: files.slice(0, 100).map((f) => ({ path: f.path, size: f.size })),
      apiRoutes: routes.map((r) => ({
        method: r.method,
        path: r.path,
        handler: r.handler,
        filePath: r.filePath,
      })),
      symbols: symbols.map((s) => ({
        name: s.name,
        kind: s.kind,
        filePath: s.filePath,
      })),
      totalRelationships: relationshipsCount,
      metrics: latestAnalysis?.metadata || {},
    };
  }

  /**
   * Assembles verified structured facts for a node entity.
   *
   * @param {string} nodeId - Node / entity ID.
   * @param {object} [overrides] - Database / service overrides
   * @returns {Promise<object>} - Structured node context.
   */
  async assembleNodeContext(nodeId, overrides = {}) {
    const db = overrides.prisma || this.db;
    const nodeService = overrides.nodeService || this.nodeService;

    // 1. Resolve node entity and its direct relationships
    const relData = await nodeService.getNodeRelationships(nodeId);
    const { node, outgoing, incoming } = relData;

    // 2. Retrieve contained symbols where applicable
    let containedSymbols = [];
    if (node.entityType === "File") {
      containedSymbols = await db.symbol.findMany({
        where: { fileId: node.id },
        select: { id: true, name: true, kind: true },
        take: 30,
      });
    } else if (node.type === "class") {
      // Find member methods or contained symbols from outgoing CONTAINS relationships
      const containedRels = outgoing.filter((r) => r.relationshipType === "CONTAINS");
      if (containedRels.length > 0) {
        containedSymbols = await db.symbol.findMany({
          where: { id: { in: containedRels.map((r) => r.targetId) } },
          select: { id: true, name: true, kind: true },
          take: 30,
        });
      }
    }

    // 3. Construct structured node context
    return {
      id: node.id,
      label: node.label,
      name: node.data?.name || node.label,
      kind: node.type || node.data?.kind || "symbol",
      path: node.data?.filePath || "",
      startLine: node.data?.startLine,
      endLine: node.data?.endLine,
      loc:
        node.data?.loc ||
        (node.data?.endLine && node.data?.startLine
          ? node.data.endLine - node.data.startLine + 1
          : undefined),
      containedSymbols: containedSymbols.map((s) => ({
        name: s.name,
        kind: s.kind,
      })),
      dependsOn: outgoing.map((r) => ({
        relationshipType: r.relationshipType,
        targetId: r.targetId,
      })),
      usedBy: incoming.map((r) => ({
        relationshipType: r.relationshipType,
        sourceId: r.sourceId,
      })),
      apiRoute:
        node.type === "api_route"
          ? {
              method: node.data?.method,
              path: node.data?.path,
              handler: node.data?.handler,
            }
          : undefined,
    };
  }

  /**
   * Normalizes structured flow trace payload into bounded AI context.
   *
   * @param {object} body - Request body containing flow or steps.
   * @returns {object} - Normalized flow data.
   */
  normalizeFlowContext(body = {}) {
    const rawFlow = body.flow || {};
    const rawSteps = Array.isArray(body.steps) ? body.steps : rawFlow.steps || [];
    const flowId = rawFlow.id || body.flowId || null;
    const name = rawFlow.name || body.name || (rawSteps[0]?.label ? `Flow: ${rawSteps[0].label}` : "Flow Trace");
    const startNodeId = rawFlow.startNodeId || body.startNodeId || rawSteps[0]?.nodeId || null;

    return {
      id: flowId,
      name: typeof name === "string" ? name.slice(0, 100) : "Flow Trace",
      startNodeId,
      steps: rawSteps.slice(0, 30).map((s) => ({
        nodeId: typeof s.nodeId === "string" ? s.nodeId : typeof s.id === "string" ? s.id : "step",
        label: typeof s.label === "string" ? s.label.slice(0, 120) : typeof s.name === "string" ? s.name.slice(0, 120) : "Unknown Step",
        kind: typeof s.kind === "string" ? s.kind.slice(0, 50) : typeof s.type === "string" ? s.type.slice(0, 50) : "module",
        path: typeof s.path === "string" ? s.path.slice(0, 250) : typeof s.filePath === "string" ? s.filePath.slice(0, 250) : "",
        relationshipType: typeof s.relationshipType === "string" ? s.relationshipType.slice(0, 50) : typeof s.relation === "string" ? s.relation.slice(0, 50) : undefined,
        detail: typeof s.detail === "string" ? s.detail.slice(0, 250) : "",
      })),
    };
  }
}

export const aiContextService = new AiContextService();
export default aiContextService;
