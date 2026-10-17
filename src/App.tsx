import {useEconomyEffects} from "./effects";
import {beginNavigation,finishNavigation} from "./performance-metrics";
import { PerformancePanel } from "./performance";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  FlaskConical,
  Mic,
  Headphones,
  TrainFront,
  Zap,
  ChartNoAxesCombined,
  Settings,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Flame,
  Target,
  Clock,
  Check,
  CheckCheck,
  X,
  Volume2,
  Search,
  Bell,
  Menu,
  Download,
  CloudOff,
  Sparkles,
  Play,
  RotateCcw,
  Plus,
  MoveUpRight,
  CalendarDays,
  ShieldCheck,
  ExternalLink,
  Info,
  WifiOff,
  FileDown,
  Upload,
  CheckCircle2,
  Lightbulb,
  GraduationCap,
  AudioLines,
  Pause,
  type LucideIcon,
} from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { Rating, type Grade } from "ts-fsrs";
import {
  levels,
  words,
  exercises,
  sources,
  type Level,
} from "./content";
import {
  db,
  defaultSettings,
  reviewWord,
  checkAnswer,
  shuffle,
  localDay,
  streak,
  exportProgress,
  importProgress,
  type Settings as Profile,
  type Attempt,
  type Memory,
  type Session,
} from "./storage";
import { speak, stopSpeech } from "./speech";
import { ReactiveKeyboard } from "./ReactiveKeyboard";
import { Atmosphere, AudioDock } from "./Atmosphere";
import contentManifest from "../public/content/manifest.json";
import type { HubMode } from "./ContentHub";
const CorpusCards = lazy(() => import("./CorpusCards"));
const ExtendedContent = lazy(() => import("./ContentHub"));
import assets from "./assets.json";
const ListeningLab = lazy(() => import("./ListeningLab").then(m=>({default:m.ListeningLab})));
const VoiceLab = lazy(() => import("./VoiceLab").then(m=>({default:m.VoiceLab})));
type Page =
  | "library"
  | "practice"
  | "dialogues"
  | "home"
  | "academy"
  | "cards"
  | "grammar"
  | "voice"
  | "listen"
  | "railway"
  | "boost"
  | "progress"
  | "settings";
