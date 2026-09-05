/**
 * Official KSJI Terminology and Logic
 */

export const KSJI_TERMINOLOGY = {
  DEGREE_SECTION: 'Exemplification',
  EXEMPLIFIED: 'Exemplified into the',
  NOBLE_BROTHER: 'Noble Brother',
};

/**
 * Identifies fictitious/system accounts (such as Operational Outflows accounts)
 * that should be excluded from member rosters, member lists, search tables, and executive dashboards.
 */
export function isSystemMember(member: any): boolean {
  if (!member) return false;
  if (member.id === 'f0000000-0000-0000-0000-000000000000') return true;
  if (member.is_system === true || member.is_fictitious === true) return true;
  if (member.member_type === 'system' || member.member_type === 'fictitious' || member.member_type === 'operational') return true;

  const fullText = [
    member.title,
    member.first_name,
    member.other_names,
    member.surname,
    member.email
  ].filter(Boolean).join(' ').toLowerCase();

  return (
    fullText.includes('system account') ||
    fullText.includes('operational outflows') ||
    fullText.includes('operational outflow') ||
    fullText.includes('commandery welfare account') ||
    fullText.includes('welfare account (operational') ||
    fullText.includes('welfare account') ||
    fullText.includes('fictitious')
  );
}

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
 * Month names for formatting (index = month number, 0-indexed).
 */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Helper to safely access month by index (bypasses strict TS indexing)
function getMonth(idx: number): string {
  return MONTHS[idx] ?? '';
}

// Level hierarchy order (lowest → highest) for comparing service levels

/**
 * Pads a number with leading zero if needed (e.g., "5" → "05").
 */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Helper to get day ordinal suffix (1st, 2nd, 3rd, 4th, 11th, 21st, 22nd, 23rd, 31st)
 */
export function getOrdinalSuffix(day: number): string {
  const d = Number(day);
  if (isNaN(d) || d < 1) return String(day);
  const j = d % 10;
  const k = d % 100;
  if (j === 1 && k !== 11) return `${d}st`;
  if (j === 2 && k !== 12) return `${d}nd`;
  if (j === 3 && k !== 13) return `${d}rd`;
  return `${d}th`;
}

/**
 * Formats a date string to ordinal format e.g. "1st Aug 2026" or "8th Jan 2026".
 *
 * Parses ISO dates manually to avoid UTC timezone shifts that would shift the displayed day.
 * Accepts YYYY-MM-DD (ISO), ISO timestamps (2026-08-01T14:30:00Z), or DD/MM/YYYY.
 */
export function formatDisplayDate(
  dateStr: string | null | undefined,
  options?: { numeric?: boolean }
): string {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return '—';

  // Extract date part if ISO timestamp (e.g., 2026-08-01T14:30:00Z)
  const cleanStr = dateStr.split('T')[0].trim();

  // Parse ISO YYYY-MM-DD manually to avoid UTC timezone shifts
  const isoMatch = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const m = Number(month);
    const d = Number(day);

    if (options?.numeric) {
      return `${pad(d)}-${pad(m)}-${year}`;
    }

    const monthName = getMonth(m - 1);
    const ordinalDay = getOrdinalSuffix(d);
    return `${ordinalDay} ${monthName} ${year}`;
  }

  // Parse slash formats (e.g. DD/MM/YYYY or YYYY/MM/DD)
  const parts = cleanStr.split('/');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      const year = parts[0];
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (options?.numeric) return `${pad(d)}-${pad(m)}-${year}`;
      return `${getOrdinalSuffix(d)} ${getMonth(m - 1)} ${year}`;
    } else if (/^\d{1,2}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      // DD/MM/YYYY
      const d = Number(parts[0]);
      const m = Number(parts[1]);
      const year = parts[2];
      if (options?.numeric) return `${pad(d)}-${pad(m)}-${year}`;
      return `${getOrdinalSuffix(d)} ${getMonth(m - 1)} ${year}`;
    }
  }

  // Fallback: Date object parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();

    if (options?.numeric) {
      return `${pad(day)}-${pad(month + 1)}-${year}`;
    }

    return `${getOrdinalSuffix(day)} ${getMonth(month)} ${year}`;
  }

  return '—';
}

