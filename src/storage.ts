import Dexie, { type Table } from "dexie";
import {
  createEmptyCard,
  fsrs,
  Rating,
  type Card,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";
import type { PracticeRecord, Task } from "./library";
import type { Level } from "./content";
export type Skill = "recognition" | "production";
export type Memory = {
  id: string;
  wordId: string;
  skill: Skill;
  card: Card;
  history: { log: ReviewLog; duration: number }[];
};
export type Attempt = {
  id?: number;
  exerciseId: string;
  correct: boolean;
  skill: string;
  at: number;
  duration: number;
};
export type Settings = {
  id: "profile";
  cardSession?: import("./CorpusCards").CardSession;
  difficultWords?: string[];
  mistakes?: Task[];
  name: string;
  level: Level;
  minutes: number;
  reducedMotion: boolean;
  onboarded: boolean;
  startedAt: number;
};
export type Session = {
  id: "active";
  exerciseIds: string[];
  index: number;
  correct: number;
  mode: string;
};
class AcademyDB extends Dexie {
  settings!: Table<Settings, string>;
  memory!: Table<Memory, string>;
  attempts!: Table<Attempt, number>;
  sessions!: Table<Session, string>;
  practice!: Table<PracticeRecord, string>;
  constructor() {
    super("chameleon-bg");
    this.version(1).stores({
      settings: "id",
      memory: "id,wordId,skill",
      attempts: "++id,exerciseId,at,skill",
      sessions: "id",
    });
    this.version(2).stores({ practice: "id" });
    this.version(3).stores({memory:"id,wordId,skill,card.due,[skill+card.due]"});
  }
}
export const db = new AcademyDB();
export const defaultSettings: Settings = {
  id: "profile",
  name: "Друг",
  level: "A1",
  minutes: 40,
  reducedMotion: false,
  onboarded: false,
  startedAt: Date.now(),
};
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: true });
export async function reviewWord(
  wordId: string,
  skill: Skill,
  rating: Grade,
  duration: number,
  now = new Date(),
  recordAttempt = true,
) {
  const id = `${wordId}:${skill}`;
  const existing = await db.memory.get(id);
  const result = scheduler.next(
    existing?.card ?? createEmptyCard(now),
    now,
    rating,
  );
  await db.transaction("rw", [db.memory, db.attempts], async () => {
    await db.memory.put({
      id,
      wordId,
      skill,
      card: result.card,
      history: [...(existing?.history ?? []), { log: result.log, duration }],
    });
    if (recordAttempt)
      await db.attempts.add({
        exerciseId: `card-${wordId}-${skill}`,
        correct: rating >= Rating.Good,
        skill:
          skill === "recognition" ? "Узнавание слов" : "Воспроизведение слов",
        at: now.getTime(),
        duration: Math.min(duration, 300000),
      });
  });
  return result.card;
}
export function normalizeAnswer(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300\u0301]/g, "")
    .normalize("NFC")
    .toLocaleLowerCase("bg")
    .replace(/[.,!?;:„“"'—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function checkAnswer(answer: string, accepted: string[]) {
  return accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(answer));
}
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const dayFormatter=new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
export function localDay(at:number){return dayFormatter.format(at);}
export function streak(attempts: Attempt[]) {
  const days = new Set(attempts.map((x) => localDay(x.at)));
  let count = 0;
  const now = new Date();
  if (!days.has(localDay(now.getTime()))) now.setDate(now.getDate() - 1);
  while (days.has(localDay(now.getTime()))) {
    count++;
    now.setDate(now.getDate() - 1);
  }
  return count;
}
export async function exportProgress() {
  return {
    schema: 1,
    advancedPractice: await db.practice.toArray(),
    exportedAt: new Date().toISOString(),
    settings: await db.settings.toArray(),
    memory: await db.memory.toArray(),
    attempts: await db.attempts.toArray(),
    sessions: await db.sessions.toArray(),
  };
}
export async function importProgress(raw: unknown) {
  const d = raw as Awaited<ReturnType<typeof exportProgress>>;
  if (
    !d ||
    d.schema !== 1 ||
    !Array.isArray(d.settings) ||
    !Array.isArray(d.memory) ||
    !Array.isArray(d.attempts) ||
    !Array.isArray(d.sessions)
  )
    throw new Error("Неизвестный формат резервной копии");
  if (
    d.settings.length !== 1 ||
    d.settings[0].id !== "profile" ||
    !["A1", "A2", "B1", "B2", "C1", "C2"].includes(d.settings[0].level) ||
    ![20, 40, 60, 90, 120].includes(d.settings[0].minutes) ||
    typeof d.settings[0].name !== "string" ||
    !Number.isFinite(d.settings[0].startedAt)
  )
    throw new Error("Повреждены настройки");
  if (d.settings[0].difficultWords !== undefined && (!Array.isArray(d.settings[0].difficultWords) || !d.settings[0].difficultWords.every(id => typeof id === "string"))) throw Error("Повреждён список сложных слов");
  if (d.settings[0].mistakes !== undefined && (!Array.isArray(d.settings[0].mistakes) || d.settings[0].mistakes.length > 80 || !d.settings[0].mistakes.every(t => typeof t.id === "string" && typeof t.prompt === "string" && Array.isArray(t.answers) && t.answers.every(a => typeof a === "string")))) throw Error("Повреждена история ошибок");
  const cs=d.settings[0].cardSession;
  if(cs && (!Array.isArray(cs.ids) || cs.ids.length>100 || !cs.ids.every(id=>typeof id==="string") || !Number.isInteger(cs.index) || cs.index<0 || cs.index>cs.ids.length || !["recognition","production"].includes(cs.skill))) throw Error("Повреждена очередь карточек");
  const date = (v: unknown) => {
    const n = new Date(v as string | number);
    if (!Number.isFinite(n.getTime())) throw new Error("Повреждена дата");
    return n;
  };
  for (const m of d.memory) {
    if (
      typeof m.id !== "string" ||
      m.id !== `${m.wordId}:${m.skill}` ||
      !["recognition", "production"].includes(m.skill) ||
      !m.card ||
      !Array.isArray(m.history)
    )
      throw new Error("Повреждены карточки");
    m.card.due = date(m.card.due);
    if (m.card.last_review) m.card.last_review = date(m.card.last_review);
    for (const h of m.history) {
      h.log.due = date(h.log.due);
      h.log.review = date(h.log.review);
      if (!Number.isFinite(h.duration)) throw new Error("Повреждена история");
    }
    if (
      !Number.isFinite(m.card.stability) ||
      !Number.isFinite(m.card.reps) ||
      !Number.isFinite(m.card.difficulty)
    )
      throw new Error("Повреждён план повторений");
  }
  for (const a of d.attempts) {
    if (
      typeof a.exerciseId !== "string" ||
      typeof a.correct !== "boolean" ||
      typeof a.skill !== "string" ||
      !Number.isFinite(a.at) ||
      !Number.isFinite(a.duration)
    )
      throw new Error("Повреждена история заданий");
  }
  for (const s of d.sessions) {
    if (
      s.id !== "active" ||
      !Array.isArray(s.exerciseIds) ||
      !s.exerciseIds.every((x) => typeof x === "string") ||
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index > s.exerciseIds.length ||
      !Number.isFinite(s.correct) ||
      typeof s.mode !== "string"
    )
      throw new Error("Повреждена сессия");
  }
  if (d.advancedPractice !== undefined) {
    if (!Array.isArray(d.advancedPractice) || d.advancedPractice.length > 1)
      throw new Error("Повреждена расширенная сессия");
    for (const p of d.advancedPractice) {
      if (
        p.id !== "current" ||
        !Array.isArray(p.items) ||
        !Number.isInteger(p.index) ||
        p.index < 0 ||
        p.index > p.items.length ||
        !Number.isFinite(p.correct) ||
        !Number.isFinite(p.startedAt) ||
        p.items.some(
          (t) =>
            typeof t.id !== "string" ||
            typeof t.type !== "string" ||
            typeof t.prompt !== "string" ||
            !Array.isArray(t.answers) ||
            !t.answers.every((a) => typeof a === "string"),
        )
      )
        throw new Error("Повреждена расширенная сессия");
    }
  }
  await db.transaction(
    "rw",
    [db.settings, db.memory, db.attempts, db.sessions, db.practice],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.memory.clear(),
        db.attempts.clear(),
        db.sessions.clear(),
      ]);
      await db.practice.clear();
      if (d.advancedPractice) await db.practice.bulkPut(d.advancedPractice);
      await db.settings.bulkPut(d.settings);
      await db.memory.bulkPut(d.memory);
      await db.attempts.bulkAdd(d.attempts.map(({ id: _, ...a }) => a));
      await db.sessions.bulkPut(d.sessions);
    },
  );
}
