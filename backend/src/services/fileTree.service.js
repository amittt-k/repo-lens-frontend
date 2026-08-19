import prisma from "../config/database.js";
import { buildFileTree, findNodeByPath, flattenTree } from "../utils/fileTree.js";
import { isSupportedSourceFile } from "../utils/fileFilter.js";

/**
 * Custom error for file tree operations.
 */
export class FileTreeError extends Error {
  constructor(message, statusCode = 404) {
    super(message);
    this.name = "FileTreeError";
    this.statusCode = statusCode;
  }
}

export class FileTreeService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
  }

  /**
   * Retrieves the structured hierarchical file/folder tree for a repository from PostgreSQL.
   *
   * @param {string} repositoryId - UUID of the repository.
   * @returns {Promise<object>} - Structured file tree and repository statistics.
   */
  async getRepositoryFileTree(repositoryId) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new FileTreeError("Repository ID is required.", 400);
    }

    // 1. Fetch repository record
    const repository = await this.db.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new FileTreeError(`Repository with ID "${repositoryId}" not found.`, 404);
    }

    // 2. Fetch all ingested file records for the repository
    const files = await this.db.file.findMany({
      where: { repositoryId },
      orderBy: { path: "asc" },
    });

    // 3. Construct hierarchical file tree
    const tree = buildFileTree(files, { repositoryId });

    // 4. Calculate tree metrics
    const flatNodes = flattenTree(tree);
    const fileNodes = flatNodes.filter((n) => n.type === "file");
    const dirNodes = flatNodes.filter((n) => n.type === "dir");
    const sourceFiles = fileNodes.filter((n) => n.isSupportedSource);
    const totalSize = fileNodes.reduce((acc, curr) => acc + (curr.size || 0), 0);

    return {
      success: true,
      repository: {
        id: repository.id,
        owner: repository.owner,
        name: repository.name,
        fullName: `${repository.owner}/${repository.name}`,
        githubUrl: repository.githubUrl,
        defaultBranch: repository.defaultBranch,
        language: repository.language,
        description: repository.description,
        stars: repository.stars,
      },
      tree,
      stats: {
        totalEntries: flatNodes.length,
        totalFiles: fileNodes.length,
        totalDirs: dirNodes.length,
        sourceFiles: sourceFiles.length,
        totalSize,
      },
    };
  }

  /**
   * Retrieves a single file record by path within a repository.
   *
   * @param {string} repositoryId - UUID of the repository.
   * @param {string} filePath - Repository-relative file path.
   * @returns {Promise<object>} - File details.
   */
  async getFileByPath(repositoryId, filePath) {
    if (!repositoryId || !filePath) {
      throw new FileTreeError("Both repositoryId and filePath are required.", 400);
    }

    const cleanPath = filePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

    const file = await this.db.file.findUnique({
      where: {
        repositoryId_path: {
          repositoryId,
          path: cleanPath,
        },
      },
    });

    if (!file) {
      throw new FileTreeError(`File "${cleanPath}" not found in repository "${repositoryId}".`, 404);
    }

    return {
      success: true,
      file: {
        id: file.id,
        repositoryId: file.repositoryId,
        path: file.path,
        name: file.name,
        filename: file.name,
        extension: file.extension,
        type: file.type,
        size: file.size,
        loc: file.loc,
        isSupportedSource: isSupportedSourceFile(file.path),
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    };
  }
}

export const fileTreeService = new FileTreeService();
export default fileTreeService;
