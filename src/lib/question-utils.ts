import { isLanguage, Language } from './piston';

export function sanitizeLanguages(input: unknown): Language[] {
  if (!Array.isArray(input)) return ['cpp'];
  const filtered = input.filter(isLanguage);
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ['cpp'];
}
