import photos from './photos.json';
import type { Lexeme } from './library';
const norm = (s:string)=>s.normalize('NFC').replace(/\u0301/g,'').toLocaleLowerCase('bg').trim();
// Explicit lexical equivalents only; never match images by substring or a Russian cognate.
const equivalents:Record<string,string> = {'електрически двигател':'електродвигател','мотор':'електродвигател','самолет':'самолет','мултицет':'мултиметър','гаечен ключ':'гаечен ключ','колело':'велосипед','киселото мляко':'кисело мляко'};
const map = new Map(photos.map(p=>[norm(p.bg),p]));
export function photoForWord(word: Pick<Lexeme,'bg'|'pos'|'ru'>) {
  if (!['noun','unknown','phrase'].includes(word.pos)) return undefined;
  const label=norm(word.bg);
  if(label==='мотор'&&!/электр/i.test(word.ru))return undefined;
  // колело is also a mechanical wheel; the bicycle photograph applies only to that sense.
  if(label==='колело'&&!/велосипед/.test(word.ru))return undefined;
  return map.get(label) ?? map.get(equivalents[label]);
}
