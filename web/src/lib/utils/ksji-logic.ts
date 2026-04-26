/**
 * Official KSJI Terminology and Logic
 */

export const KSJI_TERMINOLOGY = {
  DEGREE_SECTION: 'Exemplification',
  EXEMPLIFIED: 'Exemplified into the',
  NOBLE_BROTHER: 'Noble Brother',
};

/**
 * Expands titles like 'N/B' to 'Noble Brother' and handles other honorifics
 */
export function formatMemberTitle(title: string | null) {
  if (!title) return 'Brother';
  if (title === 'N/B') return KSJI_TERMINOLOGY.NOBLE_BROTHER;
  return title;
}

/**
 * Formats a degree entry using official KSJI language
 */
export function formatExemplification(degreeType: string, date?: string | null, place?: string | null) {
  const year = date ? new Date(date).getFullYear() : '—';
  const action = KSJI_TERMINOLOGY.EXEMPLIFIED;
  
  return {
    year,
    narrative: `${action} ${degreeType}`,
    details: place ? `at ${place}` : null
  };
}

/**
 * Formats a date string to DD-MMM-YYYY (e.g., 15-Apr-2023) to avoid confusion.
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  } catch (e) {
    return '—';
  }
}
