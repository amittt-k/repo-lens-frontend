import path from "node:path";
import prisma from "../config/database.js";
import githubService from "./github.service.js";
import { shouldIngestFile, isSupportedSourceFile } from "../utils/fileFilter.js";

export class IngestionService {
  constructor(options = {}) {
    this.github = options.githubService || githubService;
    this.db = options.prisma || prisma;
  }

  /**
   * Ingests a public GitHub repository by validating it, fetching its file tree,
   * applying filtering rules, and persisting the repository and file records.
   *
   * @param {string} url - Public GitHub repository URL.
   * @returns {Promise<object>} - Ingestion summary with repository metadata and stats.
   */
  async ingestRepository(url) {
    // 1. Validate URL and retrieve repository overview metadata
    const validation = await this.github.validateAndFetchRepository(url);
    const repoMeta = validation.repository;
    const { owner, name, defaultBranch } = repoMeta;

    // 2. Fetch recursive Git file tree from GitHub
    const rawTree = await this.github.fetchRepositoryTree(owner, name, defaultBranch);

    // 3. Filter tree entries according to repository ingestion rules
    const filteredEntries = rawTree.filter((entry) =>
      shouldIngestFile(entry.path, entry.type),
    );

    // 4. Normalize file records for the database schema
    const filesToInsert = filteredEntries.map((entry) => {
      const isDir = entry.type === "tree";
      const normalizedPath = entry.path.replace(/\\/g, "/");
      const baseName = path.basename(normalizedPath);
      const ext = isDir ? null : path.extname(normalizedPath) || null;

      return {
        path: normalizedPath,
        name: baseName,
        extension: ext,
        type: isDir ? "dir" : "file",
        size: entry.size || 0,
        loc: 0,
      };
    });

    const fileCount = filesToInsert.filter((f) => f.type === "file").length;
    const dirCount = filesToInsert.filter((f) => f.type === "dir").length;
    const sourceCount = filesToInsert.filter((f) => isSupportedSourceFile(f.path)).length;
    const ignoredCount = rawTree.length - filteredEntries.length;

    // 5. Database Persistence (upsert Repository & recreate Files)
    const repository = await this.db.repository.upsert({
      where: {
        owner_name: { owner, name },
      },
      update: {
        githubUrl: repoMeta.githubUrl,
        defaultBranch: repoMeta.defaultBranch,
        language: repoMeta.language,
        description: repoMeta.description,
        stars: repoMeta.stars,
        updatedAt: new Date(),
      },
      create: {
        githubUrl: repoMeta.githubUrl,
        owner,
        name,
        defaultBranch: repoMeta.defaultBranch,
        language: repoMeta.language,
        description: repoMeta.description,
        stars: repoMeta.stars,
      },
    });

    // Delete existing files to support idempotent re-ingestion without duplicate keys
    await this.db.file.deleteMany({
      where: { repositoryId: repository.id },
    });

    // Bulk insert new normalized file records
    if (filesToInsert.length > 0) {
      const recordsWithRepoId = filesToInsert.map((f) => ({
        ...f,
        repositoryId: repository.id,
      }));
      await this.db.file.createMany({
        data: recordsWithRepoId,
      });
    }

    // Record analysis status
    const analysis = await this.db.analysis.create({
      data: {
        repositoryId: repository.id,
        status: "COMPLETED",
        metadata: {
          stage: "INGESTION",
          totalEntries: rawTree.length,
          ingestedFiles: fileCount,
          ingestedDirs: dirCount,
          sourceFiles: sourceCount,
          ignoredEntries: ignoredCount,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // 6. Return structured ingestion result
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
      stats: {
        totalEntries: rawTree.length,
        ingestedFiles: fileCount,
        ingestedDirs: dirCount,
        sourceFiles: sourceCount,
        ignoredEntries: ignoredCount,
      },
      analysis: {
        id: analysis.id,
        status: analysis.status,
      },
    };
  }
}

export const ingestionService = new IngestionService();
export default ingestionService;
