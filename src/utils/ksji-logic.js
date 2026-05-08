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
export function formatMemberTitle(title) {
  if (!title) return 'Brother';
  if (title === 'N/B') return KSJI_TERMINOLOGY.NOBLE_BROTHER;
  return title;
}

/**
 * Formats a degree entry using official KSJI language
 */
export function formatExemplification(degreeType, date, place) {
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

// Helper to safely access month by index
function getMonth(idx) {
  return MONTHS[idx] ?? '';
}

/**
 * Pads a number with leading zero if needed (e.g., "5" → "05").
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Formats a date string to DD-MM-YYYY or DD-MMM-YYYY.
 *
 * Parses ISO dates manually to avoid UTC timezone shifts that would shift the displayed day.
 * Accepts YYYY-MM-DD (ISO) or DD/MM/YYYY; always outputs DD-MMM-YYYY.
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return '—';

  // Parse ISO YYYY-MM-DD manually to avoid UTC timezone shifts
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const m = Number(month);
    return `${pad(Number(day))}-${getMonth(m - 1)}-${year}`;
  }

  const parts = dateStr.split('/');
  if (parts.length === 3 && /^\d{2}$/.test(parts[0]) && /\d{2}/.test(parts[1])) {
    return `${pad(Number(parts[0]))}-${getMonth(Number(parts[1]) - 1)}-${parts[2]}`;
  }

  // Fallback: DD/MM/YYYY
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
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
const LEVEL_NARRATIVE_LABEL = {
  Battalion: 'Battalion',
  District: 'District',
  Regiment: 'Regiment',
  'Grand Commandery': 'Grand Commandery',
  'Supreme Subordinate Commandery': 'Supreme Subordinate Commandery',
  'Supreme Commandery': 'Supreme Commandery',
};

// Maps exact position titles to their leadership role label used in the narrative
const LEADERSHIP_ROLE_MAP = {
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

function isHeadLeader(title) {
  if (!title) return false;
  // Strip 'Past ' prefix for past-office detection
  const normalised = title.replace(/^Past\s+/i, '');
  return normalised in LEADERSHIP_ROLE_MAP;
}

function leadershipLabel(pos) {
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
 */
export function buildServiceNarrative(params) {
  const { member, positions, degrees, joinedDate, displayTitle, firstName, surname, transferDate } = params;

  const sentences = [];

  // --- 1. Base Narrative ---
  let base = `${displayTitle} ${firstName} ${surname} was initiated into the Knights of St. John International on ${joinedDate}.`;
  if (member.transfer_from && transferDate) {
    base += ` He subsequently transferred to and joined the St. Margaret-Mary Commandery #500 on ${transferDate}.`;
  }
  base += ' Since then, he has remained a committed member of the Order, embodying the virtues of Charity, Fraternity, and Service.';
  sentences.push(base);

  // --- 2. Service Narrative ---
  const hasPositions = positions.length > 0;
  if (hasPositions) {
    const levelsServed = positions.map((p) => p.level || 'Local');
    const highestAbove = ABOVE_COMMANDERY.slice()
      .reverse()
      .find((lvl) => levelsServed.includes(lvl));

    if (highestAbove) {
      sentences.push(
        `Beginning at the Commandery level, he has extended his service through the ${LEVEL_NARRATIVE_LABEL[highestAbove]}, contributing to the work and leadership of the Order across multiple Commanderies.`
      );
    } else {
      sentences.push(
        'His service has been rooted at the Commandery level, where he has contributed to the strength and vitality of his local Commandery.'
      );
    }
  }

  // --- 3. Leadership Recognition ---
  const leaderRoles = positions.filter((p) => isHeadLeader(p.position_title));

  let presidencyAdded = false;
  if (leaderRoles.length > 0) {
    const current = leaderRoles.filter((p) => !p.date_to || p.date_to.trim() === '');
    const pool = current.length > 0 ? current : leaderRoles;

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

  // --- 4. Positions Emphasis ---
  if (hasPositions && !presidencyAdded) {
    sentences.push(
      'The positions of trust he has held, outlined below, attest to the confidence reposed in him over the years.'
    );
  }

  // --- 5. Honours / Degree Narrative ---
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
 */
export function buildFormalCitation(params) {
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