const nav: { id: Page; label: string; icon: LucideIcon; extra?: string }[] = [
  { id: "home", label: "Главная", icon: LayoutDashboard },
  { id: "academy", label: "Академия A1–C2", icon: BookOpen },
  { id: "cards", label: "Умные карточки", icon: Layers },
  { id: "library", label: "Большая библиотека", icon: Search },
  { id: "practice", label: "25 тренажёров", icon: Target },
  { id: "dialogues", label: "Разговорная мастерская", icon: Mic },
  { id: "grammar", label: "Грамматическая лаборатория", icon: FlaskConical },
  { id: "voice", label: "Голосовой тренажёр", icon: Mic },
  { id: "listen", label: "Аудирование", icon: Headphones },
  { id: "railway", label: "Railway Academy", icon: TrainFront, extra: "PRO" },
  { id: "boost", label: "Интенсив 30 дней", icon: Zap },
  { id: "progress", label: "Мой прогресс", icon: ChartNoAxesCombined },
];
const fade = {
  initial: { opacity: 0, y: 24, rotateX: 3, scale: .985 },
  animate: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
  exit: { opacity: 0, y: -16, rotateX: -2, scale: .985 },
  transition: { duration: 0.38 },
};
function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <img src="/icon.svg" alt="" />
      <div>
        <strong>
          CHAMELEON<span> BG</span>
        </strong>
        <small>LANGUAGE ACADEMY</small>
      </div>
    </div>
  );
}
function Chameleon() {
  return (
    <svg
      className="chameleon"
      viewBox="0 0 530 350"
      role="img"
      aria-label="Переливающаяся эмблема хамелеона"
    >
      <defs>
        <linearGradient id="body" x1=".9" y1=".1" x2=".1" y2="1">
          <stop stopColor="#e0ffa0" />
          <stop offset=".35" stopColor="#a9f59a" />
          <stop offset=".65" stopColor="#48cdb1" />
          <stop offset="1" stopColor="#7062bb" />
        </linearGradient>
        <linearGradient id="tail" x1="1" y1="0" x2="0" y2="1">
          <stop stopColor="#75dbbb" />
          <stop offset=".5" stopColor="#69baa5" />
          <stop offset="1" stopColor="#9b76dc" />
        </linearGradient>
        <radialGradient id="eye">
          <stop stopColor="#e4ffbc" />
          <stop offset=".65" stopColor="#8acb76" />
          <stop offset="1" stopColor="#579b6d" />
        </radialGradient>
        <pattern
          id="scales"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="3"
            cy="3"
            r="2.4"
            fill="none"
            stroke="#15362c"
            strokeOpacity=".19"
          />
          <circle
            cx="9"
            cy="9"
            r="2.4"
            fill="none"
            stroke="#e6ffb3"
            strokeOpacity=".23"
          />
        </pattern>
        <filter id="shadow">
          <feDropShadow
            dx="0"
            dy="15"
            stdDeviation="13"
            floodColor="#000"
            floodOpacity=".35"
          />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path
          d="M281 188C236 187 210 224 220 259c13 46 79 56 111 22 27-29 2-68-26-57-24 9-14 40 5 31"
          fill="none"
          stroke="url(#tail)"
          strokeWidth="23"
          strokeLinecap="round"
        />
        <path
          d="M241 160C211 145 172 145 151 174c-24 34 6 69 22 74l24-2-12-13c-18-18-19-35 2-42l49 10"
          fill="url(#body)"
        />
        <path
          d="m214 190-14 52 39 15 17-9-30-18 22-35m92-33 20 50 41 9 12-11-31-13-12-43"
          fill="url(#body)"
        />
        <path
          d="M194 158c29-55 90-81 149-73 49 7 65 30 73 45 17 2 34 9 44 19-20 18-40 23-65 21-40 38-80 53-130 39-39-11-51-29-71-51Z"
          fill="url(#body)"
        />
        <path
          d="M194 158c29-55 90-81 149-73 49 7 65 30 73 45 17 2 34 9 44 19-20 18-40 23-65 21-40 38-80 53-130 39-39-11-51-29-71-51Z"
          fill="url(#scales)"
        />
        <path
          d="m211 133 0-15 13 4 4-17 13 3 9-16 12 5 12-15 11 6 14-13 11 8 17-9 8 12 18-6 6 13"
          fill="#c4ef97"
        />
        <path d="m353 90 22-36 13 45" fill="#b4e494" />
        <ellipse cx="389" cy="126" rx="21" ry="23" fill="url(#eye)" />
        <circle cx="394" cy="126" r="9" fill="#1e3332" />
        <circle cx="397" cy="123" r="2.5" fill="#efffcf" />
        <path
          d="M416 151q18 4 35-2"
          fill="none"
          stroke="#3c7052"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="m173 248-14 5m35-8-4 10m48 2 10 3m-11-5-3 8m167-46 13-2m-14 5 9 6"
          stroke="#80bc9c"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M100 271c88-8 195-8 335-12"
        fill="none"
        stroke="#596a55"
        strokeWidth="6"
        strokeLinecap="round"
        opacity=".5"
      />
    </svg>
  );
}
function App() {
  const [courseStart,setCourseStart]=useState<{level:Level;request:number}>();
  const economy = useEconomyEffects();
  const [page, setPage] = useState<Page>("home"),
    [profile, setProfile] = useState<Profile>(defaultSettings),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [attempts, setAttempts] = useState<Attempt[]>([]),
    [memory, setMemory] = useState<Memory[]>([]),
    [savedSession, setSavedSession] = useState<Session | undefined>(),
    [session, setSession] = useState<Session | null>(null),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [libraryQuery, setLibraryQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState<
      "onboarding" | "diagnostic" | "notifications" | "sources" | null
    >(null),
    [online, setOnline] = useState(navigator.onLine),
    [install, setInstall] = useState<any>(null),
    [update, setUpdate] = useState<null | (() => Promise<void>)>(null);
  const refresh = useCallback(async () => {
    const [attemptRows,memoryRows,saved]=await Promise.all([db.attempts.toArray(),db.memory.toArray().then(rows=>rows.map(row=>({...row,history:[]}))),db.sessions.get("active")]);
    setAttempts(attemptRows);setMemory(memoryRows);setSavedSession(saved);
  },[]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await db.settings.get("profile");
        if (!p) await db.settings.put(defaultSettings);
        if (alive) {
          setProfile(p ?? defaultSettings);
          await refresh();
          setReady(true);
        }
      } catch {
        if (alive)
          setError(
            "Не удалось открыть локальное хранилище. Разрешите браузеру сохранять данные и перезагрузите страницу.",
          );
      }
    })();
    const off = () => setOnline(navigator.onLine);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("online", off);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", prompt);
    const updater = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => updater(true));
      },
    });
    return () => {
      alive = false;
      window.removeEventListener("online", off);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  useEffect(() => {
    if (ready && ["home","progress","cards","boost"].includes(page)) refresh().catch(() => notify("Не удалось обновить статистику."));
  }, [page, ready]);
  useEffect(() => {
    if ("speechSynthesis" in window) speechSynthesis.getVoices();
    return () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const notify = useCallback((text: string) => setToast(text),[]);
  const saveProfile = async (p: Profile) => {
    try {
      await db.settings.put(p);
      setProfile(p);
    } catch {
      notify("Настройки не сохранены. Проверьте доступ к хранилищу.");
    }
  };
  const go = (p: Page) => {
    if(p!=="academy")setCourseStart(undefined);
    stopSpeech();
    beginNavigation(p);
    setPage(p);
    setMenu(false);
    setQuery("");
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(()=>{let second=0;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>finishNavigation(page));});return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};},[page]);
  const dayKey=localDay(Date.now());
  const today=useMemo(()=>attempts.filter(a=>localDay(a.at)===dayKey),[attempts,dayKey]);
  const currentStreak=useMemo(()=>streak(attempts),[attempts]);
  const todayMinutes = Math.round(
    today.reduce((s, a) => s + a.duration, 0) / 60000,
  );
  const dailyProgress = Math.min(
    100,
    Math.round((todayMinutes / profile.minutes) * 100),
  );
  const learned=useMemo(()=>new Set(
    memory
      .filter((m) => m.card.reps >= 2 && m.card.stability >= 1)
      .map((m) => m.wordId),
  ).size,[memory]);
  const due=useMemo(()=>words.filter(
    (w) =>
      !memory.find((m) => m.wordId === w.id && m.skill === "recognition") ||
      memory.some((m) => m.wordId === w.id && m.card.due <= new Date()),
  ).length,[memory]);
  const currentLevel = levels.find((l) => l.id === profile.level)!;
  async function startLesson(
    level: Level = profile.level,
    mode = "lesson",
    ids?: string[],
  ) {
    if (mode === "lesson" && !ids) {
      if(level!==profile.level)await saveProfile({...profile,level});
      if (page !== "academy") go("academy");
      setCourseStart(previous=>({level,request:(previous?.request??0)+1}));
      return;
    }
    const pool =
      ids ??
      shuffle(exercises.filter((e) => e.level === level)).map((e) => e.id);
    const s: Session = {
      id: "active",
      exerciseIds: pool,
      index: 0,
      correct: 0,
      mode,
    };
    try {
      await db.sessions.put(s);
      setSavedSession(s);
      setSession(s);
    } catch {
      notify(
        "Не удалось сохранить начало урока. Проверьте доступ к хранилищу.",
      );
    }
  }
  function startDiagnostic() {
    setModal(null);
    startLesson(
      profile.level,
      "diagnostic",
      levels.flatMap((l) =>
        exercises
          .filter((e) => e.level === l.id)
          .slice(0, 2)
          .map((e) => e.id),
      ),
    );
  }
  const searchItems = [
    ...nav
      .filter((n) => n.id !== "home")
      .map((n) => ({ label: n.label, detail: "Раздел академии", page: n.id })),
    ...words.map((w) => ({
      label: w.bg,
      detail: w.ru,
      page: (w.rail ? "railway" : "cards") as Page,
    })),
  ]
    .filter((x) =>
      (x.label + " " + x.detail).toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 7);
  const extension = (mode: HubMode) => (
    <Suspense
      fallback={<p className="content-loading">Открываем учебные материалы…</p>}
    >
      <ExtendedContent
        mode={mode}
        initialQuery={mode === "library" ? libraryQuery : undefined}
        profile={profile}
        notify={notify}
        onRefresh={refresh}
        courseStart={mode === "courses" ? courseStart : undefined}
      />
    </Suspense>
  );
  return (
    <MotionConfig reducedMotion={profile.reducedMotion || economy ? "always" : "user"}>
      <div className={`app${profile.reducedMotion ? " reduce-motion" : ""}${economy ? " economy" : ""}`}>
        <Atmosphere reduced={profile.reducedMotion} />
        <AudioDock reduced={profile.reducedMotion} />
        <a href="#main" className="skip">
          Перейти к содержимому
        </a>
        {menu && (
          <button
            className="sidebar-overlay"
            aria-label="Закрыть меню"
            onClick={() => setMenu(false)}
          />
        )}
        <aside className={`sidebar ${menu ? "open" : ""}`}>
          <Brand />
          <div className="workspace-label">ВАШЕ ПРОСТРАНСТВО</div>
          <nav aria-label="Основная навигация">
            {nav.map((n) => (
              <button
                key={n.id}
                className={`nav-item ${page === n.id ? "active" : ""} ${n.id === "railway" ? "rail-nav" : ""}`}
                onClick={() => go(n.id)}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                {n.extra && <b>{n.extra}</b>}
                {page === n.id && <i />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-boost">
              <div className="boost-stars">
                ✦ <span>✧</span>
              </div>
              <span className="eyebrow">
                МАЛЕНЬКИЕ ШАГИ. БОЛЬШОЙ РЕЗУЛЬТАТ.
              </span>
              <strong>
                Твой следующий уровень
                <br />
                начинается сегодня.
              </strong>
              <button onClick={() => go("boost")}>
                Мой план на 30 дней <ArrowUpRight size={15} />
              </button>
            </div>
            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              onClick={() => go("settings")}
            >
              <Settings size={19} />
              <span>Настройки</span>
            </button>
            <div className="local-status">
              <span className={online ? "status-dot" : "status-dot offline"} />
              {online
                ? "Прогресс хранится на устройстве"
                : "Вы работаете офлайн"}
              <ShieldCheck size={13} />
            </div>
            <button className="profile-button" onClick={() => go("settings")}>
              <span className="avatar">
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>
                  {profile.name === "Друг" ? "Ваш профиль" : profile.name}
                </strong>
                <small>Личное пространство</small>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-btn mobile-menu"
                onClick={() => setMenu(true)}
                aria-label="Открыть меню"
              >
                <Menu size={22} />
              </button>
              <span>Моя академия</span>
              <ChevronRight size={14} />
              <strong>
                {nav.find((n) => n.id === page)?.label ?? "Настройки"}
              </strong>
            </div>
            <div className="topbar-actions">
              <div className="search-wrap">
                <Search size={16} />
                <input
                  aria-label="Поиск по академии"
                  placeholder="Найти в академии…"
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>⌕</kbd>
                {searchOpen && (
                  <div className="search-results">
                    <div className="search-heading">
                      {query ? "Результаты поиска" : "Быстрый переход"}
                      <button
                        onClick={() => setSearchOpen(false)}
                        aria-label="Закрыть поиск"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {searchItems.map((s, i) => (
                      <button key={i} onClick={() => go(s.page)}>
                        <span>
                          {s.label}
                          <small>{s.detail}</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                    {query.trim().length > 1 && (
                      <button
                        onClick={() => {
                          setLibraryQuery(query.trim());
                          go("library");
                        }}
                      >
                        <span>
                          Искать «{query.trim()}»
                          <small>
                            В большой библиотеке ·{" "}
                            {contentManifest.counts.words.toLocaleString("ru")}{" "}
                            записей
                          </small>
                        </span>
                        <Search size={15} />
                      </button>
                    )}
                    {!searchItems.length && (
                      <p>Ничего не найдено. Попробуйте «влак».</p>
                    )}
                  </div>
                )}
              </div>
              <div className="language-chip">
                <span className="bg-flag" /> BG{" "}
                <span className="muted">/ RU</span>
              </div>
              <button
                className="icon-btn notification-btn"
                onClick={() => setModal("notifications")}
                aria-label="Уведомления"
              >
                <Bell size={19} />
                <i />
              </button>
              <button
                className="top-avatar"
                onClick={() => go("settings")}
                aria-label="Открыть профиль"
              >
                {profile.name.slice(0, 1).toUpperCase()}
              </button>
            </div>
          </header>
          {!online && (
            <div className="connection-banner">
              <WifiOff size={15} /> Офлайн-режим · загруженные уроки и прогресс
              доступны на устройстве
            </div>
          )}
          {update && (
            <div className="connection-banner">
              Доступно обновление приложения.
              <button onClick={() => update()}>Обновить сейчас</button>
            </div>
          )}
          <main id="main" tabIndex={-1}>
            {error ? (
              <div className="empty-state">
                <CloudOff />
                <h2>Хранилище недоступно</h2>
                <p>{error}</p>
              </div>
            ) : !ready ? (
              <div className="loading">
                <img src="/icon.svg" alt="" />
                Готовим вашу академию…
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={page} {...(economy ? {initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.12}} : fade)}>
                  {page === "home" && (
                    <>
                      <div className="page-heading">
                        <div>
                          <div className="eyebrow greeting">
                            ВАШ ПУТЬ К СВОБОДНОМУ БОЛГАРСКОМУ
                          </div>
                          <h1>
                            Здравей
                            {profile.name === "Друг" ? "" : `, ${profile.name}`}
                            ! <span className="wave">✺</span>
                          </h1>
                          <p>Новый день — ещё одна возможность стать лучше.</p>
                        </div>
                        <button
                          className="date-pill"
                          onClick={() => go("boost")}
                        >
                          <CalendarDays size={16} />
                          {new Intl.DateTimeFormat("ru", {
                            day: "numeric",
                            month: "long",
                            weekday: "short",
                            timeZone: "Europe/Sofia",
                          }).format(new Date())}
                        </button>
                      </div>
                      <section
                        className="hero"
                        onPointerMove={(e) => {
                          if (profile.reducedMotion) return;
                          const r = e.currentTarget.getBoundingClientRect();
                          e.currentTarget.style.setProperty(
                            "--pointer-x",
                            `${((e.clientX - r.left) / r.width) * 100}%`,
                          );
                          e.currentTarget.style.setProperty(
                            "--pointer-y",
                            `${((e.clientY - r.top) / r.height) * 100}%`,
                          );
                        }}
                      >
                        <div className="hero-grid" />
                        <div className="hero-orb" />
                        <div className="hero-content">
                          <span className="hero-tag">
                            <span /> АДАПТИРУЕТСЯ К ТЕБЕ. РАСТЁТ ВМЕСТЕ С ТОБОЙ.
                          </span>
                          <h2>
                            Меняй оттенки.
                            <br />
                            Расширяй <span>возможности.</span>
                          </h2>
                          <p>
                            От первого «здравей» до уверенного разговора.
                            <br />
                            Твой болгарский. Твой ритм. Твоё будущее.
                          </p>
                          <div className="hero-buttons">
                            <button
                              className="btn primary"
                              onClick={() =>
                                !profile.onboarded
                                    ? setModal("onboarding")
                                    : startLesson()
                              }
                            >
                              <Play size={15} fill="currentColor" />
                              Начать обучение
                              <ArrowRight size={17} />
                            </button>
                            {savedSession && <button className="hero-link hero-resume" onClick={()=>setSession(savedSession)}>Продолжить сохранённое вводное занятие</button>}
                            <button
                              className="hero-link"
                              onClick={() => setModal("diagnostic")}
                            >
                              Узнать свой уровень <ArrowUpRight size={16} />
                            </button>
                          </div>
                          <div className="hero-caption">
                            <span className="tiny-flag" /> LEARN BULGARIAN.
                            MASTER YOUR FUTURE.
                          </div>
                        </div>
                        <div className="hero-art">
                          <div className="orbit orbit-one" />
                          <div className="orbit orbit-two" />
                          <span className="orbit-point point-one" />
                          <span className="orbit-point point-two" />
                          <span className="art-star star-one">✧</span>
                          <span className="art-star star-two">✦</span>
                          <Chameleon />
                          <span className="art-label">
                            <span /> EVOLVE EVERY DAY
                          </span>
                          <span className="art-coordinate">
                            42.6977° N · 23.3219° E
                          </span>
                        </div>
                      </section>
                      <div className="stats-grid">
                        <Stat
                          icon={Flame}
                          color="orange"
                          label="Серия занятий"
                          value={String(currentStreak)}
                          unit="дней"
                          note={
                            attempts.length
                              ? "Возвращайтесь каждый день"
                              : "Начните свою первую серию"
                          }
                          mini="flame"
                        />
                        <Stat
                          icon={BookOpen}
                          color="mint"
                          label="В вашем словаре"
                          value={String(learned)}
                          unit="слов"
                          note={`${contentManifest.counts.words.toLocaleString("ru")} статей в библиотеке`}
                          mini="bars"
                        />
                        <Stat
                          icon={GraduationCap}
                          color="purple"
                          label="Выбранный уровень"
                          value={profile.level}
                          unit={currentLevel.name}
                          note="Свободный переход между уровнями"
                          mini="level"
                        />
                        <Stat
                          icon={Clock}
                          color="blue"
                          label="Время сегодня"
                          value={String(todayMinutes)}
                          unit={`/ ${profile.minutes} мин`}
                          note={
                            todayMinutes
                              ? "Отличное начало. Продолжайте!"
                              : "Каждая минута имеет значение"
                          }
                          mini="clock"
                        />
                      </div>
                      <div className="dashboard-columns">
                        <div className="learning-column">
                          <SectionTitle
                            title="Твой маршрут на сегодня"
                            subtitle="Маленькие шаги, которые меняют многое."
                            action="Настроить план"
                            onAction={() => go("boost")}
                          />
                          <div className="daily-route">
                            <div className="route-heading">
                              <span>
                                <span className="live-dot" /> ЕЖЕДНЕВНАЯ
                                ПРАКТИКА
                              </span>
                              <span>{dailyProgress}% выполнено</span>
                            </div>
                            <div className="progress-track">
                              <i style={{ width: `${dailyProgress}%` }} />
                            </div>
                            {[
                              {
                                icon: Layers,
                                color: "mint",
                                title: "Разбуди память",
                                desc: `${due} слов ждут повторения`,
                                time: "5 мин",
                                page: "cards",
                              },
                              {
                                icon: BookOpen,
                                color: "purple",
                                title: "Открой что-то новое",
                                desc: `${profile.level} · ${currentLevel.name}`,
                                time: "10 мин",
                                page: "academy",
                              },
                              {
                                icon: Headphones,
                                color: "blue",
                                title: "Настройся на болгарский",
                                desc: "Слушай, понимай, запоминай",
                                time: "5 мин",
                                page: "listen",
                              },
                            ].map((r, i) => (
                              <button
                                key={r.title}
                                className="route-row"
                                onClick={() => go(r.page as Page)}
                              >
                                <span className="route-number">0{i + 1}</span>
                                <span className={`icon-tile ${r.color}`}>
                                  <r.icon size={20} />
                                </span>
                                <span className="route-text">
                                  <strong>{r.title}</strong>
                                  <small>{r.desc}</small>
                                </span>
                                <span className="route-time">
                                  <Clock size={12} />
                                  {r.time}
                                </span>
                                <span className="route-arrow">
                                  <ChevronRight size={17} />
                                </span>
                              </button>
                            ))}
                          </div>
                          <SectionTitle
                            title="Академия без границ"
                            subtitle="Выбирай уровень. Двигайся в своём темпе."
                            action="Все программы"
                            onAction={() => go("academy")}
                          />
                          <div className="level-preview">
                            {levels.slice(0, 3).map((l, i) => (
                              <button
                                key={l.id}
                                className={`level-card ${l.color} ${l.id === profile.level ? "selected" : ""}`}
                                onClick={() => {
                                  saveProfile({ ...profile, level: l.id });
                                  go("academy");
                                }}
                              >
                                <div className="level-top">
                                  <span className="level-code">{l.id}</span>
                                  {l.id === profile.level ? (
                                    <span className="current-pill">
                                      ТВОЙ УРОВЕНЬ
                                    </span>
                                  ) : (
                                    <ArrowUpRight size={17} />
                                  )}
                                </div>
                                <div className={`level-art art-${i}`}>
                                  <span />
                                  <span />
                                  <span />
                                </div>
                                <h3>{l.name}</h3>
                                <p>{l.description}</p>
                                <div className="level-footer">
                                  <span>Все уроки уровня</span>
                                  <ChevronRight size={15} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="right-column">
                          <div className="goal-card">
                            <div className="card-title">
                              <span>
                                <Target size={18} /> Цель на сегодня
                              </span>
                              <button
                                className="icon-btn"
                                onClick={() => go("boost")}
                                aria-label="Настроить цель"
                              >
                                <Settings size={15} />
                              </button>
                            </div>
                            <div className="goal-body">
                              <div
                                className="goal-ring"
                                style={
                                  {
                                    "--progress": `${dailyProgress}%`,
                                  } as React.CSSProperties
                                }
                              >
                                <span>
                                  <strong>
                                    {todayMinutes}
                                    <small> / {profile.minutes}</small>
                                  </strong>
                                  <small>минут практики</small>
                                </span>
                              </div>
                              <p>
                                Всё начинается с одного шага.
                                <br />
                                <strong>Сделай его сегодня.</strong>
                              </p>
                              <div className="week-strip">
                                {["П", "В", "С", "Ч", "П", "С", "В"].map(
                                  (d, i) => {
                                    const date = new Date();
                                    const offset = (date.getDay() + 6) % 7;
                                    date.setDate(date.getDate() - offset + i);
                                    const done = attempts.some(
                                      (a) =>
                                        localDay(a.at) ===
                                        localDay(date.getTime()),
                                    );
                                    return (
                                      <span
                                        key={i}
                                        className={
                                          i === offset
                                            ? "current"
                                            : done
                                              ? "done"
                                              : ""
                                        }
                                      >
                                        <small>{d}</small>
                                        <i>
                                          {done ? (
                                            <Check size={13} />
                                          ) : i === offset ? (
                                            <span />
                                          ) : (
                                            "·"
                                          )}
                                        </i>
                                      </span>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            className="railway-promo"
                            onClick={() => go("railway")}
                          >
                            <img
                              src="/images/rail.jpg"
                              alt="Болгарский электровоз БДЖ серии 46"
                            />
                            <div className="railway-shade" />
                            <span className="rail-badge">
                              <TrainFront size={13} /> ПРОФЕССИОНАЛЬНЫЙ
                              БОЛГАРСКИЙ
                            </span>
                            <div className="railway-promo-content">
                              <span className="eyebrow">
                                ЯЗЫК ТВОЕЙ ПРОФЕССИИ
                              </span>
                              <h3>
                                Railway Academy
                                <span>Точность в каждом слове.</span>
                              </h3>
                              <p>
                                От устройства локомотива
                                <br />
                                до профессионального общения.
                              </p>
                              <span className="railway-link">
                                Открыть академию <ArrowUpRight size={17} />
                              </span>
                            </div>
                          </button>
                          <button
                            className="insight-card"
                            onClick={() =>
                              startLesson("A2", "false-friends", ["a2-4"])
                            }
                          >
                            <span className="insight-icon">
                              <Lightbulb size={19} />
                            </span>
                            <div>
                              <strong>Похожи. Но не одинаковы.</strong>
                              <p>
                                «Стол» по-болгарски — это стул.
                                <br />А стол — «маса». Знакомимся
                                <br />с ложными друзьями переводчика.
                              </p>
                              <span>
                                Проверить себя <ArrowRight size={13} />
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                      <div className="bottom-note">
                        <span>
                          <ShieldCheck size={14} /> Твой прогресс сохраняется
                          автоматически
                        </span>
                        <span>
                          Создано для твоего следующего шага{" "}
                          <span className="lime">✦</span>
                        </span>
                      </div>
                    </>
                  )}
                  {["library", "practice", "dialogues"].includes(page) &&
                    extension(page as HubMode)}
                  {page === "academy" && (
                    <>
                      <PageHeading
                        eyebrow="ОТ ПЕРВЫХ СЛОВ ДО НОВЫХ СМЫСЛОВ"
                        title="Твоя академия. Твой путь."
                        desc="Переходите между уровнями свободно. Начните с темы, которая нужна вам сейчас."
                      />
                      <div className="info-banner">
                        <Sparkles size={20} />
                        <span>
                          <strong>Не знаете, с чего начать?</strong> Короткая
                          диагностика поможет выбрать отправную точку.
                        </span>
                        <button
                          className="text-btn"
                          onClick={() => setModal("diagnostic")}
                        >
                          Пройти тест <ArrowRight size={16} />
                        </button>
                      </div>
                      <div className="academy-grid">
                        {levels.map((l) => (
                          <article
                            key={l.id}
                            className={`academy-card ${l.color}`}
                          >
                            <div className="level-top">
                              <span className="level-code">{l.id}</span>
                              {l.id === profile.level && (
                                <span className="current-pill">ВЫБРАН</span>
                              )}
                            </div>
                            <h2>{l.name}</h2>
                            <p>{l.description}</p>
                            <div className="lesson-detail">
                              <BookOpen size={16} /> Полная программа · темы, примеры и практика
                            </div>
                            <div className="tags">
                              <span>Лексика</span>
                              <span>Грамматика</span>
                              <span>Контекст</span>
                            </div>
                            <button
                              className="btn secondary"
                              onClick={() => void startLesson(l.id)}
                            >
                              Начать урок <ArrowRight size={16} />
                            </button>
                          </article>
                        ))}
                      </div>
                      <p className="content-note">
                        <Info size={15} /> Выберите уровень и тему. Каждый урок открывается с объяснениями и примерами; все его задания доступны в практике без ограничения до пяти вопросов.
                      </p>
                    </>
                  )}
                  {page === "academy" && extension("courses")}
                  {page === "cards" && (
                    <>
                      <div className="settings-actions">
                        <button
                          className="btn primary"
                          onClick={() => go("library")}
                        >
                          Большой словарь ·{" "}
                          {contentManifest.counts.words.toLocaleString("ru")}{" "}
                          статей <ArrowRight size={16} />
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => go("practice")}
                        >
                          25 механик практики
                        </button>
                      </div>
                      <Suspense fallback={<p>Открываем учебные карточки…</p>}><CorpusCards notify={notify} onReview={refresh}/></Suspense>
                      <details className="legacy-cards"><summary>Вводная подборка · прежние 20 карточек</summary><Cards
                        memory={memory}
                        onReview={refresh}
                        notify={notify}
                      /></details>
                    </>
                  )}
                  {page === "grammar" && (
                    <>
                      <PageHeading eyebrow="ГРАММАТИКА В КОНТЕКСТЕ" title="Грамматическая лаборатория" desc="Поиск глаголов, девять времён и практика форм." />
                      {extension("grammar")}
                    </>
                  )}
                  {page === "listen" && (
                    <>
                      <Suspense fallback={<p role="status">Открываем аудирование…</p>}><ListeningLab notify={notify} /></Suspense>
                      {extension("listening")}
                    </>
                  )}
                  {page === "voice" && (
                    <>
                      <Suspense fallback={<p role="status">Открываем голосовой тренажёр…</p>}><VoiceLab notify={notify} /></Suspense>
                      {extension("dialogues")}
                    </>
                  )}
                  {page === "railway" && (
                    <>
                      <PageHeading
                        eyebrow="ПРОФЕССИОНАЛЬНЫЙ БОЛГАРСКИЙ"
                        title="Railway Academy"
                        desc="Говорите на одном языке с коллегами. Техническая лексика, контекст и практика."
                      />
                      <div className="railway-hero">
                        <img
                          src="/images/rail.jpg"
                          alt="Электровоз БДЖ серии 46 № 044 в Карнобате"
                        />
                        <div>
                          <span className="hero-tag">ЯЗЫК ВАШЕЙ ПРОФЕССИИ</span>
                          <h2>
                            Точность начинается
                            <br />с понимания.
                          </h2>
                          <p>
                            Словарь для локомотивной бригады,
                            <br />
                            инженера и работника депо.
                          </p>
                          <button
                            className="btn primary"
                            onClick={() => document.getElementById("rail-academy-banks")?.scrollIntoView({behavior:"smooth"})}
                          >
                            Начать практику <ArrowRight size={17} />
                          </button>
                        </div>
                      </div>
                      <SectionTitle
                        title="Словарь специалиста"
                        subtitle="Языковые примеры для профессионального контекста."
                      />
                      <div className="rail-vocab">
                        {words
                          .filter((w) => w.rail)
                          .map((w) => (
                            <div className="panel vocab-row" key={w.id}>
                              <span>
                                <strong lang="bg">{w.stress}</strong>
                                <small>{w.ru}</small>
                              </span>
                              <button
                                className="icon-btn"
                                onClick={() => speak(w.bg, notify)}
                                aria-label={`Озвучить ${w.bg}`}
                              >
                                <Volume2 size={19} />
                              </button>
                            </div>
                          ))}
                      </div>
                      <div className="info-banner">
                        <Info size={21} />
                        <span>
                          Сейчас доступны упражнения на язык. Служебные команды
                          и порядок действий не моделируются. Приложение не
                          заменяет официальную профессиональную подготовку.
                        </span>
                      </div>
                      <PhotoCredit assetKey="rail" />
                    </>
                  )}
                  {page === "railway" && extension("railway")}
                  {page === "boost" && (
                    <Boost
                      profile={profile}
                      save={saveProfile}
                      todayMinutes={todayMinutes}
                      attempts={attempts}
                      go={go}
                      start={() => startLesson()}
                    />
                  )}
                  {page === "boost" && extension("plan")}
                  {page === "progress" && (
                    <Progress
                      attempts={attempts}
                      memory={memory}
                      profile={profile}
                      startLesson={startLesson}
                    />
                  )}
                  {page === "settings" && (
                    <SettingsPage
                      profile={profile}
                      save={saveProfile}
                      notify={notify}
                      install={install}
                      refresh={async () => {
                        const p = await db.settings.get("profile");
                        if (p) setProfile(p);
                        await refresh();
                      }}
                      showSources={() => setModal("sources")}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
        {toast && (
          <div className="toast" role="status">
            <Info size={18} />
            {toast}
            <button onClick={() => setToast("")} aria-label="Закрыть сообщение">
              <X size={15} />
            </button>
          </div>
        )}
        <AnimatePresence>
          {modal && (
            <Modal
              title={
                modal === "onboarding"
                  ? "Твоя академия, твой ритм"
                  : modal === "diagnostic"
                    ? "Найдём твою отправную точку"
                    : modal === "notifications"
                      ? "Твоя академия рядом"
                      : "Источники и материалы"
              }
              onClose={() => setModal(null)}
            >
              {modal === "onboarding" ? (
                <>
                  <p>
                    Выберите удобный темп и отправную точку. Эти настройки можно
                    изменить в любой момент.
                  </p>
                  <label className="onboarding-label">
                    Сколько времени в день?
                    <select
                      value={profile.minutes}
                      onChange={(e) =>
                        saveProfile({
                          ...profile,
                          minutes: Number(e.target.value),
                        })
                      }
                    >
                      {[20, 40, 60, 90, 120].map((m) => (
                        <option key={m} value={m}>
                          {m} минут
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="onboarding-label">
                    С какого уровня начнём?
                    <select
                      value={profile.level}
                      onChange={(e) =>
                        saveProfile({
                          ...profile,
                          level: e.target.value as Level,
                        })
                      }
                    >
                      {levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.id} · {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="text-btn"
                    onClick={() => setModal("diagnostic")}
                  >
                    Не знаю уровень — пройти диагностику{" "}
                    <ArrowUpRight size={15} />
                  </button>
                  <button
                    className="btn primary full"
                    onClick={async () => {
                      await saveProfile({ ...profile, onboarded: true });
                      setModal(null);
                      startLesson();
                    }}
                  >
                    Открыть первый урок <ArrowRight size={17} />
                  </button>
                </>
              ) : modal === "diagnostic" ? (
                <>
                  <span className="modal-feature">
                    <GraduationCap size={36} />
                  </span>
                  <p>
                    12 вопросов от A1 до C2. Проверим лексику и грамматику и
                    предложим уровень для старта.
                  </p>
                  <p className="muted">
                    Это ориентир по небольшой выборке, а не сертифицированная
                    оценка CEFR. Уровень можно изменить в любой момент.
                  </p>
                  <button
                    className="btn primary full"
                    onClick={startDiagnostic}
                  >
                    Начать диагностику <ArrowRight size={17} />
                  </button>
                </>
              ) : modal === "notifications" ? (
                <>
                  <div className="notification-entry">
                    <Layers />
                    <div>
                      <strong>Память любит внимание</strong>
                      <p>{due} слов доступны для повторения.</p>
                      <button
                        className="text-btn"
                        onClick={() => {
                          setModal(null);
                          go("cards");
                        }}
                      >
                        Открыть карточки <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="notification-entry">
                    <ShieldCheck />
                    <div>
                      <strong>Вы учитесь локально</strong>
                      <p>
                        Результаты сохраняются в этом браузере. Скачивайте
                        резервную копию в настройках.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Словари и авторские учебные материалы. Примеры пока не прошли
                    независимую лингвистическую редактуру.
                  </p>
                  {sources.map((s) => (
                    <a
                      className="source-item"
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <strong>
                        {s.title} <ExternalLink size={14} />
                      </strong>
                      <small>{s.note}</small>
                    </a>
                  ))}
                  {assets.map((a) => (
                    <PhotoCredit key={a.key} assetKey={a.key} />
                  ))}
                </>
              )}
            </Modal>
          )}
        </AnimatePresence>
        {session && (
          <Lesson
            session={session}
            onClose={async () => {
              setSession(null);
              await refresh();
            }}
            onChange={async (s) => {
              setSession(s);
              await refresh();
            }}
            notify={notify}
            onDiagnostic={async (level) =>
              saveProfile({ ...profile, level, onboarded: true })
            }
          />
        )}
      </div>
    </MotionConfig>
  );
}
function Stat({
  icon: Icon,
  color,
  label,
  value,
  unit,
  note,
  mini,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  unit: string;
  note: string;
  mini: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        <span className={`stat-icon ${color}`}>
          <Icon size={17} />
        </span>
        {label}
      </div>
      <div className="stat-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="stat-note">{note}</div>
      <div className={`stat-mini mini-${mini}`}>
        {mini === "bars" ? (
          Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ height: `${10 + ((i * 7) % 25)}px` }} />
          ))
        ) : mini === "flame" ? (
          <Flame size={42} />
        ) : mini === "level" ? (
          <span>↗</span>
        ) : (
          <Clock size={37} />
        )}
      </div>
    </div>
  );
}
function SectionTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button onClick={onAction}>
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="page-heading section-page-heading">
      <div>
        <div className="eyebrow greeting">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button,a,input,select,textarea,[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      prev?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal panel"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <X size={22} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
function PhotoCredit({ assetKey }: { assetKey: string }) {
  const a = assets.find((a) => a.key === assetKey);
  return a ? (
    <div className="photo-credit">
      Фото:{" "}
      <a href={a.source} target="_blank" rel="noreferrer">
        {a.author} · Wikimedia Commons
      </a>{" "}
      ·{" "}
      <a href={a.licenseUrl} target="_blank" rel="noreferrer">
        {a.license}
      </a>{" "}
      · кадрирование для интерфейса
    </div>
  ) : null;
}
function Cards({
  memory,
  onReview,
  notify,
}: {
  memory: Memory[];
  onReview: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState("all"),
    [mode, setMode] = useState<"recognition" | "production">("recognition"),
    [queue, setQueue] = useState<string[] | null>(null),
    [index, setIndex] = useState(0),
    [flipped, setFlipped] = useState(false),
    [input, setInput] = useState(""),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [started, setStarted] = useState(Date.now());
  const pool = words.filter(
    (w) =>
      filter === "all" || (filter === "rail" ? w.rail : w.level === filter),
  );
  const duePool = pool.filter((w) => {
    const m = memory.find((m) => m.id === `${w.id}:${mode}`);
    return !m || m.card.due <= new Date();
  });
  const word = queue ? words.find((w) => w.id === queue[index]) : null;
  const start = () => {
    setQueue(shuffle(duePool.map((w) => w.id)));
    setIndex(0);
    setFlipped(false);
    setInput("");
    setChecked(false);
    setStarted(Date.now());
  };
  async function rate(r: Grade) {
    if (!word || busy) return;
    setBusy(true);
    try {
      await reviewWord(word.id, mode, r, Date.now() - started);
      await onReview();
      setIndex((i) => i + 1);
      setFlipped(false);
      setInput("");
      setChecked(false);
      setStarted(Date.now());
    } catch {
      notify("Не удалось сохранить повторение. Карточка осталась открытой.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ЗАПОМИНАЙТЕ НАДОЛГО"
        title="Умные карточки"
        desc="Повторения по алгоритму FSRS. Узнавание и самостоятельное воспроизведение учитываются отдельно."
      />
      <div className="cards-toolbar">
        <div className="filter-tabs">
          {[
            { id: "all", label: "Все слова" },
            { id: "rail", label: "Железная дорога" },
            ...levels.map((l) => ({ id: l.id, label: l.id })),
          ].map((f) => (
            <button
              className={filter === f.id ? "active" : ""}
              onClick={() => {
                setFilter(f.id);
                setQueue(null);
              }}
              key={f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Навык повторения"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as typeof mode);
            setQueue(null);
          }}
        >
          <option value="recognition">Узнавание BG → RU</option>
          <option value="production">Воспроизведение RU → BG</option>
        </select>
      </div>
      {queue ? (
        <div className="flashcard-area">
          {word ? (
            <>
              <div className="practice-top">
                <span>
                  Карточка {index + 1} из {queue.length}
                </span>
                <button className="text-btn" onClick={() => setQueue(null)}>
                  К словарю <X size={15} />
                </button>
              </div>
              <div className={`flashcard panel ${flipped ? "flipped" : ""}`}>
                <div className="flashcard-rotor">
                <div className="card-face card-front" aria-hidden={flipped} inert={flipped}>
                <span className="eyebrow">
                  {mode === "recognition"
                    ? "БОЛГАРСКИЙ → РУССКИЙ"
                    : "РУССКИЙ → БОЛГАРСКИЙ"}
                </span>
                {word.image && (
                  <img
                    className="flashcard-photo"
                    src={`/images/${word.image}.jpg`}
                    alt={
                      word.image === "rail"
                        ? "Болгарский электровоз БДЖ серии 46"
                        : "Собор Александра Невского в Софии"
                    }
                  />
                )}
                <h2 lang={mode === "recognition" ? "bg" : "ru"}>
                  {mode === "recognition" ? word.stress : word.ru}
                </h2>
                {mode === "recognition" && (
                  <button
                    className="sound-button"
                    onClick={() => speak(word.bg, notify)}
                    aria-label="Прослушать слово"
                  >
                    <Volume2 size={22} />
                  </button>
                )}
                {mode === "production" && !checked && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setChecked(true);
                      setFlipped(true);
                    }}
                  >
                    <input
                      autoFocus
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Напишите по-болгарски"
                      aria-label="Болгарское слово"
                      required
                    />
                    <ReactiveKeyboard value={input} onChange={setInput} />
                    <button className="btn primary">Проверить</button>
                  </form>
                )}
                  {mode === "recognition" && <button className="btn secondary" onClick={() => setFlipped(true)}>Показать перевод <RotateCcw size={16} /></button>}
                </div>
                <div className="card-face card-back" aria-hidden={!flipped} inert={!flipped}>
                {flipped && <>
                  <div className="card-answer">
                    {mode === "production" && (
                      <div
                        className={
                          checkAnswer(input, [word.bg])
                            ? "feedback-correct"
                            : "feedback-wrong"
                        }
                      >
                        {checkAnswer(input, [word.bg])
                          ? "Верно!"
                          : "Верный ответ:"}
                      </div>
                    )}
                    <h3>{mode === "recognition" ? word.ru : word.stress}</h3>
                    <span className="muted">{word.grammar}</span>
                    <p lang="bg">{word.example}</p>
                    <p className="muted">{word.translation}</p>
                    <div className="tags">
                      {word.related.map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <button className="sound-button" onClick={() => speak(word.bg, notify)} aria-label="Прослушать ответ"><Volume2 size={20}/></button>
                  {word.image && <PhotoCredit assetKey={word.image} />}
                </>}
                </div>
                </div>
              </div>
              {flipped && (
                <div className="rating-buttons">
                  {[
                    {
                      r: Rating.Again,
                      label: "Ещё раз",
                      desc: "Не вспомнил",
                      c: "red",
                    },
                    {
                      r: Rating.Hard,
                      label: "Трудно",
                      desc: "С подсказкой",
                      c: "orange",
                    },
                    {
                      r: Rating.Good,
                      label: "Помню",
                      desc: "Самостоятельно",
                      c: "mint",
                    },
                    {
                      r: Rating.Easy,
                      label: "Легко",
                      desc: "Без усилий",
                      c: "purple",
                    },
                  ].map((b) => (
                    <button
                      key={b.r}
                      disabled={
                        busy ||
                        (mode === "production" &&
                          !checkAnswer(input, [word.bg]) &&
                          b.r !== Rating.Again)
                      }
                      className={b.c}
                      onClick={() => rate(b.r as Grade)}
                    >
                      <strong>{b.label}</strong>
                      <small>{b.desc}</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state panel">
              <CheckCircle2 size={44} />
              <h2>{queue.length ? "Отличная работа!" : "На сегодня всё"}</h2>
              <p>
                {queue.length
                  ? `Вы повторили ${queue.length} слов. FSRS запланировал следующие повторения.`
                  : "В этой подборке сейчас нет карточек к повторению. Попробуйте другой навык или раздел."}
              </p>
              <button className="btn primary" onClick={() => setQueue(null)}>
                Вернуться к словарю
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="review-banner">
            <div>
              <span className="icon-tile mint">
                <Layers size={25} />
              </span>
              <h2>
                {duePool.length} слов ждут тебя
                <small>Новые и запланированные на сегодня карточки</small>
              </h2>
            </div>
            <button className="btn primary" onClick={start}>
              Начать повторение <ArrowRight size={17} />
            </button>
          </div>
          <div className="word-grid">
            {pool.map((w) => (
              <article className="panel word-card" key={w.id}>
                <div>
                  <span className="tag">
                    {w.level}
                    {w.rail ? " · RAILWAY" : ""}
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => speak(w.bg, notify)}
                    aria-label={`Озвучить ${w.bg}`}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                <h3 lang="bg">{w.stress}</h3>
                <p>{w.ru}</p>
                <small>{w.grammar}</small>
                <p className="word-example" lang="bg">
                  {w.example}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
function Voice({
  mode,
  notify,
  onPractice,
}: {
  mode: "voice" | "listen";
  notify: (s: string) => void;
  onPractice: () => void;
}) {
  const [selected, setSelected] = useState(0),
    [speed, setSpeed] = useState(0.85),
    [recording, setRecording] = useState(false),
    [transcript, setTranscript] = useState(""),
    [status, setStatus] = useState(""),
    [showText, setShowText] = useState(mode === "voice");
  const recognitionRef = useRef<any>(null);
  const phrases = [
    {
      bg: "Здравейте! Казвам се Иван.",
      ru: "Здравствуйте! Меня зовут Иван.",
      topic: "Знакомство",
      level: "A1",
    },
    {
      bg: "Един билет до Пловдив, моля.",
      ru: "Один билет до Пловдива, пожалуйста.",
      topic: "В путешествии",
      level: "A2",
    },
    {
      bg: "Локомотивът има повреда.",
      ru: "У локомотива неисправность.",
      topic: "На работе",
      level: "B1",
    },
    {
      bg: "Проверявам документите преди пътуването.",
      ru: "Я проверяю документы перед поездкой.",
      topic: "Технический контекст",
      level: "B1",
    },
  ];
  const phrase = phrases[selected];
  useEffect(() => {
    return () => { stopSpeech(); recognitionRef.current?.abort(); };
  }, []);
  const supported = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
  const play = () => speak(phrase.bg, notify, speed);
  const record = () => {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    if (!supported) {
      notify("Распознавание речи не поддерживается браузером.");
      return;
    }
    const R =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const r = new R();
    r.lang = "bg-BG";
    r.interimResults = false;
    r.maxAlternatives = 1;
    recognitionRef.current = r;
    r.onstart = () => {
      setRecording(true);
      setStatus("Слушаю…");
      setTranscript("");
    };
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setStatus(
        checkAnswer(text, [phrase.bg])
          ? "Текст распознан верно."
          : "Есть различия в распознанном тексте. Сравните с фразой.",
      );
    };
    r.onerror = (e: any) => {
      setRecording(false);
      setStatus(
        e.error === "not-allowed"
          ? "Разрешите доступ к микрофону в настройках браузера."
          : `Распознавание недоступно (${e.error}). Попробуйте ещё раз.`,
      );
    };
    r.onend = () => setRecording(false);
    try {
      stopSpeech();
      r.start();
    } catch {
      setStatus("Не удалось включить микрофон. Проверьте разрешения.");
    }
  };
  return (
    <>
      <PageHeading
        eyebrow={
          mode === "voice"
            ? "ПУСТЬ ТЕБЯ УСЛЫШАТ"
            : "УСЛЫШЬ БОЛЬШЕ. ПОЙМИ ГЛУБЖЕ."
        }
        title={
          mode === "voice" ? "Голосовой тренажёр" : "Настройся на болгарский"
        }
        desc={
          mode === "voice"
            ? "Слушайте фразу, повторяйте и сравнивайте распознанный текст."
            : "Короткие фразы для внимательного слушания и самостоятельной проверки."
        }
      />
      <div className="voice-layout">
        <div className="panel phrase-list">
          <span className="eyebrow">ВЫБЕРИТЕ СИТУАЦИЮ</span>
          {phrases.map((p, i) => (
            <button
              key={p.bg}
              className={selected === i ? "active" : ""}
              onClick={() => {
                recognitionRef.current?.abort();
                stopSpeech();
                setSelected(i);
                setTranscript("");
                setStatus("");
                setShowText(mode === "voice");
              }}
            >
              <span className="icon-tile purple">
                <Headphones size={20} />
              </span>
              <span>
                <strong>{p.topic}</strong>
                <small>{p.level} · Короткая фраза</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        <div className="panel voice-stage">
          <span className="tag">
            {phrase.level} · {phrase.topic}
          </span>
          <div className={`audio-orb ${recording ? "recording" : ""}`}>
            <AudioLines size={60} />
          </div>
          <h2>
            {mode === "voice"
              ? "Слушай. Повторяй. Говори."
              : "Сначала — просто послушай."}
          </h2>
          {showText ? (
            <>
              <p className="spoken-phrase" lang="bg">
                {phrase.bg}
              </p>
              <p className="muted">{phrase.ru}</p>
            </>
          ) : (
            <button className="text-btn" onClick={() => setShowText(true)}>
              Показать текст и перевод
            </button>
          )}
          <div className="audio-controls">
            <button className="btn secondary" onClick={play}>
              <Volume2 size={18} /> Прослушать
            </button>
            <button
              className="icon-btn"
              onClick={stopSpeech}
              aria-label="Остановить аудио"
            >
              <Pause size={20} />
            </button>
            <select
              aria-label="Скорость речи"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={0.65}>0.65×</option>
              <option value={0.85}>0.85×</option>
              <option value={1}>1×</option>
              <option value={1.15}>1.15×</option>
            </select>
          </div>
          <p className="voice-disclaimer">Болгарский Piper · единый проигрыватель. Записи и локальная генерация имеют приоритет перед системным голосом.</p>
          {mode === "voice" ? (
            <>
              <button
                className={`btn ${recording ? "danger" : "primary"}`}
                disabled={!supported || !navigator.onLine}
                onClick={record}
              >
                <Mic size={18} />
                {recording ? "Завершить запись" : "Повторить в микрофон"}
              </button>
              <small className="voice-disclaimer">
                {supported
                  ? "Распознавание может отправлять аудио службе браузера. Требуется интернет."
                  : "В этом браузере распознавание речи недоступно. Можно слушать и повторять самостоятельно."}
              </small>
              {status && (
                <div className="recognition-result" role="status">
                  <strong>{status}</strong>
                  {transcript && (
                    <p>
                      Распознано: <span lang="bg">{transcript}</span>
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <button className="btn primary" onClick={onPractice}>
              Аудиодиктант <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
      <div className="info-banner">
        <Info size={21} />
        <span>
          {mode === "voice"
            ? "Сравнение распознанного текста не оценивает фонетику или ударение. Оценка произношения появится только после подключения и проверки подходящей модели."
            : "Болгарская речь Piper: готовые MP3 и локальная генерация новых фраз. Системный голос bg-BG используется как резерв."}
        </span>
      </div>
    </>
  );
}
function Boost({
  profile,
  save,
  todayMinutes,
  attempts,
  go,
  start,
}: {
  profile: Profile;
  save: (p: Profile) => void;
  todayMinutes: number;
  attempts: Attempt[];
  go: (p: Page) => void;
  start: () => void;
}) {
  const day = Math.min(
    30,
    Math.max(1, Math.floor((Date.now() - profile.startedAt) / 86400000) + 1),
  );
  const parts = [
    { label: "Повторение слов", weight: 15, icon: Layers, page: "cards" },
    { label: "Новая лексика", weight: 15, icon: BookOpen, page: "academy" },
    { label: "Грамматика", weight: 20, icon: FlaskConical, page: "grammar" },
    { label: "Аудирование", weight: 15, icon: Headphones, page: "listen" },
    { label: "Разговорная практика", weight: 15, icon: Mic, page: "voice" },
    {
      label: "Железнодорожный язык",
      weight: 10,
      icon: TrainFront,
      page: "railway",
    },
  ];
  const minutes = parts.map((p) =>
    Math.floor((profile.minutes * p.weight) / 90),
  );
  const remaining = profile.minutes - minutes.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) minutes[i % minutes.length]++;
  return (
    <>
      <PageHeading
        eyebrow="30-DAY BULGARIAN BOOST"
        title="30 дней. Больше уверенности."
        desc="Регулярность важнее скорости. Соберите план, который вписывается в вашу жизнь."
      />
      <div className="boost-hero panel">
        <span className="boost-big-icon">
          <Zap size={52} />
        </span>
        <div>
          <span className="eyebrow">ТВОЙ ЛИЧНЫЙ ИНТЕНСИВ</span>
          <h2>
            День {day} <span>/ 30</span>
          </h2>
          <p>
            Уровень {profile.level} · {profile.minutes} минут в день ·{" "}
            {todayMinutes} минут сегодня
          </p>
        </div>
        <button className="btn primary" onClick={start}>
          Начать занятие <Play size={16} />
        </button>
      </div>
      <SectionTitle
        title="Сколько времени есть у тебя?"
        subtitle="План распределяет выбранное время между шестью направлениями."
      />
      <div className="duration-options">
        {[20, 40, 60, 90, 120].map((m) => (
          <button
            aria-label={`${m} минут в день`}
            key={m}
            className={profile.minutes === m ? "active" : ""}
            onClick={() => save({ ...profile, minutes: m, onboarded: true })}
          >
            <Clock size={20} />
            <strong>
              {m}
              <small>минут в день</small>
            </strong>
            {profile.minutes === m && <Check size={17} />}
          </button>
        ))}
      </div>
      <div className="boost-columns">
        <div>
          <SectionTitle title="Твоя ежедневная программа" />
          <div className="panel boost-plan">
            {parts.map((p, i) => (
              <button key={p.label} onClick={() => go(p.page as Page)}>
                <span
                  className={`icon-tile ${["mint", "purple", "pink", "blue", "orange", "yellow"][i]}`}
                >
                  <p.icon size={20} />
                </span>
                <strong>{p.label}</strong>
                <span>{minutes[i]} мин</span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle title="Календарь привычки" />
          <div className="panel calendar-panel">
            <div className="boost-calendar">
              {Array.from({ length: 30 }, (_, i) => {
                const date = profile.startedAt + i * 86400000;
                const active = attempts.some(
                  (a) => localDay(a.at) === localDay(date),
                );
                return (
                  <div
                    className={`${i + 1 === day ? "current" : ""} ${active ? "done" : ""}`}
                    key={i}
                  >
                    {active ? <Check size={17} /> : i + 1}
                    {(i + 1) % 7 === 0 && <i />}
                  </div>
                );
              })}
            </div>
            <p>
              <span className="live-dot" /> Сегодня{" "}
              <span className="calendar-legend" /> День с практикой
            </p>
            <small>
              На 7, 14, 21 и 28 день планируйте повторную диагностику. Календарь
              отмечает только реальные занятия.
            </small>
          </div>
        </div>
      </div>
      <p className="content-note">
        <Info size={15} /> План помогает выстроить привычку. Прогресс зависит от
        исходных знаний и освоения навыков; переход на новый уровень CEFR за
        месяц не гарантируется.
      </p>
    </>
  );
}
function Progress({
  attempts,
  memory,
  profile,
  startLesson,
}: {
  attempts: Attempt[];
  memory: Memory[];
  profile: Profile;
  startLesson: (l?: Level, m?: string, ids?: string[]) => void;
}) {
  const correct = attempts.filter((a) => a.correct).length;
  const accuracy = attempts.length
    ? Math.round((correct / attempts.length) * 100)
    : 0;
  const totalMinutes = Math.round(
    attempts.reduce((s, a) => s + a.duration, 0) / 60000,
  );
  const [period, setPeriod] = useState(7);
  const days = Array.from({ length: period }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (period - 1 - i));
    const a = attempts.filter((a) => localDay(a.at) === localDay(d.getTime()));
    return {
      label: d.toLocaleDateString("ru", { day: "numeric", month: "short" }),
      value: a.length,
    };
  });
  const max = Math.max(5, ...days.map((d) => d.value));
  const skills = Array.from(new Set(attempts.map((a) => a.skill)))
    .map((s) => {
      const a = attempts.filter((a) => a.skill === s);
      return {
        name: s,
        score: Math.round((a.filter((a) => a.correct).length / a.length) * 100),
        count: a.length,
      };
    })
    .sort((a, b) => a.score - b.score);
  const weak = skills[0];
  return (
    <>
      <PageHeading
        eyebrow="КАЖДЫЙ ШАГ ИМЕЕТ ЗНАЧЕНИЕ"
        title="Ты растёшь. И это видно."
        desc="Реальные результаты занятий, история повторений и направления для следующего шага."
      />
      <div className="stats-grid">
        <Stat
          icon={Target}
          color="mint"
          label="Точность ответов"
          value={String(accuracy)}
          unit="%"
          note={`${correct} верных из ${attempts.length}`}
          mini="level"
        />
        <Stat
          icon={Layers}
          color="purple"
          label="Карточек в работе"
          value={String(new Set(memory.map((m) => m.wordId)).size)}
          unit="слов"
          note="Два независимых навыка"
          mini="bars"
        />
        <Stat
          icon={Clock}
          color="blue"
          label="Время практики"
          value={String(totalMinutes)}
          unit="мин"
          note="Время ответов на задания"
          mini="clock"
        />
        <Stat
          icon={Flame}
          color="orange"
          label="Серия занятий"
          value={String(streak(attempts))}
          unit="дней"
          note="Постоянство даёт результат"
          mini="flame"
        />
      </div>
      <div className="analytics-layout">
        <div className="panel chart-panel">
          <div className="card-title">
            <span>Ритм твоего обучения</span>
            <div className="filter-tabs">
              <button
                className={period === 7 ? "active" : ""}
                onClick={() => setPeriod(7)}
              >
                7 дней
              </button>
              <button
                className={period === 30 ? "active" : ""}
                onClick={() => setPeriod(30)}
              >
                30 дней
              </button>
            </div>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={`Количество ответов за ${period} дней: ${days.map((d) => `${d.label}: ${d.value}`).join(", ")}`}
          >
            {days.map((d, i) => (
              <div
                className="chart-bar-wrap"
                key={i}
                title={`${d.label}: ${d.value} ответов`}
              >
                <span>{d.value || ""}</span>
                <div
                  className="chart-bar"
                  style={{ height: `${Math.max(2, (d.value / max) * 170)}px` }}
                />
                <small>
                  {period === 7 ? d.label : i % 5 === 0 ? d.label : ""}
                </small>
              </div>
            ))}
          </div>
          <p className="muted">
            Количество ответов в день · часовой пояс Europe/Sofia
          </p>
        </div>
        <div className="panel skills-panel">
          <h3>Навыки в фокусе</h3>
          {skills.length ? (
            skills.map((s) => (
              <div className="skill-progress" key={s.name}>
                <div>
                  <span>{s.name}</span>
                  <strong>{s.score}%</strong>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${s.score}%` }} />
                </div>
                <small>{s.count} ответов</small>
              </div>
            ))
          ) : (
            <div className="empty-state compact">
              <ChartNoAxesCombined size={32} />
              <p>
                Ответьте на первые задания — здесь появится картина ваших
                навыков.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="info-banner">
        <Lightbulb size={23} />
        <span>
          <strong>
            {weak ? `Следующий фокус: ${weak.name}` : "Сделайте первый шаг"}
          </strong>
          <br />
          {weak
            ? `${weak.score}% правильных ответов по ${weak.count} заданиям. Небольшая выборка — ориентир для повторения.`
            : "Пройдите вводный урок, чтобы начать собирать личную статистику."}
        </span>
        <button
          className="btn secondary"
          onClick={() =>
            startLesson(
              profile.level,
              "adaptive",
              weak
                ? shuffle(exercises.filter((e) => e.skill === weak.name))
                    .slice(0, 5)
                    .map((e) => e.id)
                : undefined,
            )
          }
        >
          Практиковаться <ArrowRight size={16} />
        </button>
      </div>
      <p className="content-note">
        <Info size={15} /> Выбранный уровень {profile.level} — отправная точка,
        а не подтверждённая квалификация. Количество слов и точность коротких
        упражнений не определяют уровень CEFR.
      </p>
    </>
  );
}
function SettingsPage({
  profile,
  save,
  notify,
  install,
  refresh,
  showSources,
}: {
  profile: Profile;
  save: (p: Profile) => void;
  notify: (s: string) => void;
  install: any;
  refresh: () => Promise<void>;
  showSources: () => void;
}) {
  const [name, setName] = useState(profile.name === "Друг" ? "" : profile.name);
  useEffect(
    () => setName(profile.name === "Друг" ? "" : profile.name),
    [profile.name],
  );
  const fileRef = useRef<HTMLInputElement>(null);
  async function backup() {
    try {
      const data = await exportProgress();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `chameleon-bg-${localDay(Date.now())}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Резервная копия скачана. Храните её в надёжном месте.");
    } catch {
      notify("Не удалось создать резервную копию.");
    }
  }
  async function restore(f: File) {
    try {
      if (f.size > 10_000_000) throw new Error("Файл слишком большой");
      const data = JSON.parse(await f.text());
      if (
        !window.confirm("Заменить текущий прогресс данными из резервной копии?")
      )
        return;
      await importProgress(data);
      await refresh();
      notify("Прогресс восстановлен.");
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Не удалось прочитать резервную копию.",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ТВОЁ ЛИЧНОЕ ПРОСТРАНСТВО"
        title="Настроено под тебя"
        desc="Темп, интерфейс и сохранность результатов — под вашим контролем."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Профиль обучения</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save({
                ...profile,
                name: name.trim() || "Друг",
                onboarded: true,
              });
              notify("Профиль сохранён.");
            }}
          >
            <label>
              Как к вам обращаться
              <input
                value={name}
                maxLength={40}
                placeholder="Ваше имя"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Уровень для занятий
              <select
                value={profile.level}
                onChange={(e) =>
                  save({ ...profile, level: e.target.value as Level })
                }
              >
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} · {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ежедневная цель
              <select
                value={profile.minutes}
                onChange={(e) =>
                  save({ ...profile, minutes: Number(e.target.value) })
                }
              >
                {[20, 40, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} минут
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary">
              Сохранить профиль <Check size={17} />
            </button>
          </form>
        </section>
        <div>
          <section className="panel settings-panel">
            <h2>Комфортный интерфейс</h2>
            <label className="toggle-row">
              <span>
                <strong>Уменьшить анимацию</strong>
                <small>Более спокойные переходы и эффекты</small>
              </span>
              <input
                type="checkbox"
                checked={profile.reducedMotion}
                onChange={(e) =>
                  save({ ...profile, reducedMotion: e.target.checked })
                }
              />
            </label>
            <p className="muted">
              Системная настройка уменьшения движения также учитывается
              автоматически.
            </p>
          </section>
          <section className="panel settings-panel">
            <h2>Установить приложение</h2>
            <p>
              Открывайте академию с домашнего экрана. Загруженные материалы
              работают без интернета.
            </p>
            <button
              className="btn secondary"
              onClick={async () => {
                if (install) {
                  await install.prompt();
                } else
                  notify(
                    "В меню браузера выберите «Установить приложение» или «Добавить на экран Домой». Нужен HTTPS или localhost.",
                  );
              }}
            >
              <Download size={17} /> Установить CHAMELEON BG
            </button>
          </section>
        </div>
        <section className="panel settings-panel">
          <h2>Ваш прогресс под защитой</h2>
          <p>
            Данные хранятся в IndexedDB этого браузера. Резервная копия
            позволяет перенести результаты на другое устройство.
          </p>
          <div className="settings-actions">
            <button className="btn secondary" onClick={backup}>
              <FileDown size={17} /> Скачать копию
            </button>
            <button
              className="btn secondary"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={17} /> Восстановить
            </button>
            <input
              hidden
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) =>
                e.target.files?.[0] && restore(e.target.files[0])
              }
            />
          </div>
          <p className="muted">
            Синхронизация с учётной записью пока не подключена.
          </p>
        </section>
        <PerformancePanel/>
        <section className="panel settings-panel">
          <h2>О содержании академии</h2>
          <p>
            Версия {contentManifest.version} · {contentManifest.counts.words.toLocaleString("ru")}{" "}
            словарных статей ·{" "}
            {contentManifest.counts.sentences.toLocaleString("ru")} контекста ·
            9 времён в грамматической лаборатории. Авторские примеры ожидают
            независимой проверки.
          </p>
          <button className="text-btn" onClick={showSources}>
            Источники и лицензии <ExternalLink size={16} />
          </button>
        </section>
      </div>
    </>
  );
}
function Lesson({
  session,
  onClose,
  onChange,
  notify,
  onDiagnostic,
}: {
  session: Session;
  onClose: () => void;
  onChange: (s: Session) => void;
  notify: (s: string) => void;
  onDiagnostic: (l: Level) => void;
}) {
  const [answer, setAnswer] = useState(""),
    [tokens, setTokens] = useState<number[]>([]),
    [checked, setChecked] = useState(false),
    [correct, setCorrect] = useState(false),
    [busy, setBusy] = useState(false),
    [finished, setFinished] = useState(
      session.index >= session.exerciseIds.length,
    ),
    [recommendation, setRecommendation] = useState<Level>("A1");
  const started = useRef(Date.now());
  const exercise = exercises.find(
    (e) => e.id === session.exerciseIds[session.index],
  );
  const options = useRef<string[]>([]);
  const currentId = useRef("");
  if (exercise && currentId.current !== exercise.id) {
    currentId.current = exercise.id;
    options.current =
      exercise.type === "choice"
        ? shuffle(exercise.options ?? [])
        : (exercise.options ?? []);
  }
  useEffect(() => {
    started.current = Date.now();
    setAnswer("");
    setTokens([]);
    setChecked(false);
    setCorrect(false);
  }, [session.index]);
  const response =
    exercise?.type === "order"
      ? tokens.map((i) => options.current[i]).join(" ")
      : answer;
  async function submit() {
    if (!exercise || busy || checked) return;
    setBusy(true);
    const ok = checkAnswer(response, exercise.answers);
    try {
      await db.transaction("rw", [db.attempts, db.sessions], async () => {
        await db.attempts.add({
          exerciseId: exercise.id,
          correct: ok,
          skill: exercise.skill,
          at: Date.now(),
          duration: Math.min(Date.now() - started.current, 300000),
        });
        await db.sessions.put({
          ...session,
          index: session.index + 1,
          correct: session.correct + (ok ? 1 : 0),
        });
      });
      setCorrect(ok);
      setChecked(true);
    } catch {
      notify("Ответ не сохранён. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (session.index >= session.exerciseIds.length) {
      db.sessions
        .delete("active")
        .catch(() => notify("Не удалось закрыть сохранённый урок."));
      if (session.mode === "diagnostic") {
        db.attempts.where("exerciseId").anyOf(session.exerciseIds)
          .toArray()
          .then((all) => {
            const recent = new Map<string, Attempt>();
            all
              .filter((a) => session.exerciseIds.includes(a.exerciseId))
              .forEach((a) => recent.set(a.exerciseId, a));
            let level: Level = "A1";
            for (const l of levels) {
              if (
                exercises
                  .filter((e) => e.level === l.id)
                  .slice(0, 2)
                  .every((e) => recent.get(e.id)?.correct)
              )
                level = l.id;
              else break;
            }
            setRecommendation(level);
            onDiagnostic(level);
          })
          .catch(() => notify("Не удалось восстановить диагностику."));
      }
    }
  }, []);
  async function next() {
    const next = {
      ...session,
      index: session.index + 1,
      correct: session.correct + (correct ? 1 : 0),
    };
    if (next.index >= session.exerciseIds.length) {
      try {
        if (session.mode === "diagnostic") {
          const all = await db.attempts.where("exerciseId").anyOf(session.exerciseIds).toArray();
          const recent = new Map<string, Attempt>();
          all.forEach((a) => recent.set(a.exerciseId, a));
          let suggested: Level = "A1";
          for (const l of levels) {
            const ids = exercises
              .filter((e) => e.level === l.id)
              .slice(0, 2)
              .map((e) => e.id);
            if (ids.every((id) => recent.get(id)?.correct)) suggested = l.id;
            else break;
          }
          setRecommendation(suggested);
          await onDiagnostic(suggested);
        }
        await db.sessions.delete("active");
        setFinished(true);
        onChange(next);
      } catch {
        notify("Не удалось завершить урок. Попробуйте ещё раз.");
      }
    } else onChange(next);
  }
  return (
    <Modal
      title={
        finished
          ? "Ещё один шаг вперёд"
          : session.mode === "diagnostic"
            ? "Стартовая диагностика"
            : "Время для нового шага"
      }
      onClose={onClose}
    >
      {finished ? (
        <div className="lesson-complete">
          <div className="success-orb">
            <CheckCheck size={44} />
            <span>✦</span>
          </div>
          <h2>
            {session.correct === session.exerciseIds.length
              ? "Прекрасная работа!"
              : "Практика делает увереннее."}
          </h2>
          <p>
            {session.correct} из {session.exerciseIds.length} правильных ответов
          </p>
          {session.mode === "diagnostic" && (
            <div className="example-box">
              <span className="eyebrow">РЕКОМЕНДУЕМАЯ ОТПРАВНАЯ ТОЧКА</span>
              <h3>
                {recommendation} ·{" "}
                {levels.find((l) => l.id === recommendation)?.name}
              </h3>
              <small>
                Результат небольшой диагностики. Для подтверждения CEFR нужна
                комплексная оценка, включая речь и аудирование.
              </small>
            </div>
          )}
          <p className="muted">Результаты сохранены на этом устройстве.</p>
          <button className="btn primary full" onClick={onClose}>
            Вернуться в академию <ArrowRight size={17} />
          </button>
        </div>
      ) : exercise ? (
        <>
          <div className="lesson-progress">
            <div className="progress-track">
              <i
                style={{
                  width: `${(session.index / session.exerciseIds.length) * 100}%`,
                }}
              />
            </div>
            <span>
              {session.index + 1} / {session.exerciseIds.length}
            </span>
          </div>
          <div className="lesson-tags">
            <span className="tag">{exercise.level}</span>
            <span className="tag">{exercise.skill}</span>
          </div>
          <h3 className="exercise-prompt">{exercise.prompt}</h3>
          {exercise.type === "listen" && (
            <button
              className="listen-play"
              onClick={() => speak(exercise.text!, notify)}
            >
              <Headphones size={28} />
              <span>Прослушать фразу</span>
              <Play size={18} />
            </button>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              checked ? next() : submit();
            }}
          >
            {exercise.type === "choice" ? (
              <div className="answer-options">
                {options.current.map((o, i) => (
                  <button
                    type="button"
                    key={o}
                    className={`${answer === o ? "selected" : ""} ${checked && exercise.answers.includes(o) ? "correct" : ""} ${checked && answer === o && !correct ? "wrong" : ""}`}
                    onClick={() => setAnswer(o)}
                    disabled={checked}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {o}
                    {checked && exercise.answers.includes(o) && (
                      <Check size={18} />
                    )}
                  </button>
                ))}
              </div>
            ) : exercise.type === "order" ? (
              <>
                <div className="sentence-built" aria-label="Ваше предложение">
                  {tokens.length ? (
                    tokens.map((idx, i) => (
                      <button
                        type="button"
                        disabled={checked}
                        key={i}
                        onClick={() =>
                          setTokens((t) => t.filter((_, j) => j !== i))
                        }
                      >
                        {options.current[idx]}
                        <X size={12} />
                      </button>
                    ))
                  ) : (
                    <span>Нажимайте на слова в нужном порядке</span>
                  )}
                </div>
                <div className="word-tokens">
                  {options.current.map((o, i) => (
                    <button
                      type="button"
                      disabled={checked || tokens.includes(i)}
                      key={i}
                      onClick={() => setTokens((t) => [...t, i])}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <input
                className="exercise-input"
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={checked}
                aria-label="Ваш ответ"
                placeholder="Напишите ответ по-болгарски…"
                autoComplete="off"
              />
            )}
            {checked && (
              <motion.div
                {...fade}
                className={`answer-feedback ${correct ? "good" : "bad"}`}
                role="status"
              >
                <div>
                  {correct ? (
                    <CheckCircle2 size={21} />
                  ) : (
                    <Lightbulb size={21} />
                  )}
                  <strong>
                    {correct
                      ? "Точно! Так держать."
                      : `Верный ответ: ${exercise.answers[0]}`}
                  </strong>
                </div>
                <p>{exercise.explanation}</p>
              </motion.div>
            )}
            <button
              className="btn primary full"
              disabled={busy || (!checked && !response.trim())}
            >
              {busy
                ? "Сохраняем…"
                : checked
                  ? session.index + 1 === session.exerciseIds.length
                    ? "Завершить урок"
                    : "Дальше"
                  : "Проверить"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="autosave-note">
            <ShieldCheck size={13} /> Прогресс сохраняется после каждого ответа
          </p>
        </>
      ) : (
        <div className="empty-state">
          <Info />
          <h3>Урок обновлён</h3>
          <p>Это задание больше не доступно в текущей базе.</p>
          <button
            className="btn secondary"
            onClick={async () => {
              await db.sessions.delete("active");
              onClose();
            }}
          >
            Вернуться к урокам
          </button>
        </div>
      )}
    </Modal>
  );
}
export default App;
