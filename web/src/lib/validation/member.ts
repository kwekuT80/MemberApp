import type { Member } from '@/types/member';
import { cleanText, compactErrors, isValidEmail, isValidPhone, isLikelyDate, isBlank } from './common';

export function sanitizeMember(member: Member): Member {
  const cleaned: Member = { ...member };
  const textKeys: Array<keyof Member> = [
    'title','surname','first_name','other_names','date_of_birth','birth_town','birth_region','nationality','home_town','home_region','residential_address','postal_address','phone','mobile','email','fathers_name','mothers_name','marital_status','emp_status','occupation','workplace','job_status','work_address','uniform_positions','degree1_place','degree23_place','degree4_place','degree_noble_place','date_joined'
  ];
  for (const key of textKeys) {
    const value = (cleaned as any)[key];
    if (typeof value === 'string') {
      (cleaned as any)[key] = cleanText(value) || null;
    }
  }
  return cleaned;
}

export function validateMember(member: Member): string[] {
  const errors = compactErrors([
    isBlank(member.surname) ? 'Surname is required.' : null,
    isBlank(member.first_name) ? 'First name is required.' : null,
    !isValidEmail(member.email) ? 'Email address format looks invalid.' : null,
    !isValidPhone(member.phone) ? 'Phone number format looks invalid.' : null,
    !isValidPhone(member.mobile) ? 'Mobile number format looks invalid.' : null,
    !isLikelyDate(member.date_of_birth) ? 'Date of birth should use YYYY-MM-DD or DD/MM/YYYY.' : null,
    !isLikelyDate(member.date_joined) ? 'Date joined should use YYYY-MM-DD or DD/MM/YYYY.' : null,
  ]);

  if (isBlank(member.phone) && isBlank(member.mobile) && isBlank(member.email)) {
    errors.push('Add at least one contact method: phone, mobile, or email.');
  }

  return errors;
}
