import type {Level} from './content';
import type {LessonUnit} from './grammar-units';

export function courseCounts(units:LessonUnit[],level:Level){
  const available=units.filter(unit=>unit.level===level);
  return {lessons:available.length,tasks:available.reduce((total,unit)=>total+(unit.taskCount??unit.tasks.length),0)};
}
export type CourseCounts=Record<Level,ReturnType<typeof courseCounts>>;
