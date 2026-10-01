export interface OfficerRoleDefinition {
  id: string;
  title: string;
  category: 'commandery' | 'trustees' | 'military' | 'appointed';
  categoryLabel: string;
  isAppointive?: boolean;
  order: number;
  aliases: string[];
}

export const STANDARD_OFFICER_ROLES: OfficerRoleDefinition[] = [
  // 1. Commandery Officers
  {
    id: 'worthy_president',
    title: 'Worthy President',
    category: 'commandery',
    categoryLabel: 'Commandery Officers',
    order: 1,
    aliases: ['President', 'Worthy President'],
  },
  {
    id: 'first_vice_president',
    title: '1st Vice President',
    category: 'commandery',
    categoryLabel: 'Commandery Officers',
    order: 2,
    aliases: ['1st Vice President', 'First Vice President', '1st Vice President (SMM)'],
  },
  {
    id: 'second_vice_president',
    title: '2nd Vice President',
    category: 'commandery',
    categoryLabel: 'Commandery Officers',
    order: 3,
    aliases: ['2nd Vice President', 'Second Vice President'],
  },
  {
    id: 'recording_secretary',
    title: 'Recording & Corresponding Secretary',
    category: 'commandery',
    categoryLabel: 'Commandery Officers',
    order: 4,
    aliases: [
      'Recording & Corresponding Secretary',
      'Recording Secretary',
      'Corresponding & Rec. Secretary',
      'Secretary',
    ],
  },
  {
    id: 'assistant_recording_secretary',
    title: 'Assistant Recording Secretary',
    category: 'commandery',
    categoryLabel: 'Commandery Officers',
    isAppointive: true,
    order: 5,
    aliases: [
      'Assistant Recording Secretary',
      'Assistant Secretary',
      'Asst. Recording Secretary',
      'Asst. Secretary',
      'Assistant Rec. Secretary',
    ],
  },
  {
    id: 'financial_secretary',
    title: 'Financial Secretary',
    category: 'commandery',
    categoryLabel: 'Commandery Officers',
    order: 6,
    aliases: ['Financial Secretary'],
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    category: 'commandery',
    categoryLabel: 'Commandery Officers',
    order: 7,
    aliases: ['Treasurer'],
  },

  // 2. Trustees
  {
    id: 'first_trustee',
    title: '1st Trustee',
    category: 'trustees',
    categoryLabel: 'Trustees',
    order: 8,
    aliases: ['1st Trustee', 'First Trustee'],
  },
  {
    id: 'second_trustee',
    title: '2nd Trustee',
    category: 'trustees',
    categoryLabel: 'Trustees',
    order: 9,
    aliases: ['2nd Trustee', 'Second Trustee'],
  },
  {
    id: 'third_trustee',
    title: '3rd Trustee',
    category: 'trustees',
    categoryLabel: 'Trustees',
    order: 10,
    aliases: ['3rd Trustee', 'Third Trustee', '3rd Trustee St. MM Com 500'],
  },

  // 3. Military Officers
  {
    id: 'commander',
    title: 'Commander',
    category: 'military',
    categoryLabel: 'Military Officers',
    order: 11,
    aliases: ['Commander'],
  },
  {
    id: 'first_vice_commander',
    title: '1st Vice Commander',
    category: 'military',
    categoryLabel: 'Military Officers',
    order: 12,
    aliases: ['1st Vice Commander', 'First Vice Commander'],
  },
  {
    id: 'second_vice_commander',
    title: '2nd Vice Commander',
    category: 'military',
    categoryLabel: 'Military Officers',
    order: 13,
    aliases: ['2nd Vice Commander', 'Second Vice Commander'],
  },
  {
    id: 'seargent_at_arms',
    title: 'Seargent-At-Arms',
    category: 'military',
    categoryLabel: 'Military Officers',
    order: 14,
    aliases: [
      'Seargent-At-Arms',
      'Sergeant-At-Arms',
      'Seargent at Arms',
      'Sergeant at Arms',
      'Seargent-at-Arms',
      'Sergeant-at-Arms',
    ],
  },
  {
    id: 'messenger',
    title: 'Messenger',
    category: 'military',
    categoryLabel: 'Military Officers',
    order: 15,
    aliases: ['Messenger'],
  },
  {
    id: 'guard',
    title: 'Guard',
    category: 'military',
    categoryLabel: 'Military Officers',
    order: 16,
    aliases: ['Guard'],
  },

  // 4. Appointed Officers (Explicitly marked appointive, non-military staff)
  {
    id: 'cadet_organiser',
    title: 'Cadet Organiser',
    category: 'appointed',
    categoryLabel: 'Appointed Officers',
    isAppointive: true,
    order: 17,
    aliases: ['Cadet Organiser', 'Cadet Organizer'],
  },
];

export interface AssignedOfficer {
  positionId?: string;
  memberId: string;
  title: string;
  firstName: string;
  surname: string;
  memberTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  status?: string | null;
  positionTitle: string;
  level: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  tenureDisplay: string;
  isIncumbent: boolean;
}

export interface OfficerSlot {
  role: OfficerRoleDefinition;
  assigned: AssignedOfficer | null;
}

export interface TermAdministration {
  termKey: string;
  startYear: number;
  endYear: number;
  label: string;
  isCurrent: boolean;
  slots: OfficerSlot[];
  additionalOfficers: AssignedOfficer[];
}

/**
 * Normalizes any database position string to the canonical title if matching an alias
 */
export function normalizePositionTitle(rawTitle: string): string {
  const trimmed = (rawTitle || '').trim().toLowerCase();
  for (const role of STANDARD_OFFICER_ROLES) {
    if (role.title.toLowerCase() === trimmed) return role.title;
    for (const alias of role.aliases) {
      if (alias.toLowerCase() === trimmed) return role.title;
    }
  }
  return rawTitle.trim();
}