// Level hierarchy order (lowest → highest) for comparing service levels
const LEVEL_ORDER = [
  'Local',
  'Battalion',
  'District',
  'Regiment',
  'Grand Commandery',
  'Supreme Subordinate Commandery',
  'Supreme Commandery',
  'Chevaliers (4th Degree)',
  'Nobles Temple',
];

// Levels that count as "above Commandery" for Case C
const ABOVE_COMMANDERY = [
  'Battalion',
  'District',
  'Regiment',
  'Grand Commandery',
  'Supreme Subordinate Commandery',
  'Supreme Commandery',
];

// The display label used in the narrative for each level
const LEVEL_NARRATIVE_LABEL: Record<string, string> = {
  Battalion: 'Battalion',
  District: 'District',
  Regiment: 'Regiment',
  'Grand Commandery': 'Grand Commandery',
  'Supreme Subordinate Commandery': 'Supreme Subordinate Commandery',
  'Supreme Commandery': 'Supreme Commandery',
};

// Maps exact position titles to their leadership role label used in the narrative
const LEADERSHIP_ROLE_MAP: Record<string, { role: 'President' | 'Commander' | 'Grand Master' | 'Noble Grand Master' }> = {
  'President':                      { role: 'President' },
  'Grand President':                { role: 'President' },
  'Supreme Subordinate President':  { role: 'President' },
  'Supreme President':              { role: 'President' },
  'Grand Master':                   { role: 'Grand Master' },
  'Noble Grand Master':             { role: 'Noble Grand Master' },
  'Battalion Commander':            { role: 'Commander' },
  'District Commander':             { role: 'Commander' },
  'Regimental Commander':           { role: 'Commander' },
};

function isHeadLeader(title: string | null | undefined): boolean {
  if (!title) return false;
  // Strip 'Past ' prefix for past-office detection
  const normalised = title.replace(/^Past\s+/i, '');
  return normalised in LEADERSHIP_ROLE_MAP;
}

function leadershipLabel(pos: { position_title?: string | null; level?: string | null }): { levelLabel: string; roleWord: string; preposition: string } {
  const level = pos.level || 'Local';
  const title = (pos.position_title || '').replace(/^Past\s+/i, '');
  const role = LEADERSHIP_ROLE_MAP[title]?.role || 'President';

  let levelLabel = level;
  let preposition = 'at the';

  if (level === 'Local') {
    levelLabel = 'his local commandery';
    preposition = 'of';
  } else if (level === 'Chevaliers (4th Degree)') {
    levelLabel = 'Chapter of Chevaliers';
  } else if (level === 'Nobles Temple') {
    levelLabel = "Nobles' Temple";
  }

  return { levelLabel, roleWord: role, preposition };
}

/**
 * Builds the official KSJI service narrative paragraph for a member's testimonial.
 *
 * @param member  - The member record (including transfer_from, transfer_date, date_joined)
 * @param positions - Array of the member's position records
 * @param degrees - Array of the member's degree records
 * @param joinedDate - Already-formatted joined date string (DD-MMM-YYYY or 'an unknown date')
 * @param displayTitle - The member's displayed title (e.g. 'Bro.', 'Noble Brother')
 * @param firstName  - First name
 * @param surname    - Surname
 * @param transferDate - Already-formatted transfer date string (optional)
 */
