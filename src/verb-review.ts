/** Paradigms excluded from graded practice until confirmed. They stay visible in the reference with a note. */
const restemmed=['гъделичкам','мацам','мичам','мотолевя','нагарчам','пожелая','хукам','цопам'];
export function verbReviewReason(v:{bg:string;present?:string[];aorist?:string[];aspect?:string}):string|undefined{
 if(v.bg.startsWith('-'))return 'Это суффикс, а не глагол.';
 if(restemmed.includes(v.bg))return 'Таблица в источнике относилась к другому слову; формы пересобраны от начальной формы автоматически и не подтверждены.';
 if([...(v.present??[]),...(v.aorist??[])].includes('-'))return 'В источнике нет полных личных форм (безличный или дефектный глагол).';
 if(v.aspect==='source-unspecified')return 'Вид не указан в источнике.';
 return undefined;
}
