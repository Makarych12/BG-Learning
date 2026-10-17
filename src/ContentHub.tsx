import type {LessonUnit} from "./grammar-units";
import { useState, useEffect, useLayoutEffect, useRef, useMemo, lazy, Suspense, Fragment } from "react";
import { sentenceReviewReason, railReviewReason } from "./content-quality";
const WritingWorkshop=lazy(()=>import("./WritingWorkshop"));
const RailAcademy=lazy(()=>import("./RailAcademy"));
const RailLessons=lazy(()=>import("./RailLessons"));
async function verbTasks(...args:Parameters<typeof import('./grammar-practice')['verbTasks']>){return (await import('./grammar-practice')).verbTasks(...args);}
async function morphologyTasks(...args:Parameters<typeof import('./grammar-practice')['morphologyTasks']>){return (await import('./grammar-practice')).morphologyTasks(...args);}
const VerbReference=lazy(()=>import("./VerbReference"));
import { practiceLevel } from "./adaptation";
const PhotoGallery=lazy(()=>import("./PhotoGallery").then(m=>({default:m.PhotoGallery})));
import {
  Search,
  BookOpen,
  Download,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Layers,
  Check,
  Clock,
  TrainFront,
  ExternalLink,
  ChevronRight,
  Headphones,
  Sparkles,
  RefreshCw,
  Mic,
  Target,
  Library,
  Settings,
  Play,
} from "lucide-react";
import {
  contentDB,
  getCatalog,
  installContent,
  searchLexemes,
  searchSentences,
  type Catalog,
  type Lexeme,
  type Sentence,
  type Task,
  type PracticeRecord,
  type Mechanic,
} from "./library";
import { mechanics } from "./mechanics";
import { adaptTasks } from "./task-adaptation";
import { useHubData } from "./hub-data";
import {courseCounts} from "./academy-counts";
async function generateTasks(...args:Parameters<typeof import('./practice')['generateTasks']>){return (await import('./practice')).generateTasks(...args);}

import type { Dialogue } from "./curriculum";

import { db, reviewWord, shuffle, type Settings as Profile } from "./storage";
import { Rating } from "ts-fsrs";
import { speak, stopSpeech, speakSequence, cacheAudio } from "./speech";
import PracticePlayer from "./PracticePlayer";
import type { Level } from "./content";
export type HubMode =
  | "library"
  | "practice"
  | "courses"
  | "grammar"
  | "railway"
  | "dialogues"
  | "listening"
  | "plan";
