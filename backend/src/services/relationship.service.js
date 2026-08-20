import prisma from "../config/database.js";
import { isSupportedSourceFile } from "../utils/fileFilter.js";
import { analyzeSource } from "../analyzers/javascript/astAnalyzer.js";
import { resolveFileDependencies, createFileLookupMap } from "../analyzers/javascript/dependencyResolver.js";
import { analyzeSymbolRelationships } from "../analyzers/javascript/symbolRelationshipAnalyzer.js";

/**
 * Supported symbol-level relationship types for Phase 10.
 */
export const SYMBOL_RELATIONSHIP_TYPES = [
  "CONTAINS",
  "CALLS",
  "USES",
  "EXTENDS",
  "IMPLEMENTS",
];

export class RelationshipError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "RelationshipError";
    this.statusCode = statusCode;
  }
}

export class RelationshipService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
  }

  /**
   * Analyzes all symbol-level relationships for an ingested repository.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {object} [options={}] - Options (e.g. fileContents map).
   * @returns {Promise<{
   *   repositoryId: string,
   *   relationships: Array<object>,
   *   stats: Record<string, number>
   * }>}
   */
  async analyzeRepositorySymbolRelationships(repositoryId, options = {}) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new RelationshipError("Repository ID is required.", 400);
    }

    const repository = await this.db.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new RelationshipError(`Repository with ID "${repositoryId}" not found.`, 404);
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

    // 2. Prepare file data list with AST imports and Phase 9 resolved dependencies
    const fileDataList = [];

    for (const file of files) {
      if (!isSupportedSourceFile(file.path)) continue;

      const content = fileContents[file.path] || "";
      const ast = analyzeSource(content, { filePath: file.path });
      const imports = ast.imports || [];

      // Resolve Phase 9 dependencies for this file
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

    // 3. Extract symbol relationships
    const relationships = analyzeSymbolRelationships(fileDataList, options);

    // 4. Calculate stats
    const stats = {
      CONTAINS: 0,
      CALLS: 0,
      USES: 0,
      EXTENDS: 0,
      IMPLEMENTS: 0,
      total: relationships.length,
    };

    for (const rel of relationships) {
      if (stats[rel.relationshipType] !== undefined) {
        stats[rel.relationshipType]++;
      }
    }

    return {
      repositoryId,
      relationships,
      stats,
    };
  }

  /**
   * Persists symbol-level relationships into PostgreSQL via Prisma while preserving IMPORTS relationships.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {Array<object>} relationships - Array of symbol relationships to persist.
   * @returns {Promise<{ count: number }>}
   */
  async persistSymbolRelationships(repositoryId, relationships = []) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new RelationshipError("Repository ID is required.", 400);
    }

    // Delete ONLY symbol-level relationships for idempotency, preserving IMPORTS relationships
    await this.db.relationship.deleteMany({
      where: {
        repositoryId,
        relationshipType: {
          in: SYMBOL_RELATIONSHIP_TYPES,
        },
      },
    });

    if (!Array.isArray(relationships) || relationships.length === 0) {
      return { count: 0 };
    }

    const records = relationships.map((rel) => ({
      repositoryId,
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      relationshipType: rel.relationshipType,
      metadata: rel.metadata || null,
    }));

    const CHUNK_SIZE = 1000;
    let totalCount = 0;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const result = await this.db.relationship.createMany({
        data: chunk,
      });
      totalCount += result.count;
    }

    return { count: totalCount };
  }
}

export const relationshipService = new RelationshipService();
export default relationshipService;
