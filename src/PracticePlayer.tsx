import {PhotoImage} from "./PhotoImage";
import InlineAudioControls from "./InlineAudioControls";
import { ReactiveKeyboard } from "./ReactiveKeyboard";
import { useState, useEffect, useRef } from "react";
import {
  X,
  Volume2,
  Mic,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Clock,
  Check,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { contentDB, type PracticeRecord, type Task } from "./library";
import { evaluateTask } from "./task-evaluation";
import { db, shuffle, reviewWord } from "./storage";
import { Rating } from "ts-fsrs";
import { speak, stopSpeech } from "./speech";
export default function PracticePlayer({
  initial,
  onClose,
  notify,
  onSaved,
  onNextLesson,
}: {
  initial: PracticeRecord;
  onClose: () => void;
  notify: (s: string) => void;
  onSaved: () => void;
  onNextLesson?: () => void;
}) {
  const [record, setRecord] = useState(initial),
    [answer, setAnswer] = useState(initial.answer ?? ""),
    [checked, setChecked] = useState(!!initial.checked),
    [correct, setCorrect] = useState(!!initial.lastCorrect),
    [tokens, setTokens] = useState<number[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [left, setLeft] = useState<number | null>(null),
    [matches, setMatches] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [transcript, setTranscript] = useState(""),
    [recording, setRecording] = useState(false),
    [reveal, setReveal] = useState(false);
  const t = record.items[record.index];
  const recognition = useRef<any>(null);
  const recognitionTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function releaseRecognition(){
    if(recognitionTimer.current)clearTimeout(recognitionTimer.current);recognitionTimer.current=null;
    const r=recognition.current;recognition.current=null;
    if(r){r.onstart=r.onend=r.onerror=r.onresult=null;try{r.abort();}catch{}}
  }
  function preparePlayback(){releaseRecognition();setRecording(false);}
  const ref = useRef<HTMLDivElement>(null);
  const [rightOrder, setRightOrder] = useState<number[]>([]);
  const finished = record.index >= record.items.length;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a,input:not(:disabled),select,[tabindex="0"]',
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
    const vv = window.visualViewport;
    const onViewportResize = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.classList.contains("exercise-input") || active.tagName === "INPUT")) {
        active.scrollIntoView?.({ behavior: "smooth", block: "center" });
      }
    };
    vv?.addEventListener("resize", onViewportResize);
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
      document.removeEventListener("keydown", key);
      vv?.removeEventListener("resize", onViewportResize);
      releaseRecognition();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    releaseRecognition();setRecording(false);stopSpeech();
    setAnswer(record.answer ?? "");
    setChecked(!!record.checked);
    setCorrect(!!record.lastCorrect);
    setTokens([]);
    setSelected([]);
    setMatches([]);
    setLeft(null);
    setTranscript("");
    setReveal(false);
    setRightOrder(shuffle((t?.pairs ?? []).map((_, i) => i)));
    setNow(Date.now());
  }, [record.index]);
  useEffect(() => {
    if (!t?.timeLimit || checked) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [t?.id, checked]);
  const seconds = t?.timeLimit
    ? Math.max(0, t.timeLimit - Math.floor((now - record.startedAt) / 1000))
    : null;
  const response =
    t?.type === "order"
      ? tokens.map((i) => t.options![i]).join(" ")
      : t?.type === "multi"
        ? JSON.stringify(selected)
        : t?.type === "matching"
          ? JSON.stringify(matches.length === t.pairs?.length ? t.answers : [])
          : answer;
  async function submit() {
    if (busy || checked || !t) return;
    setBusy(true);
    const ok = evaluateTask(t, response) && (seconds === null || seconds > 0);
    const next = {
      ...record,
      checked: true,
      answer: response,
      lastCorrect: ok,
    };
    try {
      await db.transaction(
        "rw",
        [db.attempts, db.memory, db.practice, db.settings],
        async () => {
          await db.attempts.add({
            exerciseId: t.id,
            correct: ok,
            skill: t.skill,
            at: Date.now(),
            duration: Math.min(300000, Date.now() - record.startedAt),
          });
          if (t.wordId)
            await reviewWord(
              t.wordId,
              ["spelling", "photo-name", "technical", "gap", "translate-ru", "speaking", "dictation"].includes(t.type)
                ? "production"
                : "recognition",
              ok ? (reveal ? Rating.Hard : Rating.Good) : Rating.Again,
              Math.min(300000, Date.now() - record.startedAt),
              new Date(),
              false,
            );
          const profile = await db.settings.get("profile");
          if (profile) {
            const mistakes = (profile.mistakes ?? []).filter(item => item.id !== t.id);
            if (!ok) mistakes.unshift(t);
            await db.settings.update("profile", { mistakes: mistakes.slice(0, 80) });
          }
          await db.practice.put(next);
        },
      );
      setRecord(next);
      setCorrect(ok);
      setChecked(true);
      onSaved();
    } catch {
      notify(
        "Не удалось сохранить ответ. Он остался на экране — попробуйте ещё раз.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    if (busy) return;
    setBusy(true);
    const n: PracticeRecord = {
      ...record,
      index: record.index + 1,
      correct: record.correct + (correct ? 1 : 0),
      startedAt: Date.now(),
      checked: false,
      answer: "",
      lastCorrect: false,
    };
    try {
      if (n.index >= n.items.length) await db.practice.delete("current");
      else await db.practice.put(n);
      setRecord(n);
      onSaved();
    } catch {
      notify("Не удалось сохранить продолжение.");
    } finally {
      setBusy(false);
    }
  }
  function startRecognition() {
    if (recording) {
      try{recognition.current?.stop();}catch{releaseRecognition();setRecording(false);}
      if(recognitionTimer.current)clearTimeout(recognitionTimer.current);
      recognitionTimer.current=setTimeout(()=>{releaseRecognition();setRecording(false);},2000);
      return;
    }
    const R =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!R) {
      notify(
        "Распознавание недоступно в этом браузере. Можно ввести услышанную фразу вручную.",
      );
      return;
    }
    stopSpeech();
    releaseRecognition();
    let r:any;try{r=new R();}catch{notify('Не удалось включить микрофон. Можно ввести ответ вручную.');return;}
    recognition.current = r;
    r.lang = "bg-BG";
    const watchdog=(ms:number)=>{if(recognitionTimer.current)clearTimeout(recognitionTimer.current);recognitionTimer.current=setTimeout(()=>{if(recognition.current===r){releaseRecognition();setRecording(false);notify('Распознавание не отвечает. Повторите запись или введите ответ.');}},ms);};
    r.onstart = () => {if(recognition.current===r){setRecording(true);watchdog(45000);}};
    r.onend = () => {if(recognition.current===r){releaseRecognition();setRecording(false);}};
    r.onerror = (e: any) => {
      if(recognition.current!==r)return;
      releaseRecognition();setRecording(false);
      notify(
        e.error === "not-allowed"
          ? "Разрешите доступ к микрофону в браузере."
          : `Распознавание: ${e.error}`,
      );
    };
    r.onresult = (e: any) => {
      if(recognition.current!==r)return;
      const text = e.results?.[e.resultIndex??0]?.[0]?.transcript;
      releaseRecognition();setRecording(false);
      if(!text)return;
      setAnswer(text);
      setTranscript(text);
    };
    try {
      stopSpeech();
      setRecording(true);watchdog(8000);
      r.start();
    } catch {
      releaseRecognition();setRecording(false);
      notify("Не удалось начать распознавание.");
    }
  }
  const choice =
    t &&
    [
      "meaning",
      "reverse",
      "listen-choice",
      "article",
      "tense",
      "synonym",
      "antonym",
      "stress",
      "photo-choice",
      "dialogue",
      "reading",
      "speed",
    ].includes(t.type) &&
    !!t.options;
  const hidden =
    t &&
    [
      "reverse",
      "order",
      "dictation",
      "listen-choice",
      "multi",
      "translate-ru",
      "spelling",
      "technical",
      "photo-name",
      "photo-choice",
    ].includes(t.type);
  return (
    <div className="modal-backdrop">
      <div
        className="modal panel extended-player"
        role="dialog"
        aria-modal="true"
        aria-label="Практика академии"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{finished ? "Занятие сохранено" : "Практика академии"}</h2>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Закрыть практику"
          >
            <X />
          </button>
        </div>
        {finished ? (
          <div className="lesson-complete">
            <div className="success-orb">
              <CheckCircle2 size={44} />
            </div>
            <h2>Ещё один шаг к уверенной речи</h2>
            <p>
              {record.correct} из {record.items.length} верных ответов
            </p>
            {onNextLesson && <button className="btn primary full" onClick={onNextLesson}>Следующий урок <ArrowRight size={17}/></button>}
            <button className={`btn ${onNextLesson?'secondary':'primary'} full`} onClick={onClose}>
              Вернуться к материалам <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="lesson-progress">
              <div className="progress-track">
                <i
                  style={{
                    width: `${(record.index / record.items.length) * 100}%`,
                  }}
                />
              </div>
              <span>
                {record.index + 1} / {record.items.length}
              </span>
              {seconds !== null && (
                <span className={seconds === 0 ? "feedback-wrong" : ""}>
                  <Clock size={13} /> {seconds} с
                </span>
              )}
            </div>
            <div className="tags">
              <span>{t.level ?? "Практика"}</span>
              <span>{t.skill}</span>
            </div>
            <h3 className="exercise-prompt">{t.prompt}</h3>
            {t.image && (
              <PhotoImage sizes="(max-width:760px) 90vw, 640px"
                className="practice-photo"
                src={t.image}
                alt="Предмет для определения по фотографии"
              />
            )}
            {t.bg && !hidden && (
              <div className="study-context" lang="bg">
                {t.bg}
                <button
                  className="icon-btn"
                  onClick={() => {preparePlayback();void speak(t.bg!, notify);}}
                  aria-label="Прослушать контекст"
                >
                  <Volume2 size={18} />
                </button>
              </div>
            )}
            {t.ru && ["translate-ru", "gap", "order"].includes(t.type) && (
              <p className="translation-hint">{t.ru}</p>
            )}
            {["dictation", "listen-choice", "multi", "speaking"].includes(
              t.type,
            ) && (
              <InlineAudioControls text={t.bg!} notify={notify} onPlay={preparePlayback}/>
            )}
            {choice ? (
              <div className="answer-options">
                {t.options!.map((o, i) => (
                  <button
                    key={i}
                    disabled={checked}
                    className={`${answer === o ? "selected" : ""} ${checked && t.answers.includes(o) ? "correct" : ""}`}
                    onClick={() => setAnswer(o)}
                  >
                    <span>{i + 1}</span>
                    {o}
                  </button>
                ))}
              </div>
            ) : t.type === "order" ? (
              <>
                <div className="sentence-built">
                  {tokens.map((idx, i) => (
                    <button
                      key={i}
                      disabled={checked}
                      onClick={() =>
                        setTokens((x) => x.filter((_, j) => j !== i))
                      }
                    >
                      {t.options![idx]} <X size={12} />
                    </button>
                  ))}
                </div>
                <div className="word-tokens">
                  {t.options?.map((s, i) => (
                    <button
                      key={i}
                      disabled={checked || tokens.includes(i)}
                      onClick={() => setTokens((x) => [...x, i])}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : t.type === "multi" ? (
              <div className="answer-options">
                {t.options?.map((s, i) => (
                  <button
                    className={selected.includes(s) ? "selected" : ""}
                    key={i}
                    disabled={checked}
                    onClick={() =>
                      setSelected((x) =>
                        x.includes(s) ? x.filter((a) => a !== s) : [...x, s],
                      )
                    }
                  >
                    <span>
                      {selected.includes(s) ? <Check size={15} /> : ""}
                    </span>
                    {s}
                  </button>
                ))}
              </div>
            ) : t.type === "matching" ? (
              <div className="matching-grid">
                <div>
                  {t.pairs?.map((p, i) => (
                    <button
                      className={
                        matches.includes(i)
                          ? "matched"
                          : left === i
                            ? "selected"
                            : ""
                      }
                      disabled={checked || matches.includes(i)}
                      key={i}
                      onClick={() => setLeft(i)}
                    >
                      {p.left}
                    </button>
                  ))}
                </div>
                <div>
                  {rightOrder.map((i) => (
                    <button
                      key={i}
                      className={matches.includes(i) ? "matched" : ""}
                      disabled={checked || matches.includes(i)}
                      onClick={() => {
                        if (left === null) return;
                        if (left === i) {
                          setMatches((m) => [...m, i]);
                          setLeft(null);
                        } else {
                          notify(
                            "Эти значения не совпадают. Попробуйте другую пару.",
                          );
                          setLeft(null);
                        }
                      }}
                    >
                      {t.pairs![i].right}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    checked ? next() : submit();
                  }}
                >
                  <input
                    className="exercise-input"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onFocus={(e) => {
                      setTimeout(() => {
                        (e.target as HTMLElement)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
                      }, 150);
                    }}
                    disabled={checked}
                    aria-label="Ответ на задание"
                    placeholder="Введите ответ…"
                    autoComplete="off"
                  />
                </form>
                <ReactiveKeyboard value={answer} onChange={setAnswer} disabled={checked} />
                {t.type === "speaking" && (
                  <>
                    <button
                      className={`btn ${recording ? "danger" : "secondary"}`}
                      disabled={checked || !navigator.onLine}
                      onClick={startRecognition}
                    >
                      <Mic size={18} />
                      {recording ? "Завершить запись" : "Ответить голосом"}
                    </button>
                    <small className="voice-disclaimer">
                      Аудио может передаваться службе браузера. Оценивается
                      текст, не фонетика.
                    </small>
                    {transcript && (
                      <p className="translation-hint">
                        Распознано: {transcript}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {checked && (
              <div
                className={`answer-feedback ${correct ? "good" : "bad"}`}
                role="status"
              >
                <div>
                  {correct ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Lightbulb size={20} />
                  )}
                  <strong>
                    {correct
                      ? "Верно!"
                      : seconds === 0
                        ? "Время вышло"
                        : `Ответ исходного материала: ${t.type === "matching" ? "пары показаны ниже" : t.answers.join(" / ")}`}
                  </strong>
                </div>
                <p style={{ whiteSpace: "pre-line" }}>{t.explanation}</p>
                {t.bg && hidden && <p lang="bg">{t.bg}</p>}
              </div>
            )}
            {!checked &&
              ["translate-bg", "translate-ru", "spelling"].includes(t.type) && (
                <button className="text-btn" onClick={() => setReveal(true)}>
                  Подсказка из источника
                </button>
              )}
            {reveal && !checked && (
              <p className="translation-hint">{t.answers[0]}</p>
            )}
            <button
              className="btn primary full"
              disabled={busy || (!checked && !response.trim())}
              onClick={() => (checked ? next() : submit())}
            >
              {busy
                ? "Сохраняем…"
                : checked
                  ? record.index + 1 === record.items.length
                    ? "Завершить"
                    : "Дальше"
                  : "Проверить"}
              <ArrowRight size={17} />
            </button>
            {t.source && (
              <a
                className="task-attribution"
                href={t.source}
                target="_blank"
                rel="noreferrer"
              >
                {t.sourceLabel ?? "Источник терминологии / справочный материал"}{" "}
                <ExternalLink size={12} />
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
