import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  db,
  defaultSettings,
  checkAnswer,
  exportProgress,
  importProgress,
} from "./storage";
import {
  contentDB,
  searchLexemes,
  searchSentences,
  installContent,
  type Catalog,
  type Lexeme,
  type Task,
} from "./library";
import { evaluateTask, generateTasks, mechanics } from "./practice";
import { paradigm, verbParadigms, grammarUnits } from "./curriculum";
import { dialogues } from "./dialogues";
import { railTerms } from "./railway";
import PracticePlayer from "./PracticePlayer";
import { audioKey } from "./speech";
beforeEach(async () => {
  await Promise.all([
    db.settings.clear(),
    db.attempts.clear(),
    db.memory.clear(),
    db.practice.clear(),
    contentDB.lexemes.clear(),
    contentDB.sentences.clear(),
    contentDB.packages.clear(),
    contentDB.meta.clear(),
  ]);
  await db.settings.put(defaultSettings);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const task: Task = {
  id: "test-active",
  type: "spelling",
  prompt: "Напишите «вода» по-болгарски",
  answers: ["вода"],
  explanation: "Вода — женский род.",
  wordId: "wiki-test-water",
  skill: "Активный словарь",
  level: "A1",
};
it("Не смешивает болгарские й и и, игнорируя только учебное ударение", () => {
  expect(checkAnswer("кой", ["кои"])).toBe(false);
  expect(checkAnswer("вода̀", ["вода"])).toBe(true);
  expect(checkAnswer("Български език!", ["български език"])).toBe(true);
});
it("Проверяет ударение без удаления акцента", () => {
  const t = {
    ...task,
    type: "stress" as const,
    stressSensitive: true,
    answers: ["вода́"],
  };
  expect(evaluateTask(t, "во́да")).toBe(false);
  expect(evaluateTask(t, "вода́")).toBe(true);
});
it("Проверяет все элементы множественного ответа и отвергает дубликаты", () => {
  const t = { ...task, type: "multi" as const, answers: ["влак", "гара"] };
  expect(evaluateTask(t, '["гара","влак"]')).toBe(true);
  expect(evaluateTask(t, '["влак","влак"]')).toBe(false);
  expect(evaluateTask(t, '["влак"]')).toBe(false);
  expect(evaluateTask(t, '["гара","влак","не"]')).toBe(false);
});
it("Формирует девять времён, отрицание, вопросы и согласование по роду", () => {
  const v = verbParadigms[2];
  expect(paradigm(v, 5, 0, "m", "negative")).toBe("няма да работя");
  expect(paradigm(v, 3, 0, "f")).toBe("работила съм");
  expect(paradigm(v, 7, 3, "f")).toBe("ще сме работили");
  expect(paradigm(v, 8, 2, "f", "question")).toBe("щеше ли да е работила?");
  for (const verb of verbParadigms)
    for (let t = 0; t < 9; t++)
      for (let p = 0; p < 6; p++)
        expect(paradigm(verb, t, p)).not.toContain("undefined");
});
it("Каждая грамматическая тема имеет содержательные примеры и задания", () => {
  expect(grammarUnits.length).toBeGreaterThan(30);
  expect(mechanics).toHaveLength(25);
  expect(new Set(mechanics.map((m) => m.id)).size).toBe(25);
  for (const u of grammarUnits) {
    expect(u.rule.length).toBeGreaterThan(40);
    expect(u.examples.length).toBeGreaterThanOrEqual(2);
    expect(u.tasks.length).toBeGreaterThanOrEqual(2);
    u.tasks.forEach((t) => expect(t.answers[0]).toBeTruthy());
  }
  for (const d of dialogues) {
    expect(d.lines.length).toBeGreaterThanOrEqual(4);
    expect(d.lines.every((l) => l.bg && l.ru)).toBe(true);
  }
  expect(railTerms.length).toBeGreaterThan(180);
});
it("Записывает ответ и FSRS ровно один раз и восстанавливает проверенный ответ", async () => {
  const user = userEvent.setup();
  const initial = {
    id: "current" as const,
    items: [task, { ...task, id: "test-next", prompt: "Следующее задание" }],
    index: 0,
    correct: 0,
    startedAt: Date.now(),
  };
  await db.practice.put(initial);
  const close = vi.fn();
  const first = render(
    <PracticePlayer
      initial={initial}
      onClose={close}
      notify={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
  await user.type(
    screen.getByRole("textbox", { name: "Ответ на задание" }),
    "вода",
  );
  await user.click(screen.getByRole("button", { name: "Проверить" }));
  await screen.findByText("Верно!");
  expect(await db.attempts.count()).toBe(1);
  expect((await db.memory.get("wiki-test-water:production"))?.card.reps).toBe(
    1,
  );
  const saved = (await db.practice.get("current"))!;
  expect(saved.checked).toBe(true);
  first.unmount();
  render(
    <PracticePlayer
      initial={saved}
      onClose={close}
      notify={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Дальше" }));
  await screen.findByText("Следующее задание");
  expect(await db.attempts.count()).toBe(1);
  expect((await db.practice.get("current"))?.index).toBe(1);
});
it("Экспортирует и восстанавливает расширенную сессию вместе с прежним прогрессом", async () => {
  await db.practice.put({
    id: "current",
    items: [task],
    index: 0,
    correct: 0,
    startedAt: Date.now(),
  });
  const backup = JSON.parse(JSON.stringify(await exportProgress()));
  await db.practice.clear();
  await importProgress(backup);
  expect((await db.practice.get("current"))?.items[0].id).toBe(task.id);
});
it("Фоновая установка проверяет размер пакета и не меняет прогресс пользователя", async () => {
  const item = {
    id: "word-test",
    bg: "вода",
    ru: "вода",
    grammar: "существительное",
    pos: "noun",
    senses: [{ gloss: "вода", tags: [] }],
    forms: [],
    synonyms: [],
    antonyms: [],
    related: [],
    ipa: [],
    categories: [],
    examples: [],
    source: "https://ru.wiktionary.org/wiki/вода",
    license: "CC BY-SA 4.0",
    review: "community",
    stress: null,
  };
  const payload = { schema: 1, kind: "dictionary", items: [item] };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))),
  );
  const catalog: Catalog = {
    schema: 1,
    version: "test",
    builtAt: "2026-10-16",
    counts: { words: 1, sentences: 0, licensedAudio: 0, stress: 0 },
    packages: [
      {
        id: "test-pack",
        kind: "dictionary",
        title: "Вода",
        count: 1,
        bytes: 1,
        sha256: "",
        url: "/test.json",
      },
    ],
    sources: [],
  };
  const cryptoBefore = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {},
  });
  try {
    await installContent(catalog, vi.fn());
    expect((await searchLexemes("вод"))[0].bg).toBe("вода");
    expect(await db.settings.get("profile")).toEqual(defaultSettings);
    expect((await contentDB.packages.get("test-pack"))?.count).toBe(1);
  } finally {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: cryptoBefore,
    });
    vi.unstubAllGlobals();
  }
});
it("Ключ локального аудио стабилен и различает фразы", () => {
  expect(audioKey("вода")).toMatch(/^[a-f0-9]{8}$/);
  expect(audioKey("вода")).not.toBe(audioKey("водата"));
});
it("Обновление схемы v1→v2 сохраняет прежние настройки, память и незавершённый урок", async () => {
  const { default: Dexie } = await import("dexie");
  const { createEmptyCard } = await import("ts-fsrs");
  await db.delete();
  const legacy = new Dexie("chameleon-bg");
  legacy
    .version(1)
    .stores({
      settings: "id",
      memory: "id,wordId,skill",
      attempts: "++id,exerciseId,at,skill",
      sessions: "id",
    });
  await legacy
    .table("settings")
    .put({ ...defaultSettings, name: "Сохранённый профиль", level: "B2" });
  await legacy
    .table("memory")
    .put({
      id: "water:recognition",
      wordId: "water",
      skill: "recognition",
      card: createEmptyCard(),
      history: [],
    });
  await legacy
    .table("sessions")
    .put({
      id: "active",
      exerciseIds: ["b1-1"],
      index: 0,
      correct: 0,
      mode: "lesson",
    });
  legacy.close();
  await db.open();
  expect((await db.settings.get("profile"))?.name).toBe("Сохранённый профиль");
  expect(await db.memory.get("water:recognition")).toBeTruthy();
  expect((await db.sessions.get("active"))?.exerciseIds).toEqual(["b1-1"]);
  expect(await db.practice.count()).toBe(0);
});
it('Возвратные формы сохраняют положение се во всех конструкциях',()=>{
 const v=verbParadigms.find(v=>v.bg==='усмихвам се')!;
 expect(v).toBeTruthy();
 expect(paradigm(v,0,0)).toBe('усмихвам се');
 expect(paradigm(v,0,0,'m','negative')).toBe('не се усмихвам');
 expect(paradigm(v,0,0,'m','question')).toBe('усмихвам ли се?');
 expect(paradigm(v,3,0,'f')).toBe('усмихвала съм се');
 expect(paradigm(v,5,0)).toBe('ще се усмихвам');
 expect(paradigm(v,6,0,'f','negative')).toBe('нямаше да се усмихвам');
 expect(paradigm(v,7,3)).toBe('ще сме се усмихвали');
});
it('Список сложных слов и конкретные ошибки проходят резервное копирование',async()=>{
 await db.settings.update('profile',{difficultWords:['wiki-test-water'],mistakes:[task]});
 const backup=JSON.parse(JSON.stringify(await exportProgress()));
 await db.settings.update('profile',{difficultWords:[],mistakes:[]});
 await importProgress(backup);
 expect((await db.settings.get('profile'))?.difficultWords).toEqual(['wiki-test-water']);
 expect((await db.settings.get('profile'))?.mistakes?.[0].id).toBe(task.id);
});
it('Активный словарь фильтруется до пагинации',async()=>{
 await contentDB.lexemes.bulkPut(Array.from({length:40},(_,i)=>({id:'active-'+i,bg:'слово'+String(i).padStart(2,'0'),ru:'значение',pos:'noun',search:['слово'],active:i>=36}) as Lexeme));
 const rows=await searchLexemes('',0,'all',true);
 expect(rows).toHaveLength(4);expect(rows.every(w=>w.active)).toBe(true);
});
it('воспроизведение устного задания освобождает микрофон и отключает его старые результаты',async()=>{
 const speech=await import('./speech');vi.spyOn(speech,'speak').mockResolvedValue(false);let recorder:any;
 class Recognition{onstart:any;onend:any;onerror:any;onresult:any;abort=vi.fn();stop=vi.fn();constructor(){recorder=this;}start(){this.onstart();}}
 vi.stubGlobal('SpeechRecognition',Recognition);
 try{
  const user=userEvent.setup();render(<PracticePlayer initial={{id:'current',items:[{...task,type:'speaking',bg:'вода'}],index:0,correct:0,startedAt:Date.now()}} onClose={vi.fn()} notify={vi.fn()} onSaved={vi.fn()}/>);
  await user.click(screen.getByRole('button',{name:'Ответить голосом'}));await user.click(screen.getByRole('button',{name:'Прослушать фразу'}));
  expect(recorder.abort).toHaveBeenCalled();expect(recorder.onresult).toBeNull();expect(screen.getByRole('button',{name:'Ответить голосом'})).toBeTruthy();
  expect(await db.attempts.count()).toBe(0);
 }finally{vi.unstubAllGlobals();}
});
