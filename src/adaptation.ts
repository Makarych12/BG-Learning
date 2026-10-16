import type { Level } from './content';
import type { Attempt } from './storage';
const levels: Level[] = ['A1','A2','B1','B2','C1','C2'];
/** Practice load adjustment, never a CEFR certificate or profile-level overwrite. */
export function practiceLevel(level: Level, recent: Pick<Attempt,'correct'>[]) {
  const sample=recent.slice(0,40);
  if(sample.length<20)return level;
  const accuracy=sample.filter(a=>a.correct).length/sample.length,index=levels.indexOf(level);
  return levels[Math.max(0,Math.min(5,index+(accuracy>=.88?1:accuracy<.55?-1:0)))];
}
