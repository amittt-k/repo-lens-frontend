import prisma from "../config/database.js";
import { normalizeSymbolNodeType } from "../analyzers/graph/graphBuilder.js";

export class NodeServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "NodeServiceError";
    this.statusCode = statusCode;
  }
}

export class NodeService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
  }

  /**
   * Resolves a node by its unique ID across supported database entities (File, Symbol, ApiRoute).
   *
   * @param {string} id - Entity UUID
   * @returns {Promise<object>} - Normalized node entity
   */
  async getNodeById(id) {
    if (!id || typeof id !== "string") {
      throw new NodeServiceError("Node ID is required and must be a string.", 400);
    }

    // 1. Try finding File
    const file = await this.db.file.findUnique({
      where: { id },
      include: {
        repository: {
          select: { id: true, owner: true, name: true },
        },
      },
    });

    if (file) {
      return {
        id: file.id,
        label: file.name,
        type: "file",
        entityType: "File",
        data: {
          name: file.name,
          filePath: file.path,
          extension: file.extension || "",
          isSupported: file.isSupportedSource,
          size: file.size,
          loc: file.loc,
          repositoryId: file.repositoryId,
          repository: file.repository,
        },
      };
    }

    // 2. Try finding Symbol
    const symbol = await this.db.symbol.findUnique({
      where: { id },
      include: {
        file: {
          select: { id: true, path: true, repositoryId: true },
        },
      },
    });

    if (symbol) {
      return {
        id: symbol.id,
        label: symbol.name,
        type: normalizeSymbolNodeType(symbol.kind),
        entityType: "Symbol",
        data: {
          name: symbol.name,
          kind: symbol.kind,
          isExported: symbol.isExported,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
          fileId: symbol.fileId,
          filePath: symbol.file ? symbol.file.path : "",
          repositoryId: symbol.file ? symbol.file.repositoryId : null,
          metadata: symbol.metadata || {},
        },
      };
    }

    // 3. Try finding ApiRoute
    const apiRoute = await this.db.apiRoute.findUnique({
      where: { id },
      include: {
        file: {
          select: { id: true, path: true },
        },
        repository: {
          select: { id: true, owner: true, name: true },
        },
      },
    });

    if (apiRoute) {
      return {
        id: apiRoute.id,
        label: `${apiRoute.method} ${apiRoute.path}`,
        type: "api_route",
        entityType: "ApiRoute",
        data: {
          method: apiRoute.method,
          path: apiRoute.path,
          handler: apiRoute.handler,
          fileId: apiRoute.fileId,
          filePath: apiRoute.file ? apiRoute.file.path : "",
          repositoryId: apiRoute.repositoryId,
          repository: apiRoute.repository,
        },
      };
    }

    throw new NodeServiceError(`Node with ID "${id}" not found.`, 404);
  }

  /**
   * Retrieves incoming and outgoing direct relationships for a specified node ID.
   *
   * @param {string} id - Node UUID
   * @returns {Promise<object>}
   */
  async getNodeRelationships(id) {
    // 1. Verify node exists
    const node = await this.getNodeById(id);

    // 2. Fetch all relationships where this node is either source or target
    const [outgoingRels, incomingRels] = await Promise.all([
      this.db.relationship.findMany({
        where: { sourceId: id },
      }),
      this.db.relationship.findMany({
        where: { targetId: id },
      }),
    ]);

    const formatRel = (r) => ({
      id: r.id,
      sourceId: r.sourceId,
      targetId: r.targetId,
      relationshipType: r.relationshipType,
      metadata: r.metadata || {},
      createdAt: r.createdAt,
    });

    return {
      success: true,
      node,
      outgoing: outgoingRels.map(formatRel),
      incoming: incomingRels.map(formatRel),
      totalIncoming: incomingRels.length,
      totalOutgoing: outgoingRels.length,
    };
  }
}

export const nodeService = new NodeService();
export default nodeService;
