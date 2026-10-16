import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { Rating } from "ts-fsrs";
import {
  db,
  checkAnswer,
  reviewWord,
  exportProgress,
  importProgress,
  defaultSettings,
  shuffle,
} from "./storage";
import { exercises, levels, words, tenses } from "./content";
beforeEach(async () => {
  await Promise.all([
    db.settings.clear(),
    db.memory.clear(),
    db.attempts.clear(),
    db.sessions.clear(),
  ]);
});
afterAll(() => db.close());
describe("Проверка болгарских ответов", () => {
  it("Принимает ударения, регистр, пунктуацию и допустимые варианты", () => {
    expect(checkAnswer("  Благодаря! ", ["благодаря"])).toBe(true);
    expect(checkAnswer("вода̀", ["вода"])).toBe(true);
    expect(
      checkAnswer("Един билет за София, моля.", [
        "един билет до софия моля",
        "един билет за софия моля",
      ]),
    ).toBe(true);
  });
  it("Различает грамматически разные формы и буквы", () => {
    expect(checkAnswer("машиниста", ["машинистът"])).toBe(false);
    expect(checkAnswer("четях", ["четох"])).toBe(false);
    expect(checkAnswer("вода", ["въда"])).toBe(false);
  });
});
describe("FSRS и сохранение", () => {
  it("Вычисляет реальную дату и сохраняет независимые навыки и историю", async () => {
    const now = new Date("2026-10-16T10:00:00Z");
    const c = await reviewWord("water", "recognition", Rating.Good, 1300, now);
    expect(c.due.getTime()).toBeGreaterThan(now.getTime());
    expect(c.reps).toBe(1);
    expect(c.stability).toBeGreaterThan(0);
    expect(await db.memory.get("water:production")).toBeUndefined();
    await reviewWord("water", "production", Rating.Again, 1700, now);
    expect(await db.memory.count()).toBe(2);
    expect(
      (await db.memory.get("water:production"))?.history[0].log.rating,
    ).toBe(Rating.Again);
    expect(await db.attempts.count()).toBe(2);
  });
  it("Восстанавливает даты FSRS, настройки и незавершённый урок из JSON", async () => {
    await db.settings.put({ ...defaultSettings, name: "Тест", level: "B1" });
    await reviewWord("damage", "recognition", Rating.Good, 2000);
    await db.sessions.put({
      id: "active",
      exerciseIds: ["b1-1", "b1-2"],
      index: 1,
      correct: 1,
      mode: "lesson",
    });
    const data = JSON.parse(JSON.stringify(await exportProgress()));
    await db.memory.clear();
    await db.sessions.clear();
    await importProgress(data);
    expect((await db.settings.get("profile"))?.name).toBe("Тест");
    expect(
      (await db.memory.get("damage:recognition"))?.card.due,
    ).toBeInstanceOf(Date);
    expect((await db.sessions.get("active"))?.index).toBe(1);
    expect(await db.attempts.count()).toBe(1);
  });
  it("Отклоняет повреждённую копию до изменения прогресса", async () => {
    await db.settings.put(defaultSettings);
    await reviewWord("water", "production", Rating.Good, 1000);
    const backup = await exportProgress();
    backup.settings[0].level = "BAD" as any;
    await expect(importProgress(backup)).rejects.toThrow();
    expect(await db.memory.count()).toBe(1);
    expect((await db.settings.get("profile"))?.level).toBe("A1");
  });
});
describe("Целостность учебной базы", () => {
  it("Все уровни доступны и у каждого есть вводный урок", () => {
    for (const l of levels)
      expect(exercises.filter((e) => e.level === l.id)).toHaveLength(5);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
  });
  it("Варианты ответов содержат правильный ответ, а предложения собираются из токенов", () => {
    for (const e of exercises) {
      expect(e.answers.length).toBeGreaterThan(0);
      if (e.type === "choice") expect(e.options).toContain(e.answers[0]);
      if (e.type === "order")
        expect(e.options?.slice().sort()).toEqual(
          e.answers[0].split(" ").sort(),
        );
    }
  });
  it("Парадигма содержит девять времён и шесть лиц", () => {
    expect(tenses).toHaveLength(9);
    tenses.forEach((t) => expect(t.forms).toHaveLength(6));
  });
  it("Перемешивание не изменяет исходную подборку", () => {
    const original = [1, 2, 3, 4];
    expect(shuffle(original).sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4]);
  });
});
