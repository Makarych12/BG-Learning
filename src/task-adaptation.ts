import type { Task } from "./library";
import { db } from "./storage";
export async function adaptTasks(tasks: Task[]) {
  const attempts = await db.attempts
    .orderBy("at")
    .reverse()
    .limit(300)
    .toArray();
  const latest = new Map<string, boolean>();
  for (const a of attempts) if (!latest.has(a.exerciseId)) latest.set(a.exerciseId, a.correct);
  return [...tasks].sort((a,b)=>Number(latest.get(b.id) === false)-Number(latest.get(a.id) === false));
}
