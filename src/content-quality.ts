/** Conservative review gates. Originals stay searchable and are never deleted. */
export function sentenceReviewReason(s:{bg:string;review:string}):string|undefined {
 if(/[a-z]+[а-яѝ]|[а-яѝ]+[a-z]/i.test(s.bg))return 'Требует проверки: смешение латиницы и кириллицы внутри слова.';
 if(s.review==='tatoeba-linked-via-intermediate')return 'Требует проверки: перевод связан через промежуточный язык, а не напрямую.';
 return undefined;
}

// Specific unresolved BG↔RU correspondences; never mass-rewrite technical words.
export const railReviewQueue:Record<string,string> = {
 'бунтуване':'Перевод «подпрыгивание» не соответствует общеязыковому значению; требуется подтверждение технического термина.',
 'челюст на оста':'Не подтверждено соответствие «букса».',
 'подбандажна част':'Не подтверждено соответствие «подступичная часть»: разные элементы колеса.',
 'шенкел':'Нужно подтвердить соответствие «шкворень» именно для железнодорожной тележки.',
 'шенкелен лагер':'Не подтверждено соответствие «подпятник».',
 'стъпка на траверсите':'Нужно различить расстояние между шпалами и эпюру их размещения.',
 'охранителен тупик':'Нужно различить предохранительный и улавливающий тупики.',
};
export const railReviewReason=(t:{bg:string})=>railReviewQueue[t.bg];

/** Filter for standard study flashcards (excluding suffixes, abbreviations, surnames, proper names, geographic names, empty/noisy records) */
export function isStudyCard(w: {
  bg?: string;
  ru?: string;
  pos?: string;
  grammar?: string;
  categories?: string[];
}): boolean {
  if (!w || !w.bg || !w.ru) return false;
  const bg = w.bg.trim();
  const ru = w.ru.trim();
  if (!bg || !ru) return false;

  // Suffixes and prefixes
  if (bg.startsWith('-') || bg.endsWith('-') || ru.startsWith('-') || ru.endsWith('-')) return false;

  // Abbreviations
  if (w.pos === 'abbrev') return false;
  if (bg === bg.toUpperCase() && /[А-ЯA-Z]/.test(bg) && bg.length > 1) return false;
  if (/сокращение|аббревиатура/i.test(w.grammar || '') || /сокращение|аббревиатура/i.test(ru)) return false;

  // Capitalized: proper names, surnames, toponyms, geographical names
  if (/^[А-ЯA-Z]/.test(bg)) return false;

  // Categories
  const cats = (w.categories || []).join(' ');
  if (/Имена собственные|Фамилии|Мужские имена|Женские имена|Города|Государства|Реки|Озера|Страны|География|Топонимы|Столицы|Регионы|Библейские/i.test(cats)) {
    return false;
  }

  // Russian translation indicators of names / geography / noise
  if (/болгарская фамилия|\bфамилия\b|личное имя|имя собственное|перевод имени/i.test(ru)) return false;
  if (/^(?:геогр\.|истор\.\s+)?(?:город|столица|государство|страна|река|озеро|деревня|село|провинция|область|остров|полуостров|море|залив|гора|хребет|пустыня)\b/i.test(ru)) {
    return false;
  }

  // Meaningless / empty / missing translations
  if (ru === '-' || ru === '?' || /значение не указано|нужен перевод|отсутствует пример|нет перевода/i.test(ru)) {
    return false;
  }

  // Clean translation must be valid
  const cleanedRu = cleanTranslation(ru);
  if (!cleanedRu || cleanedRu === '-' || cleanedRu === '?') return false;

  // Must contain letters
  if (!/[а-яА-ЯѝЍ]/.test(bg)) return false;
  if (!/[а-яА-Я]/.test(cleanedRu)) return false;

  return true;
}

/** Remove noisy metadata strings such as direct link and analogue tags from study UI */
export function cleanTranslation(ru: string): string {
  if (!ru) return '';
  return ru
    .replace(/\s*—\s*иноязычные аналоги/gi, '')
    .replace(/\s*\(иноязычные аналоги\)/gi, '')
    .replace(/\bиноязычные аналоги\b/gi, '')
    .replace(/\s*·\s*прямая переводная связь/gi, '')
    .replace(/прямая переводная связь/gi, '')
    .trim();
}

/** Clean up grammar tags removing technical/raw dictionary labels from study UI */
export function cleanGrammar(grammar: string): string {
  if (!grammar) return '';
  const parts = grammar
    .split(' · ')
    .map(s => s.trim())
    .filter(s => s && !/прямая переводная связь/i.test(s) && !/иноязычные аналоги/i.test(s) && s !== 'морфология не указана');
  return parts.join(' · ');
}

