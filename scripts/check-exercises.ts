import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { contentDB, type Lexeme, type Sentence } from "../src/library";
import { mechanics, generateTasks, evaluateTask } from "../src/practice";
import { db } from "../src/storage";
const manifest = JSON.parse(
  readFileSync("public/content/manifest.json", "utf8"),
);
for (const pack of manifest.packages) {
  const p = JSON.parse(readFileSync("public" + pack.url, "utf8"));
  if (p.kind === "dictionary") await contentDB.lexemes.bulkPut(p.items);
  else await contentDB.sentences.bulkPut(p.items);
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
 const url=String(input);
 if(url.startsWith("/grammar/")){try{return new Response(readFileSync("public"+url),{headers:{"Content-Type":"application/json"}});}catch{return new Response(null,{status:404});}}
 return originalFetch(input,init);
};
let checked = 0;
for (const m of mechanics) {
  const tasks = await generateTasks(m.id, "B2", 6);
  if (!tasks.length) throw Error("Empty mechanic: " + m.id);
  for (const t of tasks) {
    if (!t.answers.length || !t.prompt || !t.skill)
      throw Error("Incomplete " + t.id);
    if (
      t.options &&
      t.type !== "order" &&
      t.type !== "multi" &&
      !t.answers.some((a) => t.options!.includes(a))
    )
      throw Error("Answer absent from options " + t.id);
    const answer = ["multi", "matching"].includes(t.type)
      ? JSON.stringify(t.answers)
      : t.answers[0];
    if (!evaluateTask(t, answer))
      throw Error("Correct answer rejected " + t.id);
    if (evaluateTask(t, "безусловно неверный ответ 999"))
      throw Error("Wrong answer accepted " + t.id);
    checked++;
  }
  console.log(m.id, tasks.length);
}
for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"] as const) {
  for (const type of [
    "article",
    "correction",
    "conjugation",
    "dialogue",
    "dictation",
  ] as const) {
    if (!(await generateTasks(type, level, 3)).length)
      throw Error("Empty " + type + " " + level);
  }
}
console.log(
  "Validated",
  checked,
  "generated tasks across",
  mechanics.length,
  "mechanics and six levels",
);
await contentDB.delete();
await db.delete();
