/** Read every bounded Data API page instead of silently accepting its server row limit. */
export async function readAll<T>(query: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> }) {
  const data: T[] = []
  const pageSize = 200
  for (let from = 0; ; from += pageSize) {
    const result = await query.range(from, from + pageSize - 1)
    if (result.error) return { data: null, error: result.error }
    data.push(...(result.data || []))
    if ((result.data?.length || 0) < pageSize) return { data, error: null }
  }
}
