import { randomUUID } from "node:crypto";
import prisma from "../config/database.js";
import { isSupportedSourceFile } from "../utils/fileFilter.js";
import { analyzeSource } from "../analyzers/javascript/astAnalyzer.js";
import { resolveFileDependencies, createFileLookupMap } from "../analyzers/javascript/dependencyResolver.js";
import { analyzeApiRoutes } from "../analyzers/javascript/apiRouteAnalyzer.js";

/**
 * Route-specific relationship types for Phase 11.
 */
export const ROUTE_RELATIONSHIP_TYPES = [
  "HANDLES_ROUTE",
  "CALLS_API",
];

export class ApiRouteError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ApiRouteError";
    this.statusCode = statusCode;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ApiRouteService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
  }

  /**
   * Analyzes all Express-style API routes and route relationships for an ingested repository.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {object} [options={}] - Options (e.g. fileContents map).
   * @returns {Promise<{
   *   repositoryId: string,
   *   routes: Array<object>,
   *   relationships: Array<object>,
   *   stats: Record<string, number>
   * }>}
   */
  async analyzeRepositoryApiRoutes(repositoryId, options = {}) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new ApiRouteError("Repository ID is required.", 400);
    }

    const repository = await this.db.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new ApiRouteError(`Repository with ID "${repositoryId}" not found.`, 404);
    }

    // 1. Fetch files and symbols
    const files = await this.db.file.findMany({
      where: { repositoryId },
      include: {
        symbols: true,
      },
    });

    const fileMap = createFileLookupMap(files);
    const fileContents = options.fileContents || {};

    // 2. Prepare file data list
    const fileDataList = [];
    for (const file of files) {
      if (!isSupportedSourceFile(file.path)) continue;

      const content = fileContents[file.path] || "";
      const ast = analyzeSource(content, { filePath: file.path });
      const imports = ast.imports || [];
      const depResult = resolveFileDependencies(file.path, imports, fileMap);

      fileDataList.push({
        id: file.id,
        path: file.path,
        content,
        symbols: file.symbols && file.symbols.length > 0 ? file.symbols : ast.symbols || [],
        imports,
        dependencies: depResult.dependencies,
      });
    }

    // 3. Analyze API routes
    const { routes, relationships } = analyzeApiRoutes(fileDataList, options);

    // 4. Calculate stats
    const stats = {
      totalRoutes: routes.length,
      HANDLES_ROUTE: relationships.filter((r) => r.relationshipType === "HANDLES_ROUTE").length,
      CALLS_API: relationships.filter((r) => r.relationshipType === "CALLS_API").length,
    };

    return {
      repositoryId,
      routes,
      relationships,
      stats,
    };
  }

  /**
   * Persists detected API routes and route relationships into PostgreSQL via Prisma.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {Array<object>} routes - Array of route objects.
   * @param {Array<object>} relationships - Array of route relationship objects.
   * @returns {Promise<{ routesCount: number, relationshipsCount: number }>}
   */
  async persistApiRoutes(repositoryId, routes = [], relationships = []) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new ApiRouteError("Repository ID is required.", 400);
    }

    // 1. Delete previous ApiRoute records for repository
    await this.db.apiRoute.deleteMany({
      where: { repositoryId },
    });

    // 2. Delete previous route-specific relationships (HANDLES_ROUTE, CALLS_API)
    await this.db.relationship.deleteMany({
      where: {
        repositoryId,
        relationshipType: {
          in: ROUTE_RELATIONSHIP_TYPES,
        },
      },
    });

    let routesCount = 0;
    let relationshipsCount = 0;

    const routeIdMap = new Map();

    if (Array.isArray(routes) && routes.length > 0) {
      const seenRouteKeys = new Set();
      const routeRecords = [];

      for (const r of routes) {
        if (!r || !r.method || !r.path) continue;
        const normMethod = String(r.method).toUpperCase();
        const normPath = String(r.path);
        const fileId = r.fileId || null;
        const handler = r.handler || null;

        // Deduplicate identical route entries per repository
        const dedupeKey = `${fileId || "null"}::${normMethod}::${normPath}::${handler || "null"}`;
        if (seenRouteKeys.has(dedupeKey)) continue;
        seenRouteKeys.add(dedupeKey);

        const id = r.id && UUID_REGEX.test(r.id) ? r.id : randomUUID();
        if (r.id) {
          routeIdMap.set(r.id, id);
        }

        routeRecords.push({
          id,
          repositoryId,
          method: normMethod,
          path: normPath,
          fileId,
          handler,
        });
      }

      if (routeRecords.length > 0) {
        const routeResult = await this.db.apiRoute.createMany({
          data: routeRecords,
        });
        routesCount = routeResult.count;
      }
    }

    if (Array.isArray(relationships) && relationships.length > 0) {
      const seenRelKeys = new Set();
      const relRecords = [];

      for (const rel of relationships) {
        if (!rel || !rel.sourceId || !rel.targetId || !rel.relationshipType) continue;

        const remappedSource = routeIdMap.get(rel.sourceId) || rel.sourceId;
        const remappedTarget = routeIdMap.get(rel.targetId) || rel.targetId;

        const relKey = `${remappedSource}::${rel.relationshipType}::${remappedTarget}`;
        if (seenRelKeys.has(relKey)) continue;
        seenRelKeys.add(relKey);

        relRecords.push({
          repositoryId,
          sourceId: remappedSource,
          targetId: remappedTarget,
          relationshipType: rel.relationshipType,
          metadata: rel.metadata || null,
        });
      }

      if (relRecords.length > 0) {
        const relResult = await this.db.relationship.createMany({
          data: relRecords,
        });
        relationshipsCount = relResult.count;
      }
    }

    return {
      routesCount,
      relationshipsCount,
    };
  }
}

export const apiRouteService = new ApiRouteService();
export default apiRouteService;
