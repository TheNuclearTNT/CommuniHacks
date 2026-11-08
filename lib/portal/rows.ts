// db.execute() returns a plain array with the postgres-js driver (TigerData)
// but an object with a `rows` array with the embedded PGlite driver. This
// normalises both so raw-SQL callers work on either database.
export function rowsOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const rows = (res as { rows?: unknown } | null | undefined)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}
