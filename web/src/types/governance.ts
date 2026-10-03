import { AssignedOfficer, TermAdministration } from './officers';
import { PresidentItem } from '@/components/presidents/RollOfWorthyPresidentsClient';
import { CommitteeDefinition } from '@/lib/constants/committees';

export interface TempleMemberRecord {
  id: string;
  memberId: string;
  name: string;
  title: string;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  conferralDate?: string | null;
  conferralPlace?: string | null;
  yearsInDegree?: number | null;
  status: string;
  isDeceased: boolean;
}

export interface TempleOfficerRecord {
  positionId: string;
  memberId: string;
  name: string;
  title: string;
  positionTitle: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  isIncumbent: boolean;
}

export interface DegreeTempleData {
  name: string;
  shortName: string;
  degreeLevel: string;
  badgeLabel: string;
  crestEmoji: string;
  themeColor: string;
  accentBg: string;
  borderColor: string;
  leadershipTitle: string;
  description: string;
  roster: TempleMemberRecord[];
  officers: TempleOfficerRecord[];
}

export interface CommitteeMemberRecord {
  positionId: string;
  memberId: string;
  name: string;
  title: string;
  committeeRole: string; // e.g. "Chairman", "Secretary", "Member"
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface EnhancedCommittee extends CommitteeDefinition {
  assignedMembers: CommitteeMemberRecord[];
  activeChair?: CommitteeMemberRecord | null;
}

export interface GovernanceHubData {
  officers: {
    administrations: TermAdministration[];
    currentTerm: TermAdministration | null;
  };
  boardOfTrustees: {
    chairman: AssignedOfficer | null;
    electedTrustees: AssignedOfficer[];
    executiveOfficers: AssignedOfficer[];
    pastPresidents: PresidentItem[];
  };
  degreeTemples: {
    chevaliersChapter: DegreeTempleData;
    noblesTemple: DegreeTempleData;
  };
  committees: EnhancedCommittee[];
  allEligibleMembers: Array<{
    id: string;
    title: string;
    firstName: string;
    surname: string;
    status: string;
    isDeceased: boolean;
  }>;
}
