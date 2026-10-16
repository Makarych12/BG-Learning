import type { Task } from "./library";
import { checkAnswer } from "./storage";
export function evaluateTask(task: Task, answer: string) {
  if (task.type === "matching" || task.type === "multi") {
    try {
      const a = JSON.parse(answer) as string[];
      const expected = task.answers;
      return (
        Array.isArray(a) &&
        a.length === expected.length &&
        [...new Set(a)].length === expected.length &&
        a.every((x) => expected.includes(x))
      );
    } catch {
      return false;
    }
  }
  if (task.stressSensitive)
    return task.answers.some(
      (a) =>
        a.normalize("NFC").toLowerCase().trim() ===
        answer.normalize("NFC").toLowerCase().trim(),
    );
  return checkAnswer(answer, task.answers);
}
