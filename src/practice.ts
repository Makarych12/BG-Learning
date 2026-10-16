import { railReviewReason } from "./content-quality";
import { verbTasks, morphologyTasks } from "./grammar-practice";
import {
  contentDB,
  randomLexemes,
  randomSentences,
  type Task,
  type Mechanic,
  type Lexeme,
} from "./library";
import { grammarUnits } from "./curriculum";
import { dialogues } from "./dialogues";
import { railTerms, railExamples } from "./railway";
import { checkAnswer, normalizeAnswer, shuffle, db } from "./storage";
import type { Level } from "./content";
export { photos, type Photo } from "./photo-data";
import { photos } from "./photo-data";
export { mechanics } from "./mechanics";
export { evaluateTask } from "./task-evaluation";
const levelListIndex = (l: Level) =>
  ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(l);
const source = (w: Lexeme) => ({
  source: w.source,
  sourceLabel: "Викисловарь · CC BY-SA 4.0",
  wordId: w.id,
});
export async function generateTasks(
  type: Mechanic,
  level: Level,
  count = 10,
): Promise<Task[]> {
  if(type === "article") { const sourceTasks = await morphologyTasks("article",level,count); if(sourceTasks.length)return sourceTasks; }
  if(type === "conjugation" || type === "tense") return verbTasks(level,count,undefined,type);
  if (["article", "correction"].includes(type)) {
    const found = grammarUnits
      .filter((u) => levelListIndex(u.level) <= levelListIndex(level))
      .flatMap((u) => u.tasks)
      .filter((t) => t.type === type);
    if (found.length) return shuffle(found).slice(0, count);
    if (type === "correction")
      return [
        {
          id: "correction-a1-copula",
          type,
          prompt: "Исправьте фразу: Аз е инженер.",
          answers: ["Аз съм инженер"],
          explanation: "Аз съм, ти си, той е. Связка согласуется с лицом.",
          skill: "Связка съм",
          level: "A1",
        },
        {
          id: "correction-a1-number",
          type,
          prompt: "Исправьте фразу: Ние е готови.",
          answers: ["Ние сме готови"],
          explanation: "Ние сме — первое лицо множественного числа.",
          skill: "Связка съм",
          level: "A1",
        },
      ];
    return [];
  }
  if (type === "dialogue")
    return shuffle(dialogues.filter((d) => d.level === level))
      .slice(0, count)
      .map((d) => ({
        id: "dialogue-" + d.id,
        type,
        prompt: d.question,
        bg: d.lines.map((l) => `${l.speaker}: ${l.bg}`).join("\n"),
        answers: [d.answer],
        options: shuffle([
          d.answer,
          ...shuffle(dialogues.filter((x) => x.id !== d.id))
            .slice(0, 3)
            .map((x) => x.answer),
        ]),
        explanation:
          d.lines.find((l) => l.bg === d.answer)?.ru ??
          "Реплика из этого учебного диалога.",
        skill: "Диалоги",
        level: d.level,
      }));
  if (type === "technical")
    return shuffle(railTerms.filter(t=>!railReviewReason(t)))
      .slice(0, count)
      .map((t) => ({
        id: "term-" + t.id,
        type,
        prompt: `Как по-болгарски: ${t.ru}?`,
        answers: [t.bg],
        explanation: `${t.bg} — ${t.ru}. Тема: ${t.topic}.`,
        source: t.source,
        skill: "Железнодорожная лексика",
        level: "B2",
        wordId: t.id,
      }));
  if (type === "photo-choice" || type === "photo-name")
    return shuffle(photos)
      .slice(0, count)
      .map((p) => ({
        id: type + "-" + p.id,
        type,
        prompt:
          type === "photo-choice"
            ? "Выберите болгарское название предмета"
            : "Назовите предмет по-болгарски",
        image: p.path,
        answers: [p.bg],
        options:
          type === "photo-choice"
            ? shuffle([
                p.bg,
                ...shuffle(photos.filter((x) => x.id !== p.id && x.bg !== p.bg))
                  .slice(0, 3)
                  .map((x) => x.bg),
              ])
            : undefined,
        explanation: `${p.bg}. Фото: ${p.author}, ${p.license}. ${p.subject}.`,
        source: p.source,
        skill: "Фото и лексика",
        level,
      }));
  const maxWords = { A1: 7, A2: 11, B1: 17, B2: 24, C1: 35, C2: 60 }[level];
  if (
    [
      "translate-bg",
      "translate-ru",
      "dictation",
      "listen-choice",
      "order",
      "gap",
      "reading",
      "multi",
      "speaking",
    ].includes(type)
  ) {
    const sentences = await randomSentences(Math.max(count, 8), maxWords,type==="multi"?s=>/[а-яА-Яѝ]{3}/.test(s.bg):type==="gap"?s=>/[а-яА-Яѝ]/.test(s.bg):undefined);
    return sentences.slice(0, count).map((s, i) => {
      const t: Task = {
        id: `${type}-${s.id}`,
        type,
        prompt: "",
        bg: s.bg,
        ru: s.ru,
        answers: [s.bg],
        explanation: `Исходный текст: ${s.bg}\n${s.ru}. Свободный перевод может иметь другие корректные варианты; здесь проверяется восстановление указанного исходника.`,
        source: s.source,
        sourceLabel: s.id.startsWith("tatoeba-") ? `Tatoeba: ${s.author}; перевод: ${s.translations.map((x) => x.author).join(", ")} · CC BY 2.0 FR` : `${s.author} · ${s.license}`,
        skill: "Контекст",
        level,
        audio: s.audio,
      };
      if (type === "translate-bg") {
        t.prompt = "Переведите фразу на русский, сверяясь с переводом корпуса.";
        t.answers = s.translations.length?s.translations.map((x) => x.text):[s.ru];
        t.skill = "Перевод BG → RU";
      }
      if (type === "translate-ru") {
        t.prompt =
          "Восстановите болгарскую фразу по переводу. Это практика исходного текста, не оценка всех возможных переводов.";
        t.skill = "Перевод RU → BG";
      }
      if (type === "dictation") {
        t.prompt = "Прослушайте и запишите болгарскую фразу.";
        t.skill = "Аудирование";
      }
      if (type === "speaking") {
        t.prompt =
          "Прочитайте фразу в микрофон. Сравнивается распознанный текст.";
        t.skill = "Голосовое воспроизведение";
      }
      if (type === "reading" || type === "listen-choice") {
        t.prompt =
          type === "reading"
            ? "Выберите перевод прочитанной фразы."
            : "Прослушайте и выберите перевод.";
        t.answers = [s.ru];
        t.options = shuffle([
          s.ru,
          ...shuffle(sentences.filter((x) => x.id !== s.id))
            .slice(0, 3)
            .map((x) => x.ru),
        ]);
        t.skill = type === "reading" ? "Чтение" : "Аудирование";
      }
      if (type === "order") {
        t.prompt = "Соберите исходное болгарское предложение.";
        t.options = shuffle(s.bg.replace(/[.,!?;:„“"—]/g, "").split(/\s+/));
        t.skill = "Порядок слов";
      }
      if (type === "gap") {
        const tokens = s.bg.split(/\s+/);
        const indexes = tokens
          .map((x, i) => (x.replace(/[^а-яА-Яѝ]/g, "").length > 3 ? i : -1))
          .filter((x) => x >= 0);
        const idx = indexes[i % indexes.length] ?? Math.max(0,tokens.findIndex(token=>/[а-яА-Яѝ]/.test(token)));
        const answer = tokens[idx].replace(/[^а-яА-Яѝ-]/g, "");
        tokens[idx] = "_____";
        t.bg = tokens.join(" ");
        t.prompt =
          "Восстановите пропущенное слово исходного предложения. Перевод — подсказка.";
        t.answers = [answer];
        t.skill = "Контекстная лексика";
      }
      if (type === "multi") {
        const tokens = Array.from(
          new Set(
            s.bg
              .replace(/[^а-яА-Яѝ\s]/g, "")
              .split(/\s+/)
              .filter((x) => x.length > 2),
          ),
        );
        const yes = shuffle(tokens).slice(0, 2);
        const no = shuffle(
          sentences
            .filter((x) => x.id !== s.id)
            .flatMap((x) => x.bg.replace(/[^а-яА-Яѝ\s]/g, "").split(/\s+/)),
        )
          .filter(
            (x) =>
              x.length > 2 &&
              !tokens.map((t) => t.toLowerCase()).includes(x.toLowerCase()),
          )
          .slice(0, 2);
        t.prompt = "Прослушайте фразу и отметьте все услышанные слова.";
        t.answers = yes;
        t.options = shuffle(Array.from(new Set([...yes, ...no])));
        t.skill = "Внимательное слушание";
      }
      return t;
    });
  }
  const candidates = await randomLexemes(
    Math.max(count * 4, 60),
    (w) =>
      !/(?:хуй|бляд|пизд|ебат|вульг|бранн|обсцен)/i.test(w.ru) &&
      (type === "stress"
        ? !!w.stress && (w.bg.match(/[аъоуеиюя]/gi)?.length ?? 0) > 1
        : type === "synonym"
          ? w.synonyms.length > 0
          : type === "antonym"
            ? w.antonyms.length > 0
            : w.ru.length < 180),
  );
  if (type === "matching") {
    const rows = shuffle(candidates).slice(0, 4);
    if (rows.length < 4) return [];
    return [
      {
        id: "matching-" + rows.map((w) => w.id).join("-"),
        type,
        prompt: "Соедините болгарские слова с их словарными значениями.",
        pairs: rows.map((w) => ({ left: w.bg, right: w.ru })),
        answers: rows.map((w) => w.id),
        explanation: rows.map((w) => `${w.bg} — ${w.ru}`).join("\n"),
        skill: "Смысловые связи",
        level,
      },
    ];
  }
  return candidates.slice(0, count).map((w, i) => {
    const t: Task = {
      id: `${type}-${w.id}`,
      type,
      prompt: "",
      bg: w.bg,
      answers: [w.ru],
      explanation: `${w.bg} — ${w.ru}. ${w.grammar}`,
      skill: "Словарный запас",
      level,
      ...source(w),
    };
    const distractors = shuffle(
      candidates.filter((x) => x.id !== w.id && x.ru !== w.ru),
    ).slice(0, 3);
    if (type === "meaning" || type === "speed") {
      t.prompt = `Выберите одно из словарных значений: ${w.bg}`;
      t.options = shuffle([w.ru, ...distractors.map((x) => x.ru)]);
      if (type === "speed") t.timeLimit = 20;
    }
    if (type === "reverse") {
      t.prompt = `Какое слово имеет значение «${w.ru}»?`;
      t.answers = [w.bg];
      t.options = shuffle([w.bg, ...distractors.map((x) => x.bg)]);
    }
    if (type === "spelling") {
      t.prompt = `Восстановите болгарское слово из карточки: ${w.ru}`;
      t.bg = undefined;
      t.answers = [w.bg];
    }
    if (type === "synonym" || type === "antonym") {
      const related = type === "synonym" ? w.synonyms : w.antonyms;
      const answer = related[0];
      t.prompt = `Найдите ${type === "synonym" ? "синоним" : "антоним"} к «${w.bg}» по словарной статье.`;
      t.answers = related;
      t.options = shuffle([
        answer,
        ...distractors.filter((x) => !related.includes(x.bg)).map((x) => x.bg),
      ]);
      t.skill = "Смысловые связи";
    }
    if (type === "stress") {
      const stressed = w.stress!.replace(/\u0300/g, "\u0301");
      const plain = normalizeAnswer(stressed);
      const variations = [...plain].flatMap((ch, j) =>
        /[аъоуеиюя]/.test(ch)
          ? [plain.slice(0, j + 1) + "\u0301" + plain.slice(j + 1)]
          : [],
      );
      t.prompt =
        "Выберите положение ударения, указанное в словарном источнике.";
      t.answers = [stressed];
      t.options = shuffle(
        Array.from(new Set([stressed, ...variations])).slice(0, 8),
      );
      t.stressSensitive = true;
      t.skill = "Ударения";
      t.explanation = `В источнике: ${stressed}. Ударение не оценивается по записи голоса.`;
    }
    return t;
  });
}
export { adaptTasks } from "./task-adaptation";
