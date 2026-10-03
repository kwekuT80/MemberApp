/**
 * KSJI Commandery #500 — Committee Governance & Structure
 * Sourced directly from the Committee Governance, Structure & Appointment Manual (Feb 2026).
 * 
 * General Rule:
 * Committees exist to support the work of officers, not to replace them.
 * All committees report through the Worthy President.
 */

export interface CommitteeDefinition {
  id: string;
  name: string;
  shortName: string;
  chairmanRole?: string;
  mandate: string;
  owns: string[];
  doesNotOwn: string[];
  collaboratesWith: string[];
  color: string;
}

export const KSJI_COMMANDERY_COMMITTEES: CommitteeDefinition[] = [
  {
    id: 'education_rituals',
    name: 'Education & Ritual Affairs Committee',
    shortName: 'Education & Rituals',
    mandate: 'To preserve and transmit knowledge of the Constitution, rituals, history, and officer responsibilities through structured education and guidance, ensuring continuity of correct practice within the Commandery.',
    owns: [
      'Education programmes',
      'Officer orientation',
      'Constitution teaching',
      'Ritual instruction',
      'Training manuals',
      'Mentoring on KSJI traditions',
    ],
    doesNotOwn: [
      'Liturgical programmes (Liturgical)',
      'Drill training (Military)',
      'Cadet discipline programmes (Cadets)',
    ],
    collaboratesWith: ['President', 'Liturgical', 'Cadets', 'Military'],
    color: '#f59e0b',
  },
  {
    id: 'membership_initiation',
    name: 'Membership & Initiation Committee',
    shortName: 'Membership & Initiation',
    mandate: 'To oversee the recruitment, vetting, admission, and proper initiation of prospective members into the Commandery, ensuring that all candidates meet the standards, discipline, and Catholic values of the Order, and that every initiation process is conducted with dignity, accuracy, and adherence to KSJI tradition and procedure.',
    owns: [
      'Membership recruitment strategy',
      'Screening processes',
      'Candidate interviews',
      'Candidate recommendation reports',
      'Initiation preparation',
      'Orientation of new members',
    ],
    doesNotOwn: [
      'Cadet formation (Cadets)',
      'Ritual instruction (Education)',
      'Drill training (Military)',
      'Spiritual retreats (Liturgical)',
    ],
    collaboratesWith: ['President', 'Secretary', 'Education', 'Liturgical', 'Cadets', 'Military'],
    color: '#ea580c',
  },
  {
    id: 'liturgical_spiritual',
    name: 'Liturgical & Spiritual Affairs Committee',
    shortName: 'Liturgical & Spiritual',
    mandate: 'To promote the spiritual growth of members and coordinate the Commandery’s participation in parish liturgical life through Masses, prayers, and spiritual programmes that strengthen the Catholic identity of the Order.',
    owns: [
      'Commandery Mass participation',
      'Prayers and spiritual programmes',
      'Retreats',
      'Recollections',
      'Spiritual guidance activities',
      'Chaplain coordination',
    ],
    doesNotOwn: [
      'Ritual/constitution teaching (Education)',
      'Initiation processes (Membership)',
      'Welfare support (Welfare)',
      'Event food/logistics (Social)',
    ],
    collaboratesWith: ['President', 'Education', 'Cadets', 'Social'],
    color: '#e11d48',
  },
  {
    id: 'cadets_juniors',
    name: 'Cadets & Juniors Committee',
    shortName: 'Cadets & Juniors',
    mandate: 'To guide, mentor, and form Cadets and Juniors in discipline, Catholic values, and KSJI traditions, preparing them for progression into responsible and committed Knighthood.',
    owns: [
      'Cadet training and activities',
      'Mentoring and supervision of cadets/juniors',
      'Cadet discipline',
      'Cadet development programmes',
    ],
    doesNotOwn: [
      'Drill rehearsals and ceremonial formations (Military)',
      'Membership vetting (Membership)',
      'Liturgical programming (Liturgical)',
    ],
    collaboratesWith: ['Military', 'Education', 'Liturgical'],
    color: '#9333ea',
  },
  {
    id: 'military_drill',
    name: 'Military & Drill Committee',
    shortName: 'Military & Drill',
    chairmanRole: 'Captain — Chairman',
    mandate: 'To maintain the highest standard of drill discipline, sword training, parade formation, and ceremonial movement so that the Commandery’s public conduct reflects order, precision, and the proud traditions of KSJI.',
    owns: [
      'Drill rehearsals',
      'Sword training',
      'Parade formation',
      'Command structure during ceremonies',
      'Funeral drill execution',
      'Ceremonial discipline',
    ],
    doesNotOwn: [
      'Funeral rites planning (Funeral)',
      'Welfare matters (Welfare)',
      'Food/venue arrangements (Social)',
      'Budgeting (Finance)',
    ],
    collaboratesWith: ['Funeral', 'Cadets', 'President'],
    color: '#16a34a',
  },
  {
    id: 'finance_budget',
    name: 'Finance / Budget Committee',
    shortName: 'Finance / Budget',
    mandate: 'To prepare, review, and advise on the financial requirements of Commandery activities, ensuring that adequate funds are planned for and available to support approved programmes and obligations of the Commandery.',
    owns: [
      'Budget preparation',
      'Financial forecasting',
      'Committee financial advice',
      'Event budgeting support',
      'Expenditure review recommendations',
    ],
    doesNotOwn: [
      'Collection and custody of funds (Treasurer)',
      'Welfare interventions (Welfare)',
      'Food/venue procurement (Social)',
      'Funeral rites planning (Funeral)',
    ],
    collaboratesWith: ['Funeral', 'Social', 'Welfare', 'Treasurer', 'Secretary'],
    color: '#0284c7',
  },
  {
    id: 'welfare',
    name: 'Welfare Committee',
    shortName: 'Welfare',
    mandate: 'To oversee the welfare of brothers and their families through visits, support, and interventions during times of need, particularly during bereavement, and to ensure that the Commandery remains visibly present in care, compassion, and assistance.',
    owns: [
      'Condolence visits',
      'Welfare support coordination',
      'Water presentation',
      'Welfare packages',
      'Table donations',
      'Brotherhood assistance programmes',
    ],
    doesNotOwn: [
      'Funeral rites planning and execution (Funeral)',
      'Food and venue arrangements (Social)',
      'Budgeting (Finance)',
    ],
    collaboratesWith: ['Funeral', 'Social', 'Finance', 'Secretary'],
    color: '#0d9488',
  },
  {
    id: 'social',
    name: 'Social Committee',
    shortName: 'Social',
    mandate: 'To organize and provide all food, drinks, venue arrangements, and hospitality logistics required for Commandery programmes, ensuring that every KSJI activity is supported in a manner that reflects fraternity, order, and dignity.',
    owns: [
      'Food',
      'Drinks',
      'Venue arrangements',
      'Hospitality planning',
      'Seating arrangements',
      'Repast logistics',
      'Event hosting support',
      'Transportation arrangements',
    ],
    doesNotOwn: [
      'Funeral rites planning (Funeral)',
      'Welfare interventions (Welfare)',
      'Budget approval (Finance)',
    ],
    collaboratesWith: ['President', 'Funeral', 'Welfare', 'Finance'],
    color: '#7c3aed',
  },
  {
    id: 'funeral',
    name: 'Funeral Committee',
    shortName: 'Funeral',
    mandate: 'To plan and coordinate all KSJI funeral rites and Commandery funeral practices with dignity and precision.',
    owns: [
      'Memorial ritual',
      'Departure honours',
      'Church pre-burial coordination',
      'Graveside sequence',
      'Wreath',
      'Cross',
    ],
    doesNotOwn: [
      'Food/venue (Social)',
      'Welfare matters (Welfare)',
      'Budgets (Finance)',
    ],
    collaboratesWith: ['President', 'Captain', 'Secretary', 'Welfare', 'Social', 'Finance'],
    color: '#475569',
  },
];
