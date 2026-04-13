import type { ChildRecord } from '@/types/child';
import type { DegreeRecord } from '@/types/degree';
import type { EmergencyContactRecord } from '@/types/emergencyContact';
import type { MilitaryRecord } from '@/types/military';
import type { PositionRecord } from '@/types/position';
import type { RankRecord } from '@/types/rankRecord';
import type { SpouseRecord } from '@/types/spouse';
import { cleanText, compactErrors, isBlank, isLikelyDate, isValidPhone } from './common';

export function sanitizeSpouse(spouse: SpouseRecord): SpouseRecord {
  return {
    ...spouse,
    spouse_name: cleanText(spouse.spouse_name) || null,
    birth_date: cleanText(spouse.birth_date) || null,
    occupation: cleanText(spouse.occupation) || null,
    phone: cleanText(spouse.phone) || null,
  };
}

export function sanitizeChildren(children: ChildRecord[]): ChildRecord[] {
  return children.map((child) => ({
    ...child,
    child_name: cleanText(child.child_name) || null,
    birth_date: cleanText(child.birth_date) || null,
    birth_place: cleanText(child.birth_place) || null,
  }));
}

export function validateFamily(spouse: SpouseRecord, children: ChildRecord[]): string[] {
  const errors = compactErrors([
    !isBlank(spouse.phone) && !isValidPhone(spouse.phone) ? 'Spouse phone number format looks invalid.' : null,
    !isBlank(spouse.birth_date) && !isLikelyDate(spouse.birth_date) ? 'Spouse birth date should use YYYY-MM-DD or DD/MM/YYYY.' : null,
  ]);

  children.forEach((child, index) => {
    const label = `Child ${index + 1}`;
    if (isBlank(child.child_name) && !isBlank(child.birth_date)) errors.push(`${label}: add a name when a birth date is provided.`);
    if (!isBlank(child.birth_date) && !isLikelyDate(child.birth_date)) errors.push(`${label}: birth date should use YYYY-MM-DD or DD/MM/YYYY.`);
  });

  return errors;
}

export function sanitizeDegrees(degrees: DegreeRecord[]): DegreeRecord[] {
  return degrees.map((degree) => ({
    ...degree,
    degree_type: cleanText(degree.degree_type) || null,
    degree_date: cleanText(degree.degree_date) || null,
    degree_place: cleanText(degree.degree_place) || null,
  }));
}

export function validateDegrees(degrees: DegreeRecord[]): string[] {
  const errors: string[] = [];
  degrees.forEach((degree, index) => {
    const label = `Degree ${index + 1}`;
    const hasAny = !isBlank(degree.degree_type) || !isBlank(degree.degree_date) || !isBlank(degree.degree_place);
    if (hasAny && isBlank(degree.degree_type)) errors.push(`${label}: degree type is required once a degree row is started.`);
    if (!isBlank(degree.degree_date) && !isLikelyDate(degree.degree_date)) errors.push(`${label}: date should use YYYY-MM-DD or DD/MM/YYYY.`);
  });
  return errors;
}

export function sanitizeContacts(contacts: EmergencyContactRecord[]): EmergencyContactRecord[] {
  return contacts.map((contact) => ({
    ...contact,
    contact_name: cleanText(contact.contact_name) || null,
    relationship: cleanText(contact.relationship) || null,
    phone1: cleanText(contact.phone1) || null,
    phone2: cleanText(contact.phone2) || null,
  }));
}

export function validateContacts(contacts: EmergencyContactRecord[]): string[] {
  const errors: string[] = [];
  contacts.forEach((contact, index) => {
    const label = `Emergency contact ${index + 1}`;
    const hasAny = !isBlank(contact.contact_name) || !isBlank(contact.relationship) || !isBlank(contact.phone1) || !isBlank(contact.phone2);
    if (hasAny && isBlank(contact.contact_name)) errors.push(`${label}: name is required once a contact row is started.`);
    if (hasAny && isBlank(contact.phone1) && isBlank(contact.phone2)) errors.push(`${label}: add at least one phone number.`);
    if (!isValidPhone(contact.phone1)) errors.push(`${label}: phone 1 format looks invalid.`);
    if (!isValidPhone(contact.phone2)) errors.push(`${label}: phone 2 format looks invalid.`);
  });
  return errors;
}

export function sanitizePositions(positions: PositionRecord[]): PositionRecord[] {
  return positions.map((position) => ({
    ...position,
    position_title: cleanText(position.position_title) || null,
    date_from: cleanText(position.date_from) || null,
    date_to: cleanText(position.date_to) || null,
  }));
}

export function validatePositions(positions: PositionRecord[]): string[] {
  const errors: string[] = [];
  positions.forEach((position, index) => {
    const label = `Position ${index + 1}`;
    const hasAny = !isBlank(position.position_title) || !isBlank(position.date_from) || !isBlank(position.date_to);
    if (hasAny && isBlank(position.position_title)) errors.push(`${label}: title is required once a position row is started.`);
    if (!isBlank(position.date_from) && !isLikelyDate(position.date_from)) errors.push(`${label}: start date should use YYYY-MM-DD or DD/MM/YYYY.`);
    if (!isBlank(position.date_to) && !isLikelyDate(position.date_to)) errors.push(`${label}: end date should use YYYY-MM-DD or DD/MM/YYYY.`);
  });
  return errors;
}

export function sanitizeMilitary(military: MilitaryRecord): MilitaryRecord {
  return {
    ...military,
    service_branch: cleanText(military.service_branch) || null,
    enlistment_date: cleanText(military.enlistment_date) || null,
    service_number: cleanText(military.service_number) || null,
  };
}

export function sanitizeRanks(ranks: RankRecord[]): RankRecord[] {
  return ranks.map((rank) => ({
    ...rank,
    rank_name: cleanText(rank.rank_name) || null,
    commission_date: cleanText(rank.commission_date) || null,
  }));
}

export function validateMilitary(military: MilitaryRecord, ranks: RankRecord[]): string[] {
  const errors = compactErrors([
    !isBlank(military.enlistment_date) && !isLikelyDate(military.enlistment_date) ? 'Enlistment date should use YYYY-MM-DD or DD/MM/YYYY.' : null,
  ]);
  ranks.forEach((rank, index) => {
    const label = `Rank ${index + 1}`;
    const hasAny = !isBlank(rank.rank_name) || !isBlank(rank.commission_date);
    if (hasAny && isBlank(rank.rank_name)) errors.push(`${label}: rank name is required once a row is started.`);
    if (!isBlank(rank.commission_date) && !isLikelyDate(rank.commission_date)) errors.push(`${label}: commission date should use YYYY-MM-DD or DD/MM/YYYY.`);
  });
  return errors;
}
