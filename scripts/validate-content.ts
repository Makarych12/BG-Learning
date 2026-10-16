import { sentenceReviewReason } from "../src/content-quality";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { grammarUnits, verbParadigms, paradigm } from "../src/curriculum";
import { dialogues } from "../src/dialogues";
import { railTerms, railExamples } from "../src/railway";
import { listeningTasks } from "../src/listening-tasks";
import { voiceScenarios } from "../src/voice-scenarios";
import { audioKey } from "../src/speech";
const manifest = JSON.parse(
  readFileSync("public/content/manifest.json", "utf8"),
);
const ids = new Set<string>();
const sentenceIds = new Set<string>();
let words = 0,
  sentences = 0,
  eligibleSentences = 0,
  forms = 0,
  stress = 0;
const exampleRefs: string[] = [];
for (const p of manifest.packages) {
  const raw = readFileSync("public" + p.url);
  if (createHash("sha256").update(raw).digest("hex") !== p.sha256)
    throw Error("Checksum " + p.id);
  const data = JSON.parse(raw.toString());
  if (data.items.length !== p.count) throw Error("Package count " + p.id);
  for (const row of data.items) {
    if (ids.has(row.id)) throw Error("Duplicate ID " + row.id);
    ids.add(row.id);
    if (!row.bg || !row.ru || !row.source || !row.license)
      throw Error("Missing provenance " + row.id);
    if (p.kind === "dictionary") {
      words++;
      forms += row.forms.length;
      if (row.stress) stress++;
      exampleRefs.push(...row.examples);
    } else {
      sentences++;
      if(!sentenceReviewReason(row))eligibleSentences++;
      sentenceIds.add(row.id);
      if (
        !row.author ||
        (!row.translations.length && !row.id.startsWith("wikiex-") && !row.id.startsWith("academy-") && !row.id.startsWith("editorial-ex-")) ||
        row.translations.some((t: any) => !t.author || !t.id)
      )
        throw Error("Missing sentence attribution " + row.id);
    }
  }
}
if (words !== manifest.counts.words || sentences !== manifest.counts.sentences)
  throw Error("Manifest totals");
if (exampleRefs.some((id) => !sentenceIds.has(id)))
  throw Error("Dangling context reference");
const texts: string[] = JSON.parse(
  readFileSync("data/audio-texts.json", "utf8"),
);
const hashes = new Map<string, string>();
let ready = 0;
for (const text of texts) {
  const k = audioKey(text);
  if (hashes.has(k) && hashes.get(k) !== text)
    throw Error("Audio key collision");
  hashes.set(k, text);
  if (
    existsSync("public/audio/" + k + ".mp3") &&
    statSync("public/audio/" + k + ".mp3").size > 200
  )
    ready++;
}
for (const u of grammarUnits) {
  if (
    u.examples.some((e) => !e.bg || !e.ru) ||
    u.tasks.some((t) => !t.answers[0])
  )
    throw Error("Incomplete grammar " + u.id);
}
for (const d of dialogues) {
  if (!d.lines.some((l) => l.bg.includes(d.answer)))
    throw Error("Dialogue answer not in lines " + d.id);
}
for (const lt of listeningTasks) {
  if (!lt.prompt || !lt.audioText || !lt.answer || !lt.translation)
    throw Error("Incomplete listening task " + lt.id);
}
for (const vs of voiceScenarios) {
  if (!vs.situation || !vs.partnerPromptBg || !vs.targetResponseBg)
    throw Error("Incomplete voice scenario " + vs.id);
}
const report = {
  version: "0.3.0",
  dictionaryEntries: words,
  activeDictionaryEntries: manifest.counts.activeWords,
  contextLinks: manifest.counts.contextLinks,
  verbParadigms: verbParadigms.length,
  dictionaryForms: forms,
  sourceStressMarks: stress,
  parallelSentences: sentences,
  corpusDictationTasks: eligibleSentences,
  corpusSentencesPendingReview: sentences-eligibleSentences,
  grammarLessons: grammarUnits.length,
  grammarTasks: grammarUnits.reduce((n, u) => n + u.tasks.length, 0),
  dialogues: dialogues.length,
  dialogueTurns: dialogues.reduce((n, d) => n + d.lines.length, 0),
  listeningTasks: listeningTasks.length,
  voiceScenarios: voiceScenarios.length,
  railTerms: railTerms.length,
  railExamples: railExamples.length,
  conjugationForms: new Set(
    verbParadigms.flatMap((v) =>
      Array.from({ length: 9 }, (_, t) =>
        Array.from({ length: 6 }, (_, p) =>
          ["m", "f", "n"].flatMap((g) =>
            ["positive", "negative", "question"].map((f) =>
              paradigm(v, t, p, g, f),
            ),
          ),
        ),
      ).flat(3),
    ),
  ).size,
  photos: JSON.parse(readFileSync("src/photos.json", "utf8")).length + 2,
  audioReady: ready,
  audioTexts: texts.length,
};
writeFileSync("data/validation-report.json", JSON.stringify(report, null, 2));
console.log(report);
if (process.argv.includes("--require-audio") && ready !== texts.length)
  throw Error("Audio generation incomplete");
