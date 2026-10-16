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
