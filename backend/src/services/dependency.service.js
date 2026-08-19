import prisma from "../config/database.js";
import { isSupportedSourceFile } from "../utils/fileFilter.js";
import { analyzeSource } from "../analyzers/javascript/astAnalyzer.js";
import {
  buildRepositoryDependencyGraph,
  createFileLookupMap,
  resolveFileDependencies,
  detectCircularDependencies,
} from "../analyzers/javascript/dependencyResolver.js";

/**
 * Custom error for dependency operations.
 */
export class DependencyError extends Error {
  constructor(message, statusCode = 404) {
    super(message);
    this.name = "DependencyError";
    this.statusCode = statusCode;
  }
}

export class DependencyService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
  }

  /**
   * Analyzes dependencies across all supported source files of an ingested repository.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {object} [options={}] - Analysis options (e.g. fileContents map if in-memory).
   * @returns {Promise<object>} - Repository dependency graph analysis.
   */
  async analyzeRepositoryDependencies(repositoryId, options = {}) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new DependencyError("Repository ID is required.", 400);
    }

    const repository = await this.db.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new DependencyError(`Repository with ID "${repositoryId}" not found.`, 404);
    }

    const files = await this.db.file.findMany({
      where: { repositoryId },
    });

    const fileMap = createFileLookupMap(files);
    const supportedFiles = files.filter((f) => isSupportedSourceFile(f.path));
    const fileContents = options.fileContents || {};

    // Analyze AST imports for each supported file
    const fileAnalyses = [];
    for (const file of supportedFiles) {
      const content = fileContents[file.path] || "";
      const ast = analyzeSource(content, { filePath: file.path });
      fileAnalyses.push({
        fileId: file.id,
        path: file.path,
        imports: ast.imports || [],
      });
    }

    // Build dependency graph
    const graphResult = buildRepositoryDependencyGraph(fileAnalyses, fileMap, options);

    return {
      success: true,
      repository: {
        id: repository.id,
        owner: repository.owner,
        name: repository.name,
      },
      ...graphResult,
    };
  }

  /**
   * Persists resolved IMPORTS relationships into PostgreSQL via Prisma.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {Array<object>} fileDependencies - Array of resolved file dependencies.
   * @returns {Promise<{ count: number }>}
   */
  async persistDependencies(repositoryId, fileDependencies = []) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new DependencyError("Repository ID is required.", 400);
    }

    // Delete existing IMPORTS relationships for idempotency
    await this.db.relationship.deleteMany({
      where: {
        repositoryId,
        relationshipType: "IMPORTS",
      },
    });

    if (!Array.isArray(fileDependencies) || fileDependencies.length === 0) {
      return { count: 0 };
    }

    const relationshipsToCreate = [];

    for (const fileDep of fileDependencies) {
      const sourceId = fileDep.fileId || fileDep.sourceFileId || fileDep.sourcePath;
      if (!sourceId) continue;

      for (const dep of fileDep.dependencies || []) {
        // Only persist resolved local file dependencies as Relationships
        if (dep.resolved && dep.targetPath) {
          const targetId = dep.targetFile?.id || dep.targetFileId || dep.targetPath;
          relationshipsToCreate.push({
            repositoryId,
            sourceId,
            targetId,
            relationshipType: "IMPORTS",
            metadata: {
              rawSource: dep.rawSource,
              specifiers: dep.specifiers || [],
              startLine: dep.startLine || 1,
              endLine: dep.endLine || 1,
            },
          });
        }
      }
    }

    if (relationshipsToCreate.length === 0) {
      return { count: 0 };
    }

    const result = await this.db.relationship.createMany({
      data: relationshipsToCreate,
    });

    return { count: result.count };
  }
}

export const dependencyService = new DependencyService();
export default dependencyService;
