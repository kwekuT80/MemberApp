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
