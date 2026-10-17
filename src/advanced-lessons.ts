import type {LessonUnit} from './grammar-units';
const modules=import.meta.glob<{default:LessonUnit}>(['./academy/C1/*.ts','./academy/C2/*.ts']);
const pending=new Map<string,Promise<LessonUnit>>();
/** A failed chunk may be retried; concurrent requests share one download. */
export function loadAdvancedLesson(id:string):Promise<LessonUnit>{
 const cached=pending.get(id);if(cached)return cached;
 const slug=id.replace(/^advanced-/,'');
 const loader=modules[`./academy/C1/${slug}.ts`]??modules[`./academy/C2/${slug}.ts`];
 if(!loader)return Promise.reject(new Error('Урок не найден'));
 const request=loader().then(m=>m.default).catch(error=>{pending.delete(id);throw error;});
 pending.set(id,request);return request;
}
