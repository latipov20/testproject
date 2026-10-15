// Accept-Language sarlavhasidan tilni aniqlaydi (standart: uz).
export type Lang = 'uz' | 'ru';

export function langFrom(header?: string): Lang {
  return header?.toLowerCase().startsWith('ru') ? 'ru' : 'uz';
}

export function pick<T extends Record<string, unknown>>(obj: T, field: string, lang: Lang): string {
  const key = field + (lang === 'ru' ? 'Ru' : 'Uz');
  return (obj[key] as string) || (obj[field + (lang === 'ru' ? 'Uz' : 'Ru')] as string) || '';
}
