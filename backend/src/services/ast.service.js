import prisma from "../config/database.js";
import { isSupportedSourceFile } from "../utils/fileFilter.js";
import { analyzeSource } from "../analyzers/javascript/astAnalyzer.js";

export class AstService {
  constructor(options = {}) {
    this.db = options.prisma || prisma;
  }

  /**
   * Statically parses and analyzes a single source file.
   *
   * @param {string} filePath - Repository-relative file path.
   * @param {string} fileContent - Raw source code content.
   * @param {object} [options={}] - Analyzer options.
   * @returns {{
   *   filePath: string,
   *   isSupported: boolean,
   *   success: boolean,
   *   error: string|null,
   *   symbols: Array<object>,
   *   imports: Array<object>,
   *   exports: Array<object>
   * }}
   */
  analyzeFile(filePath, fileContent, options = {}) {
    if (!filePath || typeof filePath !== "string") {
      return {
        filePath: filePath || "",
        isSupported: false,
        success: false,
        error: "Invalid file path",
        symbols: [],
        imports: [],
        exports: [],
      };
    }

    if (!isSupportedSourceFile(filePath)) {
      return {
        filePath,
        isSupported: false,
        success: true,
        error: null,
        symbols: [],
        imports: [],
        exports: [],
      };
    }

    const result = analyzeSource(fileContent || "", { ...options, filePath });

    return {
      filePath,
      isSupported: true,
      ...result,
    };
  }

  /**
   * Statically analyzes multiple repository source files, ensuring that a syntax
   * error in one file does not fail analysis of remaining files.
   *
   * @param {Array<{ path: string, content: string, fileId?: string }>} fileEntries - Array of file entries with content.
   * @param {object} [options={}] - Options object.
   * @returns {Array<object>} - Array of per-file analysis results.
   */
  analyzeRepositoryFiles(fileEntries = [], options = {}) {
    if (!Array.isArray(fileEntries)) {
      return [];
    }

    return fileEntries.map((fileEntry) => {
      try {
        const analysis = this.analyzeFile(fileEntry.path, fileEntry.content, options);
        return {
          fileId: fileEntry.fileId || null,
          ...analysis,
        };
      } catch (err) {
        return {
          filePath: fileEntry.path,
          fileId: fileEntry.fileId || null,
          isSupported: isSupportedSourceFile(fileEntry.path),
          success: false,
          error: err.message,
          symbols: [],
          imports: [],
          exports: [],
        };
      }
    });
  }

  /**
   * Persists extracted symbols for a given file into PostgreSQL via Prisma.
   *
   * @param {string} fileId - UUID of the file.
   * @param {Array<{ name: string, type: string, startLine: number, endLine: number }>} symbols - Symbols to persist.
   * @returns {Promise<{ count: number }>}
   */
  async persistFileSymbols(fileId, symbols = []) {
    if (!fileId || typeof fileId !== "string") {
      throw new Error("fileId is required to persist symbols");
    }

    // Delete existing symbols for idempotency
    await this.db.symbol.deleteMany({
      where: { fileId },
    });

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return { count: 0 };
    }

    const records = symbols.map((s) => ({
      fileId,
      name: s.name,
      type: s.type,
      startLine: s.startLine ?? 1,
      endLine: s.endLine ?? 1,
    }));

    const result = await this.db.symbol.createMany({
      data: records,
    });

    return { count: result.count };
  }

  /**
   * Batches persistence of symbols for an entire repository in a single transaction/operation.
   *
   * @param {string} repositoryId - UUID of the repository.
   * @param {Array<{ fileId: string, name: string, type: string, startLine: number, endLine: number }>} allSymbols - All symbols across repository files.
   * @returns {Promise<{ count: number }>}
   */
  async persistRepositorySymbols(repositoryId, allSymbols = []) {
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new Error("repositoryId is required to persist symbols");
    }

    // Delete existing symbols for the entire repository
    await this.db.symbol.deleteMany({
      where: { file: { repositoryId } },
    });

    if (!Array.isArray(allSymbols) || allSymbols.length === 0) {
      return { count: 0 };
    }

    const records = allSymbols.map((s) => ({
      fileId: s.fileId,
      name: s.name,
      type: s.type || s.kind || "symbol",
      startLine: s.startLine ?? 1,
      endLine: s.endLine ?? 1,
    }));

    const CHUNK_SIZE = 1000;
    let totalCount = 0;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const result = await this.db.symbol.createMany({
        data: chunk,
      });
      totalCount += result.count;
    }

    return { count: totalCount };
  }
}

export const astService = new AstService();
export default astService;
