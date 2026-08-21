/**
 * Resolves a repository entity from database by either UUID or "owner:name" / "owner/name".
 *
 * @param {string} idOrIdentifier - Repository UUID or owner:name / owner/name.
 * @param {object} db - Prisma client instance.
 * @param {object} [includeOptions=null] - Optional Prisma include object.
 * @returns {Promise<object|null>}
 */
export async function resolveRepository(idOrIdentifier, db, includeOptions = null) {
  if (!idOrIdentifier || typeof idOrIdentifier !== "string") {
    return null;
  }

  const query = {};
  if (includeOptions) {
    query.include = includeOptions;
  }

  // UUID format check
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrIdentifier);
  if (isUuid) {
    return await db.repository.findUnique({
      where: { id: idOrIdentifier },
      ...query,
    });
  }

  // Handle owner:name or owner/name
  if (idOrIdentifier.includes(":") || idOrIdentifier.includes("/")) {
    const parts = idOrIdentifier.includes(":") ? idOrIdentifier.split(":") : idOrIdentifier.split("/");
    if (parts.length === 2 && parts[0] && parts[1]) {
      return await db.repository.findUnique({
        where: {
          owner_name: {
            owner: parts[0],
            name: parts[1],
          },
        },
        ...query,
      });
    }
  }

  // Fallback try findUnique by id
  try {
    return await db.repository.findUnique({
      where: { id: idOrIdentifier },
      ...query,
    });
  } catch {
    return null;
  }
}

export default resolveRepository;
