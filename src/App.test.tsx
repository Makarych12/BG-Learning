import { beforeEach, afterEach, it, expect } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { db, defaultSettings } from "./storage";
import { grammarUnits } from "./grammar-units";
import {academyCatalog} from './academy-catalog';
beforeEach(async () => {
  await Promise.all([
    db.settings.clear(),
    db.memory.clear(),
    db.attempts.clear(),
    db.sessions.clear(),
    db.practice.clear(),
  ]);
  await db.settings.put(defaultSettings);
});
afterEach(() => cleanup());
it('шесть больших карточек показывают полный доступный курс и открывают выбранный C2',async()=>{
  const user=userEvent.setup();render(<App/>);
  await user.click(await screen.findByRole('button',{name:'Академия A1–C2'}));
  await screen.findByText('22 уроков · 367 заданий');
  const cards=Array.from(document.querySelectorAll('.academy-card'));
  expect(cards).toHaveLength(6);
  for(const [index,level] of ['A1','A2','B1','B2','C1','C2'].entries()){
    const units=[...grammarUnits,...academyCatalog].filter(unit=>unit.level===level);
    const tasks=units.reduce((sum,unit)=>sum+(unit.taskCount??unit.tasks.length),0);
    expect(within(cards[index] as HTMLElement).getByText(`${units.length} уроков · ${tasks} заданий`)).toBeTruthy();
  }
  await user.click(within(cards[5] as HTMLElement).getByRole('button',{name:'Начать урок'}));
  await screen.findByRole('heading',{name:grammarUnits.find(unit=>unit.level==='C2')!.title,level:2});
  await user.click(screen.getByRole('button',{name:/Закрепить тему/}));
  await screen.findByText('1 / 24');
  expect((await db.practice.get('current'))?.items.every(task=>task.level==='C2')).toBe(true);
  expect(await db.sessions.get('active')).toBeUndefined();
},15000);
it("Основной вход открывает полный урок Академии и восстанавливает его после перезапуска", async () => {
  await db.settings.update('profile',{onboarded:true});
  const user = userEvent.setup();
  const first = render(<App />);
  await screen.findByRole("heading", { name: /Здравей/ });
  await user.click(screen.getByRole("button", { name: "Начать обучение" }));
  await screen.findByRole("heading", {name:"Настоящее время",level:2},{timeout:5000});
  await user.click(screen.getByRole("button", {name:/Закрепить тему/}));
  await screen.findByRole("dialog",{name:"Практика академии"});
  const unit=grammarUnits.find(u=>u.id==='present')!;
  expect(unit.tasks.length).toBeGreaterThan(5);
  const prompt = document.querySelector(".exercise-prompt")!.textContent;
  const task = unit.tasks.find(t=>t.prompt===prompt)!;
  await user.type(screen.getByRole("textbox",{name:"Ответ на задание"}),task.answers[0]);
  await user.click(screen.getByRole("button",{name:"Проверить"}));
  await screen.findByText("Верно!");
  await user.click(screen.getByRole("button",{name:"Дальше"}));
  expect((await db.practice.get("current"))?.items).toHaveLength(unit.tasks.length);
  expect((await db.practice.get("current"))?.index).toBe(1);
  expect(await db.sessions.get("active")).toBeUndefined();
  await user.click(screen.getByRole("button",{name:"Закрыть практику"}));
  first.unmount();render(<App />);
  await user.click(await screen.findByRole("button",{name:"Начать обучение"}));
  await user.click(await screen.findByRole("button",{name:"Продолжить"}));
  await screen.findByRole("dialog",{name:"Практика академии"});
  expect(screen.getByText(`2 / ${unit.tasks.length}`)).toBeTruthy();
  expect(await db.attempts.count()).toBe(1);
},15000);
it("Показывает карточку, сохраняет FSRS-рейтинг и обновляет очередь", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: /Здравей/ });
  await user.click(screen.getByRole("button", { name: "Умные карточки" }));
  await user.click(
    await screen.findByRole("button", { name: "Начать повторение" }),
  );
  await user.click(screen.getByRole("button", { name: "Показать перевод" }));
  await user.click(screen.getByRole("button", { name: /^Помню/ }));
  await waitFor(async () => expect(await db.memory.count()).toBe(1));
  expect((await db.memory.toArray())[0].card.reps).toBe(1);
  expect((await db.attempts.toArray())[0].skill).toBe("Узнавание слов");
});
it("Сохраняет ежедневную цель и распределяет все выбранные минуты", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: /Здравей/ });
  await user.click(screen.getByRole("button", { name: "Интенсив 30 дней" }));
  await user.click(
    await screen.findByRole("button", { name: "20 минут в день" }),
  );
  await waitFor(async () =>
    expect((await db.settings.get("profile"))?.minutes).toBe(20),
  );
  const total = Array.from(
    document.querySelectorAll(".boost-plan button>span:nth-last-child(2)"),
  ).reduce((s, e) => s + parseInt(e.textContent!), 0);
  expect(total).toBe(20);
});
it("При первом старте сохраняет выбранный уровень и темп до запуска урока", async () => {
  const user = userEvent.setup();
  await db.settings.clear();
  render(<App />);
  await screen.findByRole("heading", { name: /Здравей/ });
  expect((await db.settings.get("profile"))?.id).toBe("profile");
  await user.click(screen.getByRole("button", { name: "Начать обучение" }));
  await screen.findByRole("dialog", { name: "Твоя академия, твой ритм" });
  await user.selectOptions(
    screen.getByLabelText("Сколько времени в день?"),
    "60",
  );
  await waitFor(async () =>
    expect((await db.settings.get("profile"))?.minutes).toBe(60),
  );
  await user.selectOptions(
    screen.getByLabelText("С какого уровня начнём?"),
    "B1",
  );
  await waitFor(async () =>
    expect((await db.settings.get("profile"))?.level).toBe("B1"),
  );
  await user.click(screen.getByRole("button", { name: "Открыть первый урок" }));
  await screen.findByRole("heading",{name:"Аорист: событие в прошлом",level:2});
  await user.click(screen.getByRole("button",{name:/Закрепить тему/}));
  await screen.findByText("1 / 24");
  expect((await db.settings.get("profile"))?.onboarded).toBe(true);
  expect((await db.practice.get("current"))?.items.every(task=>task.level==='B1')).toBe(true);
  expect(await db.sessions.get("active")).toBeUndefined();
});
