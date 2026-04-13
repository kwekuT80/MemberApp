export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

export function cleanText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function isValidEmail(value: string | null | undefined): boolean {
  if (isBlank(value)) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value));
}

export function isValidPhone(value: string | null | undefined): boolean {
  if (isBlank(value)) return true;
  return /^[0-9+()\-\s]{7,20}$/.test(cleanText(value));
}

export function isLikelyDate(value: string | null | undefined): boolean {
  if (isBlank(value)) return true;
  const cleaned = cleanText(value);
  return /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})$/.test(cleaned);
}

export function compactErrors(errors: Array<string | null | undefined>): string[] {
  return errors.filter((item): item is string => Boolean(item && item.trim()));
}