export function buildServiceNarrative(params: {
  member: { transfer_from?: string | null; date_joined?: string | null };
  positions: Array<{ position_title?: string | null; level?: string | null; date_to?: string | null }>;
  degrees: Array<{ degree_type?: string | null }>;
  joinedDate: string;
  displayTitle: string;
  firstName: string;
  surname: string;
  transferDate?: string;
}): string {
  const { member, positions, degrees, joinedDate, displayTitle, firstName, surname, transferDate } = params;

  const sentences: string[] = [];

  // --- 1. Base Narrative ------------------------------------------------------
  let base = `${displayTitle} ${firstName} ${surname} was initiated into the Knights of St. John International on ${joinedDate}.`;
  if (member.transfer_from && transferDate) {
    base += ` He subsequently transferred to and joined the St. Margaret-Mary Commandery #500 on ${transferDate}.`;
  }
  base += ' Since then, he has remained a committed member of the Order, embodying the virtues of Charity, Fraternity, and Service.';
  sentences.push(base);

  // --- 2. Service Narrative ---------------------------------------------------
  const hasPositions = positions.length > 0;
  if (hasPositions) {
    const levelsServed = positions.map((p) => p.level || 'Local');
    const highestAbove = ABOVE_COMMANDERY.slice()
      .reverse()
      .find((lvl) => levelsServed.includes(lvl));

    if (highestAbove) {
      // Case C â€” served above commandery level
      sentences.push(
        `Beginning at the Commandery level, he has extended his service through the ${LEVEL_NARRATIVE_LABEL[highestAbove]}, contributing to the work and leadership of the Order across multiple Commanderies.`
      );
    } else {
      // Case B â€” commandery level only
      sentences.push(
        'His service has been rooted at the Commandery level, where he has contributed to the strength and vitality of his local Commandery.'
      );
    }
  }
  // Case A â€” no positions: no service sentence appended

  // --- 3. Leadership Recognition (President / Commander) --------------------
  const leaderRoles = positions.filter((p) => isHeadLeader(p.position_title));

  let presidencyAdded = false;
  if (leaderRoles.length > 0) {
    // Prefer current (date_to is null/empty) over former; prefer highest level
    const current = leaderRoles.filter((p) => !p.date_to || p.date_to.trim() === '');
    const pool = current.length > 0 ? current : leaderRoles;

    // Pick highest level
    const best = pool.reduce((acc, p) => {
      const aIdx = LEVEL_ORDER.indexOf(p.level || 'Local');
      const bIdx = LEVEL_ORDER.indexOf(acc.level || 'Local');
      return aIdx > bIdx ? p : acc;
    });

    const isCurrent = !best.date_to || best.date_to.trim() === '';
    const { levelLabel, roleWord } = leadershipLabel(best);

    if (isCurrent) {
      sentences.push(
        `He currently serves as ${roleWord} at the ${levelLabel}, providing leadership and direction in the affairs of the Order.`
      );
    } else {
      sentences.push(
        `He has served as ${roleWord} at the ${levelLabel}, demonstrating leadership and a strong commitment to the advancement of the Order.`
      );
    }
    presidencyAdded = true;
  }

  // --- 4. Positions Emphasis (only if no presidency) -------------------------
  if (hasPositions && !presidencyAdded) {
    sentences.push(
      'The positions of trust he has held, outlined below, attest to the confidence reposed in him over the years.'
    );
  }

  // --- 5. Honours / Degree Narrative -----------------------------------------
  const has5th = degrees.some(
    (d) => d.degree_type?.toLowerCase().includes('5th') || d.degree_type?.toLowerCase().includes('fifth')
  );
  const has4th = degrees.some(
    (d) => d.degree_type?.toLowerCase().includes('4th') || d.degree_type?.toLowerCase().includes('fourth')
  );

  if (has5th) {
    sentences.push(
      "Having attained the Fifth Degree, he is a Noble and a member of the Accra West Nobles' Temple."
    );
  } else if (has4th) {
    sentences.push(
      'Having been exemplified into the Fourth Degree, he is a Chevalier and a member of the Archbishop William Thomas Porter Chapter of Chevaliers.'
    );
  }

  return sentences.join(' ');
}

/**
 * Builds a formal citation/commendation for a member's service.
 * This is more flowery and ceremonial than the standard narrative.
 */
export function buildFormalCitation(params: {
  displayTitle: string;
  firstName: string;
  surname: string;
  joinedDate: string;
  degrees: Array<{ degree_type?: string | null }>;
  positions: Array<{ position_title?: string | null; level?: string | null }>;
}): string {
  const { displayTitle, firstName, surname, joinedDate, degrees, positions } = params;
  const fullName = `${displayTitle} ${firstName} ${surname}`;

  const has5th = degrees.some(d => d.degree_type?.toLowerCase().includes('5th'));
  const has4th = degrees.some(d => d.degree_type?.toLowerCase().includes('4th'));

  let rankTerm = 'distinguished brother';
  if (has5th) rankTerm = 'Noble Brother';
  else if (has4th) rankTerm = 'Chevalier';

  const highestPos = positions[0]?.position_title || 'devoted member';

  return `This citation is proudly presented in recognition of ${fullName}, a ${rankTerm} of the Knights of St. John International. Having been initiated on ${joinedDate}, he has since exemplified the highest ideals of our Order through his dedicated service as ${highestPos} and beyond. His journey through the degrees of exemplification stands as a testament to his faith, fraternity, and unwavering commitment to the growth of the Commandery. In witness of his exemplary character and leadership, we hereby certify his standing as a true Knight of the Order.`;
}

