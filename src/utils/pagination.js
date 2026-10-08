// src/utils/pagination.js
/**
 * Generic helper to fetch all rows from a Supabase query builder that might exceed PostgREST's 1000-row limit.
 * Runs range queries iteratively until all rows have been fetched.
 */
export async function fetchAllRows(fetchPage) {
  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) throw error;

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return allRows;
}