const levelList: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export default function ContentHub({
  mode,
  profile,
  notify,
  onRefresh,
  initialQuery,
  courseStart,
}: {
  initialQuery?: string;
  courseStart?: {level:Level;request:number};
  mode: HubMode;
  profile: Profile;
  notify: (s: string) => void;
  onRefresh: () => void;
}) {
  const {data:{grammarUnits,dialogues,railTerms,railExamples,railSources,photos},ready:dataReady,error:dataError}=useHubData(mode);
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [installed, setInstalled] = useState(0),
    [loading, setLoading] = useState(false),
    [progress, setProgress] = useState({ done: 0, total: 0 }),
    [query, setQuery] = useState(initialQuery ?? ""),
    [pos, setPos] = useState("all"),
    [activeOnly, setActiveOnly] = useState(false),
    [offset, setOffset] = useState(0),
    [tab, setTab] = useState<"words" | "sentences" | "packages" | "photos">("words"),
    [lexemes, setLexemes] = useState<Lexeme[]>([]),
    [sentences, setSentences] = useState<Sentence[]>([]),
    [selected, setSelected] = useState<Lexeme | null>(null),
    [examples, setExamples] = useState<Sentence[]>([]),
    [practice, setPractice] = useState<PracticeRecord | null>(null),
    [resume, setResume] = useState<PracticeRecord | undefined>(),
    [level, setLevel] = useState<Level>(profile.level),
    [busy, setBusy] = useState(false),
    [activeUnit, setActiveUnit] = useState<string | null>(null),
    [topic, setTopic] = useState("all"),
    [dialogue, setDialogue] = useState<string | null>(null),
    [showTranslations, setShowTranslations] = useState(true),
    [audioProgress, setAudioProgress] = useState(""),
    [fsrs, setFsrs] = useState<any>(null),
    [checked, setChecked] = useState(false),
    [queueCount, setQueueCount] = useState(0),
    [practiceIds, setPracticeIds] = useState<string[]>([]);
  const [lessonContent,setLessonContent]=useState<LessonUnit|null>(null);
  const [lessonError,setLessonError]=useState(false),[lessonRetry,setLessonRetry]=useState(0);
  useEffect(()=>{
    let alive=true;setLessonError(false);
    if(!activeUnit?.startsWith('advanced-'))return;
    void import('./advanced-lessons').then(m=>m.loadAdvancedLesson(activeUnit)).then(unit=>{if(alive)setLessonContent(unit);}).catch(()=>{if(alive)setLessonError(true);});
    return()=>{alive=false;};
  },[activeUnit,lessonRetry]);
  const courseScroll = useRef<string|null>(null);
  function openCourseUnit(unit:LessonUnit) {
    stopSpeech();setLevel(unit.level);setPractice(null);
    const target=document.getElementById(`lesson-${unit.id}`);
    if(target)target.scrollIntoView?.({block:'start',behavior:'instant'});
    else courseScroll.current=unit.id;
    setActiveUnit(unit.id);
  }
  useEffect(()=>{
    if(mode!=='courses'||!courseStart||!dataReady)return;
    const first=grammarUnits.find(unit=>unit.level===courseStart.level);
    if(first)openCourseUnit(first);
  },[courseStart?.request,dataReady,mode]);
  useLayoutEffect(()=>{
    if(courseScroll.current!==activeUnit)return;
    const target=document.getElementById(`lesson-${activeUnit}`);
    if(target){target.scrollIntoView?.({block:'start',behavior:'instant'});courseScroll.current=null;}
  },[activeUnit]);
  const playing = useRef(false);
  const expansionAnchor = useRef<{element: HTMLElement; top: number} | null>(null);
  function toggleExpansion(event: React.MouseEvent<HTMLElement>, id: string, current: string | null, set: (id: string | null) => void) {
    expansionAnchor.current = {element: event.currentTarget, top: event.currentTarget.getBoundingClientRect().top};
    set(current === id ? null : id);
  }
  useLayoutEffect(() => {
    const anchor = expansionAnchor.current;
    if (!anchor) return;
    expansionAnchor.current = null;
    if (anchor.element.isConnected) window.scrollBy({top: anchor.element.getBoundingClientRect().top - anchor.top, behavior: 'instant'});
  }, [activeUnit, dialogue, selected?.id]);

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
      setOffset(0);
      setSelected(null);
    }
  }, [initialQuery]);
  useEffect(() => setLevel(profile.level), [profile.level]);
  async function refresh() {
    setInstalled(await contentDB.lexemes.count());
    setQueueCount(
      await db.memory.where("card.due").belowOrEqual(new Date())
        .filter(
          (m) =>
            (m.wordId.startsWith("wiki-") || m.wordId.startsWith("rail-")) &&
            m.card.due <= new Date(),
        )
        .count(),
    );
    setResume(await db.practice.get("current"));
    onRefresh();
  }
  const installationAbort = useRef<AbortController | null>(null);
  async function install(c: Catalog) {
    const controller = installationAbort.current ??= new AbortController();
    if (controller.signal.aborted) return;
    setLoading(true);
    try {
      await installContent(c, (done, total) => { if (!controller.signal.aborted) setProgress({ done, total }); }, controller.signal);
      if (!controller.signal.aborted) await refresh();
    } catch (e) {
      if (controller.signal.aborted) return;
      notify(
        e instanceof Error
          ? e.message
          : "Не удалось загрузить пакет. Уже загруженные материалы сохранены.",
      );
      await refresh();
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let alive = true;
    void refresh().catch(()=>{if(alive)notify("Не удалось прочитать сохранённую практику.");});
    getCatalog()
      .then(async (c) => {
        if (!alive) return;
        setCatalog(c);
        if (!alive) return;
        const local = await contentDB.packages.bulkGet(
          c.packages.map((p) => p.id),
        );
        if (
          ["library","practice","listening"].includes(mode) && c.packages.some(
            (p, i) =>
              local[i]?.sha256 !== p.sha256 || local[i]?.version !== c.version,
          )
        )
          await install(c);
      })
      .catch(() =>
        notify("Каталог недоступен. Сохранённые материалы остаются доступны."),
      );
    return () => {
      alive = false;
      installationAbort.current?.abort();
      playing.current = false;
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    if(mode!=="library")return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (tab === "words") {
          const rows = await searchLexemes(query, offset, pos, activeOnly);
          if (!cancelled) setLexemes(rows);
        } else if (tab === "sentences") {
          const rows = await searchSentences(query, offset);
          if (!cancelled) setSentences(rows);
        }
      } catch {
        notify("Не удалось открыть локальные материалы.");
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, offset, pos, activeOnly, tab, installed, loading,mode]);
  useEffect(() => {
    if (!selected) {
      setExamples([]);
      return;
    }
    let alive = true;
    contentDB.sentences.bulkGet(selected.examples).then((rows) => {
      if (alive) setExamples(rows.filter(Boolean) as Sentence[]);
    });
    db.memory.get(selected.id + ":recognition").then((m) => {
      if (alive) setFsrs(m);
    });
    return () => {
      alive = false;
    };
  }, [selected]);
  async function launch(tasks: Task[], courseUnitId?:string) {
    if (!tasks.length) {
      notify(
        "Подходящие материалы не найдены. Выберите другую тему или завершите загрузку пакетов.",
      );
      return;
    }
    if (
      resume &&
      !window.confirm(
        "У вас есть незавершённая практика. Начать новую вместо неё?",
      )
    )
      return;
    const record: PracticeRecord = {
      id: "current",
      items: await adaptTasks(tasks),
      courseUnitId,
      index: 0,
      correct: 0,
      startedAt: Date.now(),
    };
    await db.practice.put(record);
    setResume(record);
    setPractice(record);
  }
  async function generated(type: Mechanic) {
    if (busy) return;
    setBusy(true);
    try {
      await launch(await generateTasks(type, level, 10));
    } catch {
      notify("Не удалось подготовить практику. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }
  async function rate(r: Rating) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await reviewWord(selected.id, "recognition", r as any, 0);
      setFsrs(await db.memory.get(selected.id + ":recognition"));
      setChecked(false);
      await refresh();
    } catch {
      notify("Не удалось сохранить повторение.");
    } finally {
      setBusy(false);
    }
  }
  async function reviewDue(hard = false) {
    const due = await db.memory
      .filter(
        (m) =>
          (m.wordId.startsWith("wiki-") || m.wordId.startsWith("rail-")) &&
          (hard ? (profile.difficultWords ?? []).includes(m.wordId) || m.card.lapses > 0 : m.card.due <= new Date()),
      )
      .limit(20)
      .toArray();
    const rows = await contentDB.lexemes.bulkGet(due.map((d) => d.wordId));
    const tasks: Task[] = [];
    for (let i = 0; i < due.length; i++) {
      const m = due[i],
        w = rows[i] ?? railTerms.find((t) => t.id === m.wordId);
      if (!w || railReviewReason(w)) continue;
      const recognition = m.skill === "recognition";
      tasks.push({
        id: `review-${m.skill}-${w.id}`,
        type: recognition ? "meaning" : "spelling",
        prompt: recognition
          ? `Вспомните значение: ${w.bg}`
          : `Вспомните болгарское слово: ${w.ru}`,
        answers: [recognition ? w.ru : w.bg],
        wordId: w.id,
        explanation: `${w.bg} — ${w.ru}`,
        source: w.source,
        skill: recognition ? "Узнавание слов" : "Активное воспроизведение",
        level,
      });
    }
    await launch(shuffle(tasks));
  }
  const titles: Record<HubMode, string> = {
    library: "Библиотека языка",
    practice: "Тренажёр навыков",
    courses: "Программы и тематические уроки",
    grammar: "Системная грамматика",
    railway: "Профессиональная практика",
    dialogues: "Разговорная мастерская",
    listening: "Библиотека аудирования",
    plan: "Адаптивный маршрут",
  };
  const filteredRail = useMemo(()=>railTerms.filter(t => (topic === "all" || topic === t.topic) && (t.bg+" "+t.ru).toLowerCase().includes(query.toLowerCase())),[railTerms,topic,query]);
  useEffect(()=>{ if(mode === "railway")setOffset(0); },[topic,query,mode]);
  const themeTopics = useMemo(()=>Array.from(new Set(railTerms.map((t) => t.topic))),[railTerms]);
  const lexemeDetails = selected ? (
            <article className="panel lexeme-detail">
              <div className="lexeme-heading">
                <div>
                  <span className="eyebrow">СЛОВАРНАЯ СТАТЬЯ</span>
                  <h2 lang="bg">{selected.stress ?? selected.bg}</h2>
                  <p>{selected.grammar}</p>{selected.morphologySource&&<SourceLink url={selected.morphologySource} label="Словоформы и ударение · источник CC BY-SA 4.0"/>}
                  <span className="tag">{selected.active ? "Активный словарь · 5–15 контекстов" : "Справочный словарь"}</span>
                </div>
                <button
                  className="sound-button"
                  onClick={() => speak(selected.stress ?? selected.bg, notify)}
                  aria-label="Озвучить словарное слово"
                >
                  <Volume2 size={23} />
                </button>
              </div>
              {photos
                .filter((p) => p.bg === selected.bg)
                .map((p) => (
                  <figure className="lexeme-photo" key={p.id}>
                    <img src={p.path} alt={p.bg} />
                    <figcaption>
                      <SourceLink
                        url={p.source}
                        label={`${p.author} · ${p.license}`}
                      />
                    </figcaption>
                  </figure>
                ))}
              <ol className="sense-list">
                {selected.senses.map((s, i) => (
                  <li key={i}>
                    {s.gloss}
                    {s.source && (
                      <SourceLink
                        url={s.source}
                        label="Источник переводной связи"
                      />
                    )}
                    {s.tags.length > 0 && <small>{s.tags.join(", ")}</small>}
                  </li>
                ))}
              </ol>
              {!selected.stress && (
                <p className="editorial-note">
                  Ударение в источнике не указано; автоматически не
                  проставляется.
                </p>
              )}
              {selected.ipa.length > 0 && (
                <p className="ipa-line">IPA: {selected.ipa.join(" · ")}</p>
              )}
              {selected.forms.length > 0 && (
                <details>
                  <summary>Словоформы · {selected.forms.length}</summary>
                  <div className="forms-table">
                    {selected.forms.map((f, i) => (
                      <div key={i}>
                        <strong lang="bg">{f.text}</strong>
                        <small>{f.tags.join(" · ")}</small>
                        <button
                          className="icon-btn"
                          onClick={() => speak(f.text, notify)}
                          aria-label={`Озвучить ${f.text}`}
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {[
                ["Синонимы", selected.synonyms],
                ["Антонимы", selected.antonyms],
                ["Связанные слова", selected.related],
              ].map(
                ([label, list]) =>
                  (list as string[]).length > 0 && (
                    <div className="lexical-relations" key={label as string}>
                      <strong>{label as string}</strong>
                      <div className="tags">
                        {(list as string[]).map((w) => (
                          <button
                            key={w}
                            onClick={() => {
                              setQuery(w);
                              setOffset(0);
                              setSelected(null);
                            }}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
              )}
              {examples.map((s) => (
                <SentenceCard
                  key={s.id}
                  s={s}
                  notify={notify}
                  onTask={() =>
                    launch([
                      {
                        id: "dictation-" + s.id,
                        type: "dictation",
                        prompt: "Прослушайте и запишите предложение.",
                        bg: s.bg,
                        answers: [s.bg],
                        explanation: s.ru,
                        skill: "Аудирование",
                        source: s.source,
                        level,
                      },
                    ])
                  }
                />
              ))}
              <button className="btn secondary" aria-pressed={(profile.difficultWords ?? []).includes(selected.id)} onClick={async()=>{
                const difficultWords = new Set(profile.difficultWords ?? []);
                if (difficultWords.has(selected.id)) difficultWords.delete(selected.id); else difficultWords.add(selected.id);
                await db.settings.update("profile",{difficultWords:[...difficultWords]});
                await refresh();
              }}>{(profile.difficultWords ?? []).includes(selected.id) ? "★ В сложных словах" : "☆ Добавить в сложные слова"}</button>
              <div className="word-memory">
                <Layers size={18} />
                <span>
                  {fsrs
                    ? `Повторений: ${fsrs.card.reps} · устойчивость: ${fsrs.card.stability.toFixed(1)} дн. · следующее: ${fsrs.card.due.toLocaleString("ru")}`
                    : "У слова пока нет истории повторений."}
                </span>
              </div>
              {checked ? (
                <div className="rating-buttons">
                  {[
                    { r: Rating.Again, label: "Не вспомнил", c: "red" },
                    { r: Rating.Hard, label: "Трудно", c: "orange" },
                    { r: Rating.Good, label: "Помню", c: "mint" },
                    { r: Rating.Easy, label: "Легко", c: "purple" },
                  ].map((b) => (
                    <button
                      disabled={busy}
                      key={b.r}
                      className={b.c}
                      onClick={() => rate(b.r)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="settings-actions">
                  <button
                    className="btn secondary"
                    onClick={() => setChecked(true)}
                  >
                    Повторил значение — оценить
                  </button>
                  <button
                    className="btn primary"
                    onClick={() =>
                      launch([
                        {
                          id: "active-" + selected.id,
                          type: "spelling",
                          prompt: `Воспроизведите болгарское слово из карточки: ${selected.ru}`,
                          answers: [selected.bg],
                          wordId: selected.id,
                          explanation: selected.grammar,
                          skill: "Активный словарь",
                          source: selected.source,
                          level,
                        },
                      ])
                    }
                  >
                    Написать по памяти <ArrowRight size={16} />
                  </button>
                  <button
                    className="text-btn"
                    onClick={() => setSelected(null)}
                  >
                    Закрыть статью
                  </button>
                </div>
              )}
              <SourceLink
                url={selected.source}
                label="Авторы Викисловаря · CC BY-SA 4.0 · статья из открытого словаря"
              />
            </article>
  ) : null;
  if(dataError)return <p role="alert">Не удалось загрузить материалы. Повторите открытие раздела.</p>;
  if(dataError)return <p role="alert">Не удалось загрузить материалы. Повторите открытие раздела.</p>;
  if(!dataReady)return <p role="status">Загружаем материалы раздела…</p>;
  return (
    <Suspense fallback={<p role="status">Открываем раздел…</p>}><section className="content-hub">{!dataReady&&<p role="status">Загружаем материалы раздела…</p>}{dataError&&<p role="alert">Не удалось загрузить материалы. Повторите открытие раздела.</p>}
      <div className="section-title">
        <div>
          <h2>{titles[mode]}</h2>
          <p>
            {mode === "library"
              ? `${catalog?.counts.words.toLocaleString("ru") ?? "…"} словарных статей · ${catalog?.counts.sentences.toLocaleString("ru") ?? "…"} переводных контекста`
              : "Уроки, практика и ваши реальные результаты"}
          </p>
        </div>
        {!["library", "railway"].includes(mode) && (
          <select
            aria-label="Уровень расширенной практики"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as Level);
              setActiveUnit(null);
              setDialogue(null);
            }}
          >
            {levelList.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        )}
      </div>
      {loading && (
        <div className="download-progress" role="status">
          <Download size={17} />
          <div>
            <strong>Сохраняем библиотеку для обучения</strong>
            <small>
              Пакет {progress.done} из {progress.total} · можно пользоваться уже
              загруженными материалами
            </small>
            <div className="progress-track">
              <i
                style={{
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      {resume && !practice && (
        <div className="info-banner">
          <Layers size={20} />
          <span>
            Незавершённая практика: {resume.index + 1} из {resume.items.length}{" "}
            заданий.
          </span>
          <button className="btn secondary" onClick={() => setPractice(resume)}>
            Продолжить <ArrowRight size={16} />
          </button>
        </div>
      )}
      {mode === "library" && (
        <>
          <div className="library-toolbar">
            <div className="filter-tabs">
              {[
                { id: "words", name: "Словарь" },
                { id: "sentences", name: "Контексты" },
                { id: "photos", name: "Фотогалерея" },
                { id: "packages", name: "Загрузки и источники" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? "active" : ""}
                  onClick={() => {
                    setTab(t.id as typeof tab);
                    setOffset(0);
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <span className="library-count">
              <Check size={13} /> {installed.toLocaleString("ru")} статей на
              устройстве
            </span>
          </div>
          {(tab === "words" || tab === "sentences") && (
            <div className="library-search">
              <Search size={19} />
              <input
                aria-label="Поиск в большой библиотеке"
                placeholder="Болгарское слово или русское значение…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOffset(0);
                  setSelected(null);
                }}
              />
              {tab === "words" && (
                <select
                  aria-label="Часть речи"
                  value={pos}
                  onChange={(e) => {
                    setPos(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="all">Все части речи</option>
                  {[
                    ["noun", "Существительные"],
                    ["verb", "Глаголы"],
                    ["adj", "Прилагательные"],
                    ["adv", "Наречия"],
                    ["phrase", "Выражения"],
                    ["pron", "Местоимения"],
                  ].map(([id, label]) => (
                    <option value={id} key={id}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {tab === "words" && <label className="active-vocabulary-toggle"><input type="checkbox" checked={activeOnly} onChange={e=>{setActiveOnly(e.target.checked);setOffset(0);setSelected(null);}}/> Только активный словарь · {catalog?.counts.activeWords ?? "…"} слов с пятью и более контекстами</label>}
          {tab === "words" && (
            <div className="word-grid large-dictionary expandable-grid">
              {lexemes.map((w) => (
                <Fragment key={w.id}><button
                  className="panel word-card dictionary-button"
                  aria-expanded={selected?.id === w.id}
                  onClick={event => {
                    expansionAnchor.current={element:event.currentTarget,top:event.currentTarget.getBoundingClientRect().top};
                    setSelected(selected?.id === w.id ? null : w);
                    setChecked(false);
                  }}
                >
                  <div>
                    <span className="tag">{w.grammar.split(" · ")[0]}</span>
                    <ChevronRight size={16} />
                  </div>
                  <h3 lang="bg">{w.stress ?? w.bg}</h3>
                  <p>{w.ru}</p>
                  <small>{w.grammar}</small>
                </button>{selected?.id === w.id && <div className="inline-expansion">{lexemeDetails}</div>}</Fragment>
              ))}
            </div>
          )}
          {tab === "sentences" && (
            <div className="corpus-grid">
              {sentences.map((s) => (
                <SentenceCard
                  key={s.id}
                  s={s}
                  notify={notify}
                  onTask={() =>
                    launch([
                      {
                        id: "dictation-" + s.id,
                        type: "dictation",
                        prompt: "Прослушайте и напишите фразу.",
                        bg: s.bg,
                        answers: [s.bg],
                        explanation: s.ru,
                        source: s.source,
                        sourceLabel: `${s.author} · ${s.license}`,
                        skill: "Аудирование",
                        level,
                      },
                    ])
                  }
                />
              ))}
            </div>
          )}
          {(tab === "words" || tab === "sentences") && (
            <div className="pagination">
              <button
                className="btn secondary"
                disabled={offset === 0}
                onClick={() => {
                  setOffset((x) =>
                    Math.max(0, x - (tab === "words" ? 36 : 24)),
                  );
                  setSelected(null);
                }}
              >
                <ArrowLeft size={16} /> Назад
              </button>
              <span>
                Страница {Math.floor(offset / (tab === "words" ? 36 : 24)) + 1}
              </span>
              <button
                className="btn secondary"
                disabled={
                  (tab === "words" ? lexemes.length : sentences.length) <
                  (tab === "words" ? 36 : 24)
                }
                onClick={() => {
                  setOffset((x) => x + (tab === "words" ? 36 : 24));
                  setSelected(null);
                }}
              >
                Дальше <ArrowRight size={16} />
              </button>
            </div>
          )}
          {tab === "photos" && <PhotoGallery notify={notify} launch={launch} />}
          {tab === "packages" && (
            <>
              <div className="info-banner">
                <Library size={21} />
                <span>
                  Словарь загружается частями по 400 статей, контексты — по 300.
                  Поиск и пагинация используют IndexedDB. Прогресс обучения
                  хранится отдельно от повторно загружаемых материалов.
                </span>
                <button
                  className="btn secondary"
                  disabled={loading || !catalog}
                  onClick={() => catalog && install(catalog)}
                >
                  <RefreshCw size={16} /> Обновить пакеты
                </button>
              </div>
              {catalog?.sources.map((s) => (
                <div className="panel attribution-panel" key={s.url}>
                  <h3>{s.name}</h3>
                  <p>{s.attribution}</p>
                  <SourceLink url={s.url} label={s.license} />
                  <SourceLink url={s.licenseUrl} label="Условия лицензии" />
                </div>
              ))}
              <div className="package-grid">
                {catalog?.packages.map((p) => (
                  <div className="panel package-item" key={p.id}>
                    <span className="tag">
                      {p.kind === "dictionary" ? "Словарь" : "Контексты"}
                    </span>
                    <h3>{p.title}</h3>
                    <small>
                      {p.count} записей · {Math.round(p.bytes / 1024)} КБ
                    </small>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {mode === "practice" && (
        <>
          <div className="info-banner">
            <Target size={21} />
            <span>
              Выбран уровень {level}. Для контекстных упражнений длина фразы
              адаптируется к уровню; это учебная настройка, а не подтверждённая
              CEFR-разметка корпуса.
            </span>
            <button
              className="btn secondary"
              disabled={!queueCount}
              onClick={() => reviewDue()}
            >
              Повторить ошибки и слова · {queueCount}
            </button>
          </div>
          <div className="settings-actions">
            <button className="btn secondary" disabled={!profile.mistakes?.length} onClick={()=>launch(profile.mistakes ?? [])}>Повторить мои ошибки · {profile.mistakes?.length ?? 0}</button>
            <button className="btn secondary" onClick={async()=>{
              const rows=await contentDB.lexemes.bulkGet(profile.difficultWords ?? []);
              const tasks:Task[]=rows.filter((w):w is Lexeme=>!!w).map(w=>({id:'hard-word-'+w.id,type:'spelling',prompt:`Вспомните по-болгарски: ${w.ru}`,answers:[w.bg],wordId:w.id,explanation:w.grammar,source:w.source,skill:'Активное воспроизведение',level}));
              if(!tasks.length){notify("Добавьте слова в сложные через карточку словаря.");return;}await launch(shuffle(tasks));
            }}>Мои сложные слова · {profile.difficultWords?.length ?? 0}</button>
          </div>
          <div className="mechanic-grid">
            {mechanics.map((m, i) => (
              <button
                className="panel mechanic-card"
                disabled={busy}
                key={m.id}
                onClick={() => generated(m.id)}
              >
                <span className="mechanic-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{m.name}</h3>
                <p>{m.description}</p>
                <span>
                  Начать <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {(mode === "courses" || mode === "grammar") && (
        <>
          <div className="settings-actions"><button className="btn secondary" onClick={async()=>{const tasks=await morphologyTasks("article",level,15);tasks.length?launch(tasks):notify("Исходные задания недоступны. Откройте сохранённый урок ниже.");}}>Артикли · новые исходные формы</button><button className="btn secondary" onClick={async()=>{const tasks=await morphologyTasks("plural",level,15);tasks.length?launch(tasks):notify("Не удалось открыть задания по числу.");}}>Множественное и счётное число</button><button className="btn secondary" onClick={async()=>{const tasks=await morphologyTasks("agreement",level,15);tasks.length?launch(tasks):notify("Не удалось открыть задания по согласованию.");}}>Род и согласование</button></div>
          <div className="filter-tabs course-levels">
            {levelList.map((l) => (
              <button
                className={level === l ? "active" : ""}
                key={l}
                onClick={() => {
                  setLevel(l);
                  setActiveUnit(null);
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {mode === "grammar" && <VerbReference notify={notify} launch={launch} revision={installed} />}
          {mode==='courses' && <p className="course-count">{courseCounts(grammarUnits,level).lessons} полных уроков · {courseCounts(grammarUnits,level).tasks} заданий</p>}
          <div className="unit-grid expandable-grid">
            {grammarUnits.filter(u => u.level === level).map(summary => { const u=lessonContent?.id===summary.id?lessonContent:summary; return <Fragment key={u.id}>
              <button className="panel unit-card" aria-expanded={activeUnit === u.id} aria-controls={`lesson-${u.id}`}
                onClick={event => toggleExpansion(event, u.id, activeUnit, setActiveUnit)}>
                <span className="tag">{u.level} · {summary.taskCount ?? summary.tasks.length} заданий</span>
                <h3>{summary.title}</h3><p>{summary.rule}</p>
                <span>{activeUnit === u.id ? 'Свернуть тему' : 'Изучить тему'} <ArrowRight size={16}/></span>
              </button>
              {activeUnit === u.id && <div className="inline-expansion" id={`lesson-${u.id}`}>
            {u.summaryOnly ? <div className="panel lesson-loading" role={lessonError?'alert':'status'}>{lessonError?<><p>Не удалось загрузить урок. Сохранённый прогресс не затронут.</p><button className="btn secondary" onClick={()=>setLessonRetry(n=>n+1)}>Повторить загрузку урока</button></>:<p>Загружаем выбранный урок…</p>}</div> : <article className="panel grammar-unit">
              <button className="text-btn" onClick={event => { const card = event.currentTarget.closest(".inline-expansion")?.previousElementSibling as HTMLElement; if(card) expansionAnchor.current={element:card,top:Math.max(80,card.getBoundingClientRect().top)}; setActiveUnit(null); }}>
                <ArrowLeft size={15} /> К темам
              </button>
              <span className="tag">{u.level}</span>
              <h2>{u.title}</h2>
              <p>{u.rule}</p>
              <h3>Как образуется</h3>
              <p>{u.formation}</p>
              <h3>Отличие от русского и частые ошибки</h3>
              <p>{u.contrast}</p>
              {u.reading && <section className="lesson-reading"><h3>{u.reading.title}</h3><p lang="bg">{u.reading.bg}</p><details><summary>Смысл текста по-русски</summary><p>{u.reading.ru}</p></details><button className="btn secondary" onClick={()=>speak(u.reading!.bg,notify)}>Прослушать текст</button></section>}
              {u.conversation && <section><h3>Диалог по теме</h3>{u.conversation.map((line,i)=><div className="example-box" key={i}><strong>{line.speaker}</strong><p lang="bg">{line.bg}<button className="icon-btn" aria-label="Прослушать реплику" onClick={()=>speak(line.bg,notify)}><Volume2 size={18}/></button></p><small>{line.ru}</small></div>)}</section>}
              {u.examples.map((e) => (
                <div className="example-box" key={e.bg}>
                  <p lang="bg">
                    {e.bg}
                    <button
                      className="icon-btn"
                      onClick={() => speak(e.bg, notify)}
                      aria-label="Прослушать пример"
                    >
                      <Volume2 size={18} />
                    </button>
                  </p>
                  <small>{e.ru}</small>
                </div>
              ))}
              {u.workshop && <Suspense fallback={<p>Открываем письменную практику…</p>}><WritingWorkshop key={u.id} lessonId={u.id} workshop={u.workshop}/></Suspense>}
              <div className="settings-actions">
                <button
                  className="btn secondary"
                  disabled={!!audioProgress}
                  onClick={async () => {
                    try {
                      await cacheAudio(
                        u.examples.map((e) => e.bg),
                        (d, t) => setAudioProgress(`${d}/${t}`),
                      );
                      notify("Аудио урока сохранено для офлайн-практики.");
                    } catch {
                      notify("Не удалось сохранить аудио урока.");
                    } finally {
                      setAudioProgress("");
                    }
                  }}
                >
                  <Download size={16} />
                  {audioProgress
                    ? `Загрузка ${audioProgress}`
                    : "Скачать аудио урока"}
                </button>
                {grammarUnits.slice(0,9).some(candidate=>candidate.id===u.id) && <button className="btn secondary" onClick={async()=>launch(await verbTasks(u.level,18,grammarUnits.findIndex(candidate=>candidate.id===u.id)))}>Новые упражнения по этому времени · разные глаголы</button>}
                <button
                  className="btn primary"
                  onClick={() => launch(u.tasks,mode==='courses'?u.id:undefined)}
                >
                  Закрепить тему · {u.tasks.length} задания{" "}
                  <ArrowRight size={16} />
                </button>
                <button
                  className="btn secondary"
                  onClick={() =>
                    launch(
                      u.examples.map((e, i) => ({
                        id: `unit-dictation-${u.id}-${i}`,
                        type: "dictation",
                        prompt: "Прослушайте пример и запишите его.",
                        bg: e.bg,
                        answers: [e.bg],
                        explanation: e.ru,
                        skill: "Аудирование",
                        level: u.level,
                      })),
                    )
                  }
                >
                  Аудиодиктант по теме <Headphones size={16} />
                </button>
              </div>
              {mode==='courses' && (()=>{const units=grammarUnits.filter(unit=>unit.level===u.level),next=units[units.findIndex(unit=>unit.id===u.id)+1];return next&&<button className="btn secondary next-course-lesson" onClick={()=>openCourseUnit(next)}>Следующий урок: {next.title} <ArrowRight size={16}/></button>;})()}
              <SourceLink
                url={u.source}
                label="Грамматический справочник · примеры составлены для обучения"
              />
            </article>}
              </div>}
            </Fragment>})}
          </div>
          {mode === "courses" && (
            <div className="course-practice-panel panel">
              <h3>Практика по уровню {level}</h3>
              <p>
                Дополните грамматический урок контекстами, аудированием и
                разговором.
              </p>
              <div className="settings-actions">
                <button
                  className="btn secondary"
                  onClick={() => generated("order")}
                >
                  Собрать фразы
                </button>
                <button
                  className="btn secondary"
                  onClick={() => generated("dictation")}
                >
                  Диктант
                </button>
                <button
                  className="btn secondary"
                  onClick={() => generated("dialogue")}
                >
                  Диалоги
                </button>
                <button
                  className="btn secondary"
                  onClick={() => generated("reading")}
                >
                  Чтение
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {mode === "railway" && (
        <>
          <RailAcademy notify={notify} launch={launch}/><RailLessons notify={notify} launch={launch}/>
          <div className="railway-summary">
            <span>
              <strong>{railTerms.length}</strong> технических терминов
            </span>
            <span>
              <strong>
                {dialogues.filter((d) => d.topic === "Железная дорога").length}
              </strong>{" "}
              профессиональных диалогов
            </span>
            <span>
              <strong>{railExamples.length}</strong> контекстных фраз
            </span>
          </div>
          <div className="info-banner">
            <TrainFront size={23} />
            <span>
              Серия 07 — дизель-электрические локомотивы. Серии 43, 44, 45 и 46
              — отдельные серии электровозов; учебная терминология не подменяет
              техническую документацию конкретной машины.
            </span>
            <a
              className="text-btn"
              href={railSources.series07}
              target="_blank"
              rel="noreferrer"
            >
              Материал БДЖ <ExternalLink size={15} />
            </a>
          </div>
          <div className="filter-tabs">
            {["all", ...themeTopics].map((t) => (
              <button
                className={topic === t ? "active" : ""}
                key={t}
                onClick={() => setTopic(t)}
              >
                {t === "all" ? "Все темы" : t}
              </button>
            ))}
          </div>
          <div className="library-search">
            <Search size={18} />
            <input
              aria-label="Поиск технических терминов"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Термин, узел или русское значение…"
            />
          </div>
          <div className="rail-vocab">
            {filteredRail.slice(offset, offset + 48)
              .map((t) => (
                <div className="panel vocab-row" key={t.id}>
                  <span>
                    <strong lang="bg">{t.bg}</strong>
                    <small>{t.ru}</small>{railReviewReason(t)&&<small role="note">На проверке: {railReviewReason(t)}</small>}
                    <a
                      className="term-source"
                      href={t.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Справочный документ <ExternalLink size={10} />
                    </a>
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => speak(t.bg, notify)}
                    aria-label={`Произнести ${t.bg}`}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              ))}
          </div>
          <div className="pagination"><button className="btn secondary" disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-48))}>Назад</button><span>{offset+1}–{Math.min(offset+48,filteredRail.length)} из {filteredRail.length}</span><button className="btn secondary" disabled={offset+48>=filteredRail.length} onClick={()=>setOffset(n=>n+48)}>Дальше</button></div>
          <p className="editorial-note">Русские переводы — учебная редакция. Ссылки ведут к справочным документам и словарным источникам. Термины не являются инструкциями по эксплуатации.</p>
          <div className="settings-actions">
            <button
              className="btn primary"
              onClick={() => generated("technical")}
            >
              Техническое испытание <ArrowRight size={17} />
            </button>
            <button
              className="btn secondary"
              onClick={() =>
                launch(
                  railExamples.map((e, i) => ({
                    id: `rail-context-${i}`,
                    type: "dictation",
                    prompt: "Запишите услышанное техническое предложение.",
                    bg: e[0],
                    answers: [e[0]],
                    explanation: e[1],
                    skill: "Профессиональное аудирование",
                    level: "B2",
                  })),
                )
              }
            >
              Профессиональный диктант
            </button>
          </div>
          <div className="unit-grid expandable-grid">
            {dialogues.filter(d => d.topic === "Железная дорога").map(d => <Fragment key={d.id}>
              <button className="panel unit-card" aria-expanded={dialogue === d.id}
                onClick={event => {stopSpeech(); toggleExpansion(event, d.id, dialogue, setDialogue);}}>
                <span className="tag">{d.level}</span><h3>{d.title}</h3><p>{d.lines.length} реплик с переводом и озвучиванием</p>
                <span>Открыть разговор <Mic size={16}/></span>
              </button>
              {dialogue === d.id && <div className="inline-expansion"><DialogueView d={d} notify={notify} launch={launch}
                showTranslations={showTranslations} setShowTranslations={setShowTranslations}/></div>}
            </Fragment>)}
          </div>
          <details className="panel technical-examples">
            <summary>Технические формулировки · {railExamples.length}</summary>
            {railExamples.map((e) => (
              <div className="example-box" key={e[0]}>
                <p lang="bg">
                  {e[0]}
                  <button
                    className="icon-btn"
                    onClick={() => speak(e[0], notify)}
                    aria-label="Озвучить техническую фразу"
                  >
                    <Volume2 size={17} />
                  </button>
                </p>
                <small>{e[1]}</small>
              </div>
            ))}
          </details>
        </>
      )}
      {mode === "dialogues" && (
        <>
          <div className="filter-tabs course-levels">
            {levelList.map((l) => (
              <button
                key={l}
                className={level === l ? "active" : ""}
                onClick={() => {
                  setLevel(l);
                  setDialogue(null);
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="unit-grid expandable-grid">
            {dialogues.filter(d => d.level === level).map(d => <Fragment key={d.id}>
              <button className="panel unit-card" aria-expanded={dialogue === d.id}
                onClick={event => {stopSpeech(); toggleExpansion(event, d.id, dialogue, setDialogue);}}>
                <span className="tag">{d.topic} · {d.level}</span><h3>{d.title}</h3>
                <p>{d.lines[0].bg}</p><span>{d.lines.length} реплик <ArrowRight size={15}/></span>
              </button>
              {dialogue === d.id && <div className="inline-expansion"><DialogueView d={d} notify={notify} launch={launch}
                showTranslations={showTranslations} setShowTranslations={setShowTranslations}/></div>}
            </Fragment>)}
          </div>
        </>
      )}
      {mode === "listening" && (
        <>
          <div className="review-banner">
            <div>
              <span className="icon-tile purple">
                <Headphones size={25} />
              </span>
              <h2>
                {catalog?.counts.sentences ?? "…"} контекста для слуха
                <small>
                  Локальные синтезированные аудиофайлы Piper · болгарский голос
                  Dimitar
                </small>
              </h2>
            </div>
            <button
              className="btn primary"
              onClick={() => generated("dictation")}
            >
              Аудиодиктант <ArrowRight size={16} />
            </button>
          </div>
          <div className="settings-actions">
            <button className="btn secondary" disabled={!profile.mistakes?.length} onClick={()=>launch(profile.mistakes ?? [])}>Повторить мои ошибки · {profile.mistakes?.length ?? 0}</button>
            <button className="btn secondary" onClick={async()=>{
              const rows=await contentDB.lexemes.bulkGet(profile.difficultWords ?? []);
              const tasks:Task[]=rows.filter((w):w is Lexeme=>!!w).map(w=>({id:'hard-word-'+w.id,type:'spelling',prompt:`Вспомните по-болгарски: ${w.ru}`,answers:[w.bg],wordId:w.id,explanation:w.grammar,source:w.source,skill:'Активное воспроизведение',level}));
              if(!tasks.length){notify("Добавьте слова в сложные через карточку словаря.");return;}await launch(shuffle(tasks));
            }}>Мои сложные слова · {profile.difficultWords?.length ?? 0}</button>
          </div>
          <div className="mechanic-grid">
            {mechanics
              .filter((m) =>
                ["dictation", "listen-choice", "multi", "speaking"].includes(
                  m.id,
                ),
              )
              .map((m) => (
                <button
                  className="panel mechanic-card"
                  key={m.id}
                  onClick={() => generated(m.id)}
                >
                  <Headphones size={22} />
                  <h3>{m.name}</h3>
                  <p>{m.description}</p>
                  <span>
                    Практиковаться <ArrowRight size={15} />
                  </span>
                </button>
              ))}
          </div>
          <div className="settings-actions">
            <button
              className="btn secondary"
              disabled={!!audioProgress}
              onClick={async () => {
                try {
                  const rows = await contentDB.sentences
                    .orderBy("words")
                    .limit(100)
                    .toArray();
                  await cacheAudio(
                    rows.map((s) => s.bg),
                    (d, t) => setAudioProgress(`${d}/${t}`),
                  );
                  notify("100 аудиофраз сохранены для офлайн-практики.");
                } catch (e) {
                  notify(
                    e instanceof Error ? e.message : "Аудиозагрузка прервана.",
                  );
                } finally {
                  setAudioProgress("");
                }
              }}
            >
              <Download size={17} />{" "}
              {audioProgress
                ? `Загрузка ${audioProgress}`
                : "Скачать первые 100 аудиофраз"}
            </button>
          </div>
          <p className="editorial-note">
            Это синтезированная болгарская речь, а не записи диктора.
            Проигрывание не является проверкой ударения. Голосовой ответ
            проверяется по распознанному тексту.
          </p>
        </>
      )}
      {mode === "plan" && (
        <AdaptivePlan
          profile={profile}
          level={level}
          notify={notify}
          launch={launch}
        />
      )}
      {practice && (
        <PracticePlayer
          key={practice.startedAt}
          initial={practice}
          onNextLesson={mode==='courses' && practice.courseUnitId ? (()=>{
            const current=grammarUnits.find(unit=>unit.id===practice.courseUnitId);
            const units=grammarUnits.filter(unit=>unit.level===current?.level);
            const next=units[units.findIndex(unit=>unit.id===practice.courseUnitId)+1];
            return next?()=>openCourseUnit(next):undefined;
          })():undefined}
          notify={notify}
          onSaved={refresh}
          onClose={() => {
            setPractice(null);
            refresh();
          }}
        />
      )}
    </section></Suspense>
  );
}
function SourceLink({ url, label }: { url: string; label: string }) {
  return (
    <a className="task-attribution" href={url} target="_blank" rel="noreferrer">
      {label} <ExternalLink size={12} />
    </a>
  );
}
function SentenceCard({
  s,
  notify,
  onTask,
}: {
  s: Sentence;
  notify: (s: string) => void;
  onTask: () => void;
}) {
  return (
    <article className="panel sentence-card">
      <p lang="bg">
        {s.bg}
        <button
          className="icon-btn"
          onClick={() => speak(s.bg, notify)}
          aria-label="Прослушать предложение"
        >
          <Volume2 size={18} />
        </button>
      </p>
      <p>{s.ru}</p>
      {s.difficulty && <small className="tag">{s.difficulty} · оценка по длине</small>}
      {s.grammar && <small className="editorial-note">{s.grammar}</small>}
      <div className="sentence-actions">
        {sentenceReviewReason(s) && <p role="note">{sentenceReviewReason(s)}</p>}
        <button className="text-btn" disabled={!!sentenceReviewReason(s)} onClick={onTask}>
          Диктант <Headphones size={14} />
        </button>
        <SourceLink url={s.source} label={`${s.author} · ${s.id.startsWith("tatoeba-") ? "Tatoeba" : s.id.startsWith("flores200-") ? "FLORES-200" : s.id.startsWith("academy-") ? "Учебный материал" : "Викисловарь"}`} />
      </div>
      <small className="sentence-attribution">
        {s.translations.length ? `Перевод: ${s.translations.map((x) => x.author).join(", ")} · ` : ""}{s.license}
      </small>
    </article>
  );
}
function DialogueView({
  d,
  notify,
  launch,
  showTranslations,
  setShowTranslations,
}: {
  d: Dialogue;
  notify: (s: string) => void;
  launch: (t: Task[]) => void;
  showTranslations: boolean;
  setShowTranslations: (b: boolean) => void;
}) {
  const [speed, setSpeed] = useState(0.85),
    [currentLine, setCurrentLine] = useState(-1);
  useEffect(
    () => () => {
      stopSpeech();
      setCurrentLine(-1);
    },
    [d.id],
  );
  return (
    <article className="panel dialogue-view">
      <div className="section-title">
        <div>
          <h2>{d.title}</h2>
          <p>
            {d.level} · {d.topic}
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={showTranslations}
            onChange={(e) => setShowTranslations(e.target.checked)}
          />{" "}
          Перевод
        </label>
      </div>
      <div className="dialogue-speed">
        <button
          className="text-btn"
          onClick={() =>
            currentLine >= 0
              ? stopSpeech()
              : speakSequence(
                  d.lines.map((l) => l.bg),
                  notify,
                  speed,
                  setCurrentLine,
                )
          }
        >
          {currentLine >= 0 ? "Остановить диалог" : "Прослушать диалог"}{" "}
          <Play size={15} />
        </button>
        <label>
          Скорость{" "}
          <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
            <option value={0.65}>Медленно</option>
            <option value={0.85}>Обычно</option>
            <option value={1}>Быстрее</option>
          </select>
        </label>
      </div>
      {d.lines.map((l, i) => (
        <div
          className={`dialogue-bubble ${i % 2 ? "alternate" : ""} ${currentLine === i ? "is-speaking" : ""}`}
          key={i}
        >
          <span>{l.speaker}</span>
          <p lang="bg">
            {l.bg}
            <button
              className="icon-btn"
              onClick={() => speak(l.bg, notify, speed)}
              aria-label={`Прослушать реплику ${i + 1}`}
            >
              <Volume2 size={18} />
            </button>
          </p>
          {showTranslations && <small>{l.ru}</small>}
        </div>
      ))}
      <div className="settings-actions">
        <button
          className="btn primary"
          onClick={() =>
            launch([
              {
                id: "response-" + d.id,
                type: "dialogue",
                prompt: d.question,
                answers: [d.answer, ...d.alternatives],
                explanation:
                  d.lines.find((l) => l.bg === d.answer)?.ru ??
                  "Реплика из диалога.",
                skill: "Диалоги",
                level: d.level,
              },
            ])
          }
        >
          Ответить по памяти <ArrowRight size={16} />
        </button>
        <button
          className="btn secondary"
          onClick={() =>
            launch(
              d.lines
                .filter((_, i) => i % 2 === 1)
                .map((l, i) => ({
                  id: `speak-${d.id}-${i}`,
                  type: "speaking",
                  prompt: `Произнесите реплику: ${l.ru}`,
                  bg: l.bg,
                  answers: [l.bg],
                  explanation: l.ru,
                  skill: "Голосовой диалог",
                  level: d.level,
                })),
            )
          }
        >
          <Mic size={16} /> Моя роль в разговоре
        </button>
        <button
          className="btn secondary"
          onClick={async () => {
            try {
              await cacheAudio(
                d.lines.map((l) => l.bg),
                () => {},
              );
              notify("Аудио диалога сохранено на устройстве.");
            } catch {
              notify("Не удалось скачать аудио диалога.");
            }
          }}
        >
          <Download size={16} /> Скачать аудио
        </button>
      </div>
      {d.topic === "Железная дорога" && (
        <p className="editorial-note">
          Авторский учебный разговор о профессиональной теме. Реплики не
          являются утверждённым регламентом радиосвязи, приказом или инструкцией
          безопасности.
        </p>
      )}
    </article>
  );
}
function AdaptivePlan({
  profile,
  level,
  notify,
  launch,
}: {
  profile: Profile;
  level: Level;
  notify: (s: string) => void;
  launch: (t: Task[]) => void;
}) {
  const {data:{grammarUnits}}=useHubData("plan");
  const [day, setDay] = useState(
      Math.min(
        30,
        Math.max(
          1,
          Math.floor((Date.now() - profile.startedAt) / 86400000) + 1,
        ),
      ),
    ),
    [weak, setWeak] = useState(""),
    [recommended, setRecommended] = useState<Level>(level),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    db.attempts
      .orderBy("at")
      .reverse()
      .limit(300)
      .toArray()
      .then((rows) => {
        setRecommended(practiceLevel(level,rows));
        const groups = new Map<string, { n: number; bad: number }>();
        rows.forEach((r) => {
          const g = groups.get(r.skill) ?? { n: 0, bad: 0 };
          g.n++;
          if (!r.correct) g.bad++;
          groups.set(r.skill, g);
        });
        setWeak(
          [...groups]
            .filter(([, g]) => g.n >= 2)
            .sort((a, b) => b[1].bad / b[1].n - a[1].bad / a[1].n)[0]?.[0] ??
            "Словарный запас",
        );
      });
  }, [level]);
  async function start() {
    setBusy(true);
    try {
      const isDiagnostic = day % 7 === 0;
      const tasks: Task[] = [];
      const units = grammarUnits.filter((u) => u.level === level);
      if (units.length) tasks.push(...units[(day - 1) % units.length].tasks);
      tasks.push(
        ...(await generateTasks(
          "order",
          level,
          Math.max(2, Math.floor(profile.minutes / 20)),
        )),
      );
      tasks.push(...(await generateTasks("dictation", level, 3)));
      tasks.push(
        ...(await generateTasks(day % 2 ? "technical" : "dialogue", level, 2)),
      );
      if (weak.includes("Ауд") || weak.includes("слуш"))
        tasks.push(...(await generateTasks("listen-choice", level, 3)));
      else tasks.push(...(await generateTasks("meaning", level, 3)));
      if (isDiagnostic)
        tasks.push(
          ...shuffle(
            grammarUnits
              .filter((u) => u.level === level)
              .flatMap((u) => u.tasks),
          ).slice(0, 5),
        );
      if (recommended !== level) tasks.push(...await generateTasks("order", recommended, 2));
      const mistakes = (await db.settings.get("profile"))?.mistakes ?? [];
      tasks.unshift(...mistakes.slice(0,3));
      await launch(await adaptTasks(tasks));
    } catch {
      notify("Не удалось собрать дневной маршрут. Проверьте загрузку пакетов.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel adaptive-plan">
      <div className="section-title">
        <div>
          <h2>
            День {day}:{" "}
            {day % 7 === 0 ? "недельная диагностика" : "учимся в своём темпе"}
          </h2>
          <p>
            {level} · цель {profile.minutes} минут · фокус: {weak}
          </p>
        </div>
        <span className="icon-tile mint">
          <Target size={24} />
        </span>
      </div>
      <p className="editorial-note">{recommended !== level ? `По последним ответам добавлены два задания уровня ${recommended} для ${levelList.indexOf(recommended) > levelList.indexOf(level) ? "усложнения практики" : "закрепления основ"}. Уровень профиля сохраняется.` : "Сложность сохраняется; для адаптации используется до 40 последних ответов, минимум 20."}</p>
      <div className="adaptive-days">
        {Array.from({ length: 30 }, (_, i) => (
          <button
            className={day === i + 1 ? "active" : ""}
            onClick={() => setDay(i + 1)}
            key={i}
          >
            {i + 1}
            {(i + 1) % 7 === 0 && <span>✦</span>}
          </button>
        ))}
      </div>
      <p>
        Грамматическая тема меняется по дням, контексты выбираются заново.
        Ошибки последних занятий влияют на дополнительную практику. Время — ваша
        цель; длительность заданий зависит от темпа ответов.
      </p>
      <button className="btn primary" disabled={busy} onClick={start}>
        {busy ? "Собираем маршрут…" : "Открыть задания дня"}
        <ArrowRight size={17} />
      </button>
    </div>
  );
}
