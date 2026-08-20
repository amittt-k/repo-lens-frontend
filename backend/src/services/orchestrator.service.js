import prisma from "../config/database.js";
import { isSupportedSourceFile } from "../utils/fileFilter.js";
import { AstService, astService as defaultAstService } from "./ast.service.js";
import { DependencyService, dependencyService as defaultDependencyService } from "./dependency.service.js";
import { RelationshipService, relationshipService as defaultRelationshipService } from "./relationship.service.js";
import { ApiRouteService, apiRouteService as defaultApiRouteService } from "./apiRoute.service.js";
import { githubService as defaultGithubService } from "./github.service.js";
import { createFileLookupMap, buildRepositoryDependencyGraph } from "../analyzers/javascript/dependencyResolver.js";
import { analyzeSymbolRelationships } from "../analyzers/javascript/symbolRelationshipAnalyzer.js";
import { analyzeApiRoutes } from "../analyzers/javascript/apiRouteAnalyzer.js";

export class OrchestratorError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "OrchestratorError";
    this.statusCode = statusCode;
  }
}

export class OrchestratorService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
    this.astService = options.astService || (options.prisma ? new AstService({ prisma: this.db }) : defaultAstService);
    this.dependencyService = options.dependencyService || (options.prisma ? new DependencyService({ prisma: this.db }) : defaultDependencyService);
    this.relationshipService = options.relationshipService || (options.prisma ? new RelationshipService({ prisma: this.db }) : defaultRelationshipService);
    this.apiRouteService = options.apiRouteService || (options.prisma ? new ApiRouteService({ prisma: this.db }) : defaultApiRouteService);
    this.githubService = options.githubService || defaultGithubService;
  }

  /**
   * Orchestrates the complete static analysis pipeline for an ingested repository.
   *
   * Pipeline sequence:
   * 1. Repository Validation
   * 2. Initialize Analysis record (status: ANALYZING)
   * 3. Stage 1: File Loading
   * 4. Stage 2: AST Analysis & Symbol Extraction / Persistence
   * 5. Stage 3: Dependency Analysis & IMPORTS Persistence
   * 6. Stage 4: Symbol Relationship Analysis & Persistence (CONTAINS, CALLS, USES, EXTENDS, IMPLEMENTS)
   * 7. Stage 5: API Route Analysis & Persistence (ApiRoute, HANDLES_ROUTE, CALLS_API)
   * 8. Aggregate Summary Stats & Finalize Analysis (status: COMPLETED)
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {object} [options={}] - Options (e.g. fileContents map for test fixtures).
   * @returns {Promise<object>} - Analysis summary result.
   */
  async analyzeRepository(repositoryId, options = {}) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new OrchestratorError("Repository ID is required and must be a string.", 400);
    }

    const startTime = Date.now();

    // 1. Verify repository exists
    const repository = await this.db.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new OrchestratorError(`Repository with ID "${repositoryId}" not found.`, 404);
    }

    // 2. Initialize Analysis record
    const analysisRecord = await this.db.analysis.create({
      data: {
        repositoryId,
        status: "ANALYZING",
        startedAt: new Date(),
        metadata: { stage: "STARTED" },
      },
    });

    try {
      // 3. Stage 1: Load Ingested Files
      const files = await this.db.file.findMany({
        where: { repositoryId },
      });

      const fileMap = createFileLookupMap(files);
      const supportedFiles = files.filter((f) => isSupportedSourceFile(f.path));
      let fileContents = options.fileContents || {};

      // If file contents were not provided in options (production flow), fetch from GitHub
      if ((!options.fileContents || Object.keys(options.fileContents).length === 0) && supportedFiles.length > 0) {
        try {
          const supportedPaths = supportedFiles.map((f) => f.path);
          const fetchedMap = await this.githubService.fetchRepositorySourceFiles(
            repository.owner,
            repository.name,
            repository.defaultBranch || "main",
            supportedPaths,
            options,
          );

          if (fetchedMap instanceof Map) {
            fileContents = Object.fromEntries(fetchedMap.entries());
          } else if (fetchedMap && typeof fetchedMap === "object") {
            fileContents = fetchedMap;
          }
        } catch {
          // Gracefully continue with available content if network fetch fails
        }
      }

      // 4. Stage 2: AST Analysis & Symbol Extraction
      const fileAnalyses = [];
      const allSymbols = [];
      const syntaxErrors = [];

      for (const file of supportedFiles) {
        const content = fileContents[file.path] || "";
        const astResult = this.astService.analyzeFile(file.path, content);

        if (!astResult.success && astResult.error) {
          syntaxErrors.push({ path: file.path, error: astResult.error });
        }

        const fileSymbols = astResult.symbols || [];
        for (const s of fileSymbols) {
          allSymbols.push({
            ...s,
            fileId: file.id,
          });
        }

        fileAnalyses.push({
          fileId: file.id,
          path: file.path,
          content,
          ast: astResult.ast || null,
          symbols: fileSymbols,
          imports: astResult.imports || [],
          exports: astResult.exports || [],
        });
      }

      // Batch persist extracted symbols across the entire repository in a single DB operation
      await this.astService.persistRepositorySymbols(repositoryId, allSymbols);
      const totalSymbolsCount = allSymbols.length;

      // 5. Stage 3: Dependency Analysis & IMPORTS Persistence
      const depGraphResult = buildRepositoryDependencyGraph(fileAnalyses, fileMap, options);
      await this.dependencyService.persistDependencies(repositoryId, depGraphResult.fileDependencies);

      // Attach resolved dependencies to file data list for subsequent relationship stages
      const fileDataList = fileAnalyses.map((fa) => {
        const matchingDep = depGraphResult.fileDependencies.find((fd) => fd.sourcePath === fa.path);
        return {
          ...fa,
          dependencies: matchingDep ? matchingDep.dependencies : [],
        };
      });

      // 6. Stage 4: Symbol Relationship Analysis & Persistence (reusing parsed AST)
      const symbolRels = analyzeSymbolRelationships(fileDataList, options);
      await this.relationshipService.persistSymbolRelationships(repositoryId, symbolRels);

      // 7. Stage 5: API Route Analysis & Persistence (reusing parsed AST)
      const { routes, relationships: routeRels } = analyzeApiRoutes(fileDataList, options);
      await this.apiRouteService.persistApiRoutes(repositoryId, routes, routeRels);

      // Release analysis-local AST structures to immediately free memory
      for (const fa of fileAnalyses) {
        delete fa.ast;
      }

      // 8. Calculate summary statistics
      const durationMs = Date.now() - startTime;
      const stats = {
        totalFiles: files.length,
        analyzedFiles: supportedFiles.length,
        totalSymbols: totalSymbolsCount,
        totalDependencies: depGraphResult.fileDependencies.reduce((acc, f) => acc + (f.resolvedFiles?.length || 0), 0),
        packageDependencies: depGraphResult.packages.length,
        totalRelationships: symbolRels.length + routeRels.length,
        totalRoutes: routes.length,
        hasCycles: depGraphResult.hasCycles,
        syntaxErrorsCount: syntaxErrors.length,
        durationMs,
      };

      // 9. Update Analysis record to COMPLETED
      const updatedAnalysis = await this.db.analysis.update({
        where: { id: analysisRecord.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          metadata: stats,
        },
      });

      return {
        success: true,
        analysis: {
          id: updatedAnalysis.id,
          repositoryId: updatedAnalysis.repositoryId,
          status: updatedAnalysis.status,
          startedAt: updatedAnalysis.startedAt,
          completedAt: updatedAnalysis.completedAt,
          stats,
        },
        repository: {
          id: repository.id,
          owner: repository.owner,
          name: repository.name,
        },
      };
    } catch (err) {
      // Catch fatal errors, update status to FAILED
      await this.db.analysis.update({
        where: { id: analysisRecord.id },
        data: {
          status: "FAILED",
          error: err.message,
          completedAt: new Date(),
        },
      });

      throw err;
    }
  }
}

export const orchestratorService = new OrchestratorService();
export default orchestratorService;
