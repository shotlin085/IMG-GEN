/**
 * Postgres raises SQLSTATE 23505 for unique/PK violations. Surfacing those as
 * a plain 500 tells an operator nothing, so every write that can collide on a
 * natural key maps the driver error to a real conflict first.
 *
 * Drizzle re-throws its own `DrizzleQueryError` with the pg error in `cause`,
 * so the code has to be read off the chain rather than the top-level error.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