// ============================================================================
// WELFARE DUES & SUBSCRIPTION STANDING LOGIC
// ============================================================================

/**
 * Welfare calculation parameters for a member
 */
export interface MemberWelfareCalculationParams {
  member: {
    id?: string;
    date_joined?: string | null;
    date_of_birth?: string | null;
    status?: string | null;
    is_deceased?: boolean | null;
  };
  earliestContribution?: {
    year: number;
    month?: number | null;
    payment_date?: string | null;
  } | null;
  ratesMap?: Map<number, number>; // Map of year -> monthly_rate (e.g. 2025 -> 25, 2026 -> 25)
  defaultMonthlyRate?: number;    // Default: 25.00
  baseStartYear?: number;         // Default: 2022 (when digital welfare tracking started)
  currentYear?: number;           // Defaults to current year
  currentMonth?: number;          // Defaults to current month (1-12)
}

export interface ExpectedWelfareResult {
  expectedCumulative: number;
  expectedCurrentYear: number;
  isSeniorExempt: boolean;
  effectiveStartYear: number;
  effectiveStartMonth: number;
  monthsActiveThisYear: number;
  startSource: 'date_joined' | 'earliest_welfare_ledger' | 'genesis_2022' | 'senior_exempt';
}

/**
 * Calculates a member's expected cumulative welfare contributions.
 *
 * To accurately determine when a brother joined and avoid billing for periods prior to his membership:
 * 1. Checks Senior 80+ exemption (expected = GH₵ 0.00).
 * 2. Checks `date_joined` on the member profile (if >= 2022).
 * 3. Cross-references the earliest period (year & month) the brother appears in the welfare ledger.
 *    If a brother has no `date_joined` entered or if his earliest ledger payment shows he joined between 2022 and 2026,
 *    his expected dues begin strictly from his earliest appearance in the welfare ledger.
 * 4. For members whose records/payments date back to inception (2022 M1 or earlier), defaults to Jan 2022.
 */
export function calculateExpectedWelfare(params: MemberWelfareCalculationParams): ExpectedWelfareResult {
  const currentYear = params.currentYear ?? new Date().getFullYear();
  const currentMonth = params.currentMonth ?? (new Date().getMonth() + 1);
  const baseStartYear = params.baseStartYear ?? 2022;
  const defaultMonthlyRate = params.defaultMonthlyRate ?? 25.00;
  const ratesMap = params.ratesMap ?? new Map<number, number>();
  const member = params.member;

  // Senior 80+ Exemption Rule
  let isSeniorExempt = false;
  if (member.date_of_birth) {
    const bYear = new Date(member.date_of_birth).getFullYear();
    if (!isNaN(bYear) && (currentYear - bYear >= 80)) {
      isSeniorExempt = true;
    }
  }

  if (isSeniorExempt) {
    return {
      expectedCumulative: 0,
      expectedCurrentYear: 0,
      isSeniorExempt: true,
      effectiveStartYear: currentYear,
      effectiveStartMonth: 1,
      monthsActiveThisYear: 0,
      startSource: 'senior_exempt',
    };
  }

  // 1. Check date_joined candidate
  let candidateYear: number | null = null;
  let candidateMonth: number | null = null;

  if (member.date_joined) {
    const joined = new Date(member.date_joined);
    if (!isNaN(joined.getTime())) {
      const jYear = joined.getFullYear();
      const jMonth = joined.getMonth() + 1; // 1-12
      if (jYear >= baseStartYear) {
        candidateYear = jYear;
        candidateMonth = Math.min(Math.max(jMonth, 1), 12);
      }
    }
  }

  // 2. Check earliest welfare ledger entry
  let ecYear: number | null = params.earliestContribution?.year ?? null;
  let ecMonth: number = params.earliestContribution?.month ?? 1;

  if (!ecMonth && params.earliestContribution?.payment_date) {
    const pDate = new Date(params.earliestContribution.payment_date);
    if (!isNaN(pDate.getTime())) {
      ecMonth = pDate.getMonth() + 1;
    }
  }

  // 3. Resolve effective start year & month
  let effectiveStartYear = baseStartYear;
  let effectiveStartMonth = 1;
  let startSource: 'date_joined' | 'earliest_welfare_ledger' | 'genesis_2022' | 'senior_exempt' = 'genesis_2022';

  if (candidateYear && ecYear) {
    // If both exist, take the earlier one
    if (ecYear < candidateYear || (ecYear === candidateYear && ecMonth < (candidateMonth || 1))) {
      effectiveStartYear = ecYear;
      effectiveStartMonth = ecMonth;
      startSource = 'earliest_welfare_ledger';
    } else {
      effectiveStartYear = candidateYear;
      effectiveStartMonth = candidateMonth || 1;
      startSource = 'date_joined';
    }
  } else if (candidateYear) {
    effectiveStartYear = candidateYear;
    effectiveStartMonth = candidateMonth || 1;
    startSource = 'date_joined';
  } else if (ecYear && ecYear > baseStartYear) {
    effectiveStartYear = ecYear;
    effectiveStartMonth = ecMonth;
    startSource = 'earliest_welfare_ledger';
  } else {
    effectiveStartYear = baseStartYear;
    effectiveStartMonth = 1;
    startSource = 'genesis_2022';
  }

  // If start is in the future
  if (effectiveStartYear > currentYear) {
    return {
      expectedCumulative: 0,
      expectedCurrentYear: 0,
      isSeniorExempt: false,
      effectiveStartYear,
      effectiveStartMonth,
      monthsActiveThisYear: 0,
      startSource,
    };
  }

  let expectedCumulative = 0;
  let expectedCurrentYear = 0;
  let monthsActiveThisYear = 0;

  for (let yr = effectiveStartYear; yr <= currentYear; yr++) {
    const monthlyRate = ratesMap.get(yr) ?? defaultMonthlyRate;
    const startM = (yr === effectiveStartYear) ? effectiveStartMonth : 1;
    const endM = (yr === currentYear) ? currentMonth : 12;

    if (endM >= startM) {
      const months = (endM - startM + 1);
      const yrExpected = months * monthlyRate;
      expectedCumulative += yrExpected;

      if (yr === currentYear) {
        expectedCurrentYear = yrExpected;
        monthsActiveThisYear = months;
      }
    }
  }

  return {
    expectedCumulative,
    expectedCurrentYear,
    isSeniorExempt: false,
    effectiveStartYear,
    effectiveStartMonth,
    monthsActiveThisYear,
    startSource,
  };
}


