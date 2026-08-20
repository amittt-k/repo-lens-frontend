import { Readable } from "node:stream";
import zlib from "node:zlib";

/**
 * Parses a streaming gzipped tar archive and extracts supported files into a Map.
 *
 * @param {ReadableStream|Readable} inputStream - Gzipped tar stream.
 * @param {Function} [shouldExtractPath] - Filter predicate (normalizedPath: string) => boolean.
 * @param {object} [options={}] - Extraction bounds.
 * @param {number} [options.maxFileSize=2097152] - Maximum file size to extract (default 2MB).
 * @param {number} [options.maxTotalExtractedBytes=52428800] - Maximum total extracted bytes (default 50MB).
 * @returns {Promise<Map<string, string>>} - Map of relativeFilePath -> fileContentUtf8.
 */
export async function extractTarStream(inputStream, shouldExtractPath = () => true, options = {}) {
  const nodeStream = inputStream instanceof Readable ? inputStream : Readable.fromWeb(inputStream);
  const gunzip = zlib.createGunzip();
  const chunks = [];

  const uncompressedBuffer = await new Promise((resolve, reject) => {
    nodeStream
      .pipe(gunzip)
      .on("data", (c) => chunks.push(c))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
    nodeStream.on("error", reject);
  });

  return extractTarBuffer(uncompressedBuffer, shouldExtractPath, options);
}

/**
 * Extracts supported files from an uncompressed or decompressed tar buffer in memory.
 *
 * @param {Buffer} tarBuffer - Raw tar buffer.
 * @param {Function} [shouldExtractPath] - Filter predicate.
 * @param {object} [options={}] - Options.
 * @returns {Map<string, string>}
 */
export function extractTarBuffer(tarBuffer, shouldExtractPath = () => true, options = {}) {
  const maxFileSize = options.maxFileSize || 2 * 1024 * 1024;
  const maxTotalExtractedBytes = options.maxTotalExtractedBytes || 50 * 1024 * 1024;
  const fileContents = new Map();

  let offset = 0;
  let totalExtractedBytes = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);

    let isZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        isZero = false;
        break;
      }
    }
    if (isZero) break;

    let name = header.toString("utf8", 0, 100).replace(/\0.*$/, "").trim();
    const prefix = header.toString("utf8", 345, 500).replace(/\0.*$/, "").trim();
    if (prefix) {
      name = `${prefix}/${name}`;
    }

    const sizeStr = header.toString("utf8", 124, 136).replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeFlag = String.fromCharCode(header[156]);

    offset += 512;

    const isFile = typeFlag === "0" || typeFlag === "\0" || typeFlag === "";

    if (isFile && size > 0) {
      const slashIndex = name.indexOf("/");
      const relPath = slashIndex !== -1 ? name.slice(slashIndex + 1) : name;
      const normRelPath = relPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

      if (normRelPath && shouldExtractPath(normRelPath) && size <= maxFileSize) {
        if (totalExtractedBytes + size <= maxTotalExtractedBytes) {
          const contentBuf = tarBuffer.subarray(offset, offset + size);
          fileContents.set(normRelPath, contentBuf.toString("utf8"));
          totalExtractedBytes += size;
        }
      }
    }

    offset += Math.ceil(size / 512) * 512;
  }

  return fileContents;
}

export default {
  extractTarStream,
  extractTarBuffer,
};
