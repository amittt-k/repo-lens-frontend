import prisma from "../config/database.js";
import { buildGraph } from "../analyzers/graph/graphBuilder.js";

export class GraphServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "GraphServiceError";
    this.statusCode = statusCode;
  }
}

export class GraphService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
  }

  /**
   * Retrieves all persisted analysis entities for a repository and transforms them
   * into a normalized graph structure.
   *
   * @param {string} repositoryId - Repository UUID.
   * @param {object} [options={}] - Query/filtering options.
   * @returns {Promise<object>} - Normalized graph payload.
   */
  async getRepositoryGraph(repositoryId, options = {}) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new GraphServiceError("Repository ID is required and must be a string.", 400);
    }

    // 1. Verify repository exists
    const repository = await this.db.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new GraphServiceError(`Repository with ID "${repositoryId}" not found.`, 404);
    }

    // 2. Query all relevant entities in parallel batch queries with size bounds
    const MAX_GRAPH_NODES = 5000;
    const MAX_GRAPH_EDGES = 10000;

    const [files, symbols, relationships, apiRoutes] = await Promise.all([
      this.db.file.findMany({
        where: { repositoryId },
        take: MAX_GRAPH_NODES,
      }),
      this.db.symbol.findMany({
        where: { file: { repositoryId } },
        take: MAX_GRAPH_NODES,
      }),
      this.db.relationship.findMany({
        where: { repositoryId },
        take: MAX_GRAPH_EDGES,
      }),
      this.db.apiRoute.findMany({
        where: { repositoryId },
        take: MAX_GRAPH_NODES,
      }),
    ]);

    // Parse options from query parameters if needed
    const filterOptions = { ...options };
    if (typeof options.relationshipTypes === "string") {
      filterOptions.relationshipTypes = options.relationshipTypes.split(",").map((s) => s.trim());
    }
    if (typeof options.nodeTypes === "string") {
      filterOptions.nodeTypes = options.nodeTypes.split(",").map((s) => s.trim());
    }

    // 3. Build graph
    const graphData = buildGraph({
      repository,
      files,
      symbols,
      relationships,
      apiRoutes,
      options: filterOptions,
    });

    return {
      success: true,
      graph: graphData,
      repository: {
        id: repository.id,
        owner: repository.owner,
        name: repository.name,
      },
    };
  }
}

export const graphService = new GraphService();
export default graphService;