export function isEligibleWelfareMember(m: {
  first_name?: string | null;
  surname?: string | null;
  status?: string | null;
  is_deceased?: boolean | null;
}): boolean {
  if (m.is_deceased) return false;
  const s = String(m.status || '').trim().toLowerCase();
  if (['deceased', 'dismissed', 'transfer-out', 'system'].includes(s)) return false;
  const fullName = `${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
  if (fullName.includes('system account') || 
      fullName.includes('operational outflow') || 
      fullName.includes('commandery welfare') ||
      fullName.includes('system')) {
    return false;
  }
  return true;
}

/**
 * Sanitizes phone numbers by stripping whitespace, dashes, parentheses, and dots.
 */
export function sanitizePhoneNumber(input: string | null | undefined): string {
  if (!input) return '';
  return String(input).replace(/[\s\-\(\)\.]/g, '').trim();
}

/**
 * Generates all valid PostgREST-safe query variations of a phone number
 * (e.g. local 024..., international +23324..., raw 23324..., and 9-digit core).
 * Completely eliminates spaces, punctuation, and syntax errors in PostgREST queries.
 */
export function getPhoneQueryVariants(rawPhone: string | null | undefined): string[] {
  const sanitized = sanitizePhoneNumber(rawPhone);
  if (!sanitized) return [];

  const variants = new Set<string>();
  variants.add(sanitized);

  // Extract core Ghana 9-digit subscriber number if applicable
  let core = '';
  if (sanitized.startsWith('+233') && sanitized.length === 13) {
    core = sanitized.slice(4);
  } else if (sanitized.startsWith('233') && sanitized.length === 12) {
    core = sanitized.slice(3);
  } else if (sanitized.startsWith('0') && sanitized.length === 10) {
    core = sanitized.slice(1);
  } else if (sanitized.length === 9 && !sanitized.startsWith('0')) {
    core = sanitized;
  }

  if (core && core.length === 9) {
    variants.add(`0${core}`);
    variants.add(`+233${core}`);
    variants.add(`233${core}`);
    variants.add(core);
  }

  return Array.from(variants);
}

