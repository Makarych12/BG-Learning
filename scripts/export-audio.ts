import { writeFileSync, readFileSync } from "node:fs";
import { words, exercises, tenses } from "../src/content";
import { grammarUnits, verbParadigms, paradigm } from "../src/curriculum";
import { dialogues } from "../src/dialogues";
import { railTerms, railExamples } from "../src/railway";
import { listeningTasks } from "../src/listening-tasks";
import { voiceScenarios } from "../src/voice-scenarios";
const contentFiles: string[] = JSON.parse(readFileSync("public/content/manifest.json", "utf8")).packages.map((p: {url:string})=>p.url.split("/").at(-1));
const text = new Set<string>(["Здравейте! Казвам се Иван."]);
for (const file of contentFiles) {
  for (const item of JSON.parse(readFileSync("public/content/" + file, "utf8"))
    .items)
    { text.add(item.bg); if(item.stress) text.add(item.stress); }
}
for (const w of words) {
  text.add(w.bg);
  text.add(w.example);
}
for (const e of exercises) if (e.text) text.add(e.text);
for (const t of tenses) {
  text.add(t.example);
  t.forms.forEach((f) => text.add(f));
}
for (const u of grammarUnits) {
  u.examples.forEach((e) => text.add(e.bg));
  u.tasks.forEach((t) => { if (t.bg) text.add(t.bg); });
}
for (const d of dialogues) d.lines.forEach((l) => text.add(l.bg));
railTerms.forEach((t) => text.add(t.bg));
railExamples.forEach((e) => text.add(e[0]));
for (const lt of listeningTasks) text.add(lt.audioText);
for (const vs of voiceScenarios) {
  text.add(vs.partnerPromptBg);
  text.add(vs.targetResponseBg);
  if (vs.followUp) {
    text.add(vs.followUp.partner);
    text.add(vs.followUp.target);
  }
}
const newParadigms = new Set<string>();
for (const v of verbParadigms) { [...v.present, ...v.aorist, ...v.imperfect, ...Object.values(v.participles)].forEach(f => text.add(f)); }
for (const v of verbParadigms.filter(v => ["чета", "пиша", "работя", "говоря", "проверявам"].includes(v.bg)))
  for (let t = 0; t < 9; t++)
    for (let p = 0; p < 6; p++)
      for (const gender of ["m", "f", "n"])
        for (const form of ["positive", "negative", "question"]) {
          const phrase = paradigm(v, t, p, gender, form);
          if (!text.has(phrase)) newParadigms.add(phrase);
          text.add(phrase);
        }
writeFileSync(
  "data/paradigm-audio-texts.json",
  JSON.stringify([...newParadigms]),
);
writeFileSync("data/audio-texts.json", JSON.stringify([...text]));
console.log("Audio texts:", text.size);

const key = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, "0");
};
const attribution: Record<string, unknown> = {};
for (const file of contentFiles) {
  for (const item of JSON.parse(readFileSync("public/content/" + file, "utf8"))
    .items) {
    attribution[key(item.bg)] = {
      text: item.bg,
      source: item.source,
      license: item.license,
      author: item.author ?? "Авторы русского Викисловаря; см. историю статьи",
      voice:
        "Piper bg_BG-dimitar-medium; synthetic speech; source voice dataset CC0",
    };
  }
}
for(const file of contentFiles) for(const item of JSON.parse(readFileSync("public/content/"+file,"utf8")).items) {
  if(item.stress) attribution[key(item.stress)]={text:item.stress,source:item.morphologySource ?? item.source,translationSource:item.source,license:item.license,author:"Авторы Викисловаря; исходные ударения и IPA при наличии",voice:"Piper bg_BG-dimitar-medium; synthetic speech; source IPA when supported"};
}
for (const v of verbParadigms) {
  const forms = [...v.present, ...v.aorist, ...v.imperfect, ...Object.values(v.participles)];
  if (["чета", "пиша", "говоря", "работя", "проверявам"].includes(v.bg)) {
    for (let t=0;t<9;t++) for(let p=0;p<6;p++) for(const g of ["m","f","n"]) for(const f of ["positive","negative","question"]) forms.push(paradigm(v,t,p,g,f));
  }
  for(const form of forms) attribution[key(form)] ??= {text:form,source:v.source,license:v.license,author:"Авторы английского Викисловаря; составные формы образованы по правилам грамматики",voice:"Piper bg_BG-dimitar-medium; synthetic speech; source voice dataset CC0"};
}
for (const t of text)
  if (!attribution[key(t)])
    attribution[key(t)] = {
      text: t,
      author: "Учебные материалы CHAMELEON BG",
      voice:
        "Piper bg_BG-dimitar-medium; synthetic speech; source voice dataset CC0",
    };
writeFileSync("public/audio/ATTRIBUTION.json", JSON.stringify(attribution));
