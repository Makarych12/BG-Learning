import React, { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { voiceScenarios, type VoiceScenario, type VoiceTheme } from "./voice-scenarios";
import { speak, stopSpeech, pauseSpeech, resumeSpeech, configureAudio, audioState, subscribeAudio } from "./speech";
import type { Level } from "./content";

interface VoiceLabProps {
  notify: (msg: string) => void;
  onLaunchPractice?: () => void;
}

const THEME_NAMES: Record<VoiceTheme | "all", string> = {
  all: "Все темы",
  store: "Магазин и покупки",
  transit: "Транспорт и вокзал",
  work: "Работа и коллеги",
  housing: "Жильё и аренда",
  doctor: "Врач и здоровье",
  documents: "Документы и банк",
  dining: "Кафе и ресторан",
  interview: "Собеседование",
  manager: "Разговор с руководителем",
  depot: "Депо и приёмка",
  maintenance: "Обслуживание и тормоза",
  faults: "Неисправности и безопасность",
};

export const VoiceLab: React.FC<VoiceLabProps> = ({ notify }) => {
  const [selectedTheme, setSelectedTheme] = useState<VoiceTheme | "all">("all");
  const [selectedLevel, setSelectedLevel] = useState<Level | "all">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const playback = useSyncExternalStore(subscribeAudio, audioState);
  const [speed, setSpeed] = useState<number>(0.85);

  // Interaction mode & speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [useTextInput, setUseTextInput] = useState(false);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTurn, setActiveTurn] = useState<"initial" | "followUp">("initial");

  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("chameleon_voice_completed");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const recognitionRef = useRef<any>(null);
  const sessionRef = useRef<HTMLDivElement>(null);

  const speechSupported = typeof window !== "undefined" && !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const filteredScenarios = useMemo(() => {
    return voiceScenarios.filter((s) => {
      const matchTheme = selectedTheme === "all" || s.theme === selectedTheme;
      const matchLevel = selectedLevel === "all" || s.level === selectedLevel;
      return matchTheme && matchLevel;
    });
  }, [selectedTheme, selectedLevel]);

  const currentScenario: VoiceScenario | undefined = filteredScenarios[currentIndex] || filteredScenarios[0];

  const releaseRecognition = (updateState=true) => {
    const r=recognitionRef.current;recognitionRef.current=null;
    if(r){r.onresult=r.onend=r.onerror=r.onstart=null;try{r.abort();}catch{}}
    if(updateState)setIsRecording(false);
  };
  const resetScenario = () => {
    // Reset inputs on scenario change
    setSpeechTranscript("");
    setTypedInput("");
    setIsEvaluated(false);
    setStatusMessage("");
    setActiveTurn("initial");
    if (sessionRef.current) sessionRef.current.scrollTop=0;
    stopSpeech();
    releaseRecognition();
  };
  useEffect(resetScenario, [currentIndex, selectedTheme, selectedLevel]);

  useEffect(()=>()=>{stopSpeech();releaseRecognition(false);},[]);

  const partnerPrompt = activeTurn === "initial"
    ? currentScenario?.partnerPromptBg
    : currentScenario?.followUp?.partner;

  const partnerPromptRu = activeTurn === "initial"
    ? currentScenario?.partnerPromptRu
    : "Ответ собеседника";

  const targetResponse = activeTurn === "initial"
    ? currentScenario?.targetResponseBg
    : currentScenario?.followUp?.target;

  const targetResponseRu = activeTurn === "initial"
    ? currentScenario?.targetResponseRu
    : currentScenario?.followUp?.targetRu;

  // Play audio helper
  const playAudio = (text?: string, rate = speed) => {
    if (!text) return;
    releaseRecognition();
    speak(text, notify, rate);
  };

  // Start speech recognition
  const startRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!speechSupported) {
      setUseTextInput(true);
      notify("Распознавание речи не поддерживается в этом браузере. Включён текстовый режим.");
      return;
    }

    releaseRecognition();
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SpeechRec();
    r.lang = "bg-BG";
    r.interimResults = false;
    r.maxAlternatives = 3;
    recognitionRef.current = r;

    r.onstart = () => {
      setIsRecording(true);
      setStatusMessage("Слушаю вас на болгарском... Говорите в микрофон.");
      setSpeechTranscript("");
      setIsEvaluated(false);
    };

    r.onresult = (event: any) => {
      const heard = event.results[0][0].transcript;
      setSpeechTranscript(heard);
      setIsRecording(false);
      evaluateResponse(heard);
    };

    r.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error === "not-allowed") {
        setStatusMessage("Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера или используйте текстовый режим.");
      } else {
        setStatusMessage(`Ошибка распознавания (${e.error}). Попробуйте сказать фразу ещё раз чётче или введите ответ текстом.`);
      }
    };

    r.onend = () => {
      setIsRecording(false);
    };

    try {
      stopSpeech();
      setIsRecording(true);
      r.start();
    } catch {
      setIsRecording(false);
      setStatusMessage("Не удалось включить микрофон. Попробуйте текстовый режим ввода.");
    }
  };

  // Evaluate user response against target & alternatives
  const evaluateResponse = (userText: string) => {
    if (!targetResponse || !currentScenario) return;
    setIsEvaluated(true);

    const norm = (s: string) =>
      s.trim().toLowerCase().replace(/[.,!?:;«»"-]/g, "").replace(/\s+/g, " ");

    const normUser = norm(userText);
    const normTarget = norm(targetResponse);
    const validAlts = (activeTurn === "initial" ? currentScenario.alternatives || [] : []).map(norm);

    const matchedExact = normUser === normTarget || validAlts.includes(normUser);
    const wordsUser = normUser.split(" ");
    const wordsTarget = normTarget.split(" ");
    const commonWords = wordsUser.filter((w) => wordsTarget.includes(w));
    const overlapRatio = commonWords.length / Math.max(1, wordsTarget.length);

    if (matchedExact && !!normUser) {
      setStatusMessage("Отлично! Ответ распознан верно и грамматически точен.");
      notify("Великолепно! Фраза принята.");
      const updated = { ...completedIds, ...(!currentScenario.followUp || activeTurn === "followUp" ? {[currentScenario.id]: true} : {}) };
      setCompletedIds(updated);
      try {
        localStorage.setItem("chameleon_voice_completed", JSON.stringify(updated));
      } catch {}
    } else if (overlapRatio >= 0.4) {
      setStatusMessage("Хорошая попытка, но есть расхождения в словах или окончаниях. Сравните с эталоном ниже.");
      notify("Фраза понята частично. Изучите разбор слов.");
    } else {
      setStatusMessage("Распознанный текст отличается от необходимого ответа. Прослушайте эталон и повторите.");
      notify("Попробуйте повторить ответ чётче.");
    }
  };

  // Word-by-word diff calculation
  const wordDiff = useMemo(() => {
    const textToCompare = useTextInput ? typedInput : speechTranscript;
    if (!isEvaluated || !textToCompare || !targetResponse) return null;

    const norm = (s: string) => s.trim().toLowerCase().replace(/[.,!?:;«»"-]/g, "");
    const userWords = textToCompare.trim().split(/\s+/).map((w) => ({ raw: w, clean: norm(w) }));
    const targetWords = targetResponse.trim().split(/\s+/).map((w) => ({ raw: w, clean: norm(w) }));

    const targetSet = new Set(targetWords.map((t) => t.clean));

    return userWords.map((uw) => ({
      word: uw.raw,
      isMatch: targetSet.has(uw.clean),
    }));
  }, [isEvaluated, useTextInput, typedInput, speechTranscript, targetResponse]);

  const handleNext = () => {
    resetScenario();
    if (currentIndex < filteredScenarios.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    resetScenario();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(filteredScenarios.length - 1);
    }
  };

  const completedCount = Object.keys(completedIds).length;

  if (!currentScenario) {
    return (
      <section className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Сценарии не найдены</h3>
        <p>Попробуйте выбрать другую тему или уровень.</p>
        <button className="btn primary" onClick={() => { setSelectedTheme("all"); setSelectedLevel("all"); }}>
          Сбросить фильтры
        </button>
      </section>
    );
  }

  return (
    <section className="panel voice-lab" style={{ margin: "1.5rem 0", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <span className="hero-tag" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 600 }}>
            ГОЛОСОВОЙ РЕЖИМ · {voiceScenarios.length} РАЗГОВОРНЫХ СИТУАЦИЙ
          </span>
          <h2 style={{ margin: "0.5rem 0 0.25rem 0", fontSize: "1.6rem" }}>
            Речевая практика и диалоги
          </h2>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "0.95rem" }}>
            Практикуйте живую болгарскую речь: магазин, вокзал, приёмка локомотивов в депо и рапорты диспетчеру.
          </p>
        </div>
        <div style={{ textAlign: "right", background: "rgba(255,255,255,0.04)", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>Освоено ситуаций</div>
          <strong style={{ fontSize: "1.2rem", color: "#34d399" }}>
            {completedCount} / {voiceScenarios.length}
          </strong>
        </div>
      </div>

      {/* Theme and Level selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.15)", borderRadius: "10px" }}>
        {/* Theme Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {(Object.keys(THEME_NAMES) as (VoiceTheme | "all")[]).map((theme) => {
            const active = selectedTheme === theme;
            return (
              <button
                key={theme}
                className={`btn ${active ? "primary" : "secondary"}`}
                style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: "14px" }}
                onClick={() => { setSelectedTheme(theme); setCurrentIndex(0); }}
              >
                {THEME_NAMES[theme]}
              </button>
            );
          })}
        </div>

        {/* Levels */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
          <span style={{ opacity: 0.7 }}>Уровень:</span>
          {(["all", "A1", "A2", "B1", "B2"] as const).map((lvl) => (
            <button
              key={lvl}
              className={`btn ${selectedLevel === lvl ? "primary" : "secondary"}`}
              style={{ fontSize: "0.78rem", padding: "3px 10px", borderRadius: "12px" }}
              onClick={() => { setSelectedLevel(lvl); setCurrentIndex(0); }}
            >
              {lvl === "all" ? "Все уровни" : lvl}
            </button>
          ))}
          <span style={{ marginLeft: "auto", opacity: 0.6 }}>
            Доступно ситуаций: {filteredScenarios.length}
          </span>
        </div>
      </div>

      <div className="voice-playback" aria-label="Воспроизведение реплики">
        <span role="status">{playback.status === 'loading' ? 'Загружаем звук…' : playback.status === 'playing' ? 'Воспроизводится реплика' : playback.status === 'paused' ? 'Пауза' : playback.status === 'error' ? playback.error : 'Готово к прослушиванию'}</span>
        <div><button className="btn secondary" disabled={!['playing','paused'].includes(playback.status)} onClick={()=>playback.status === 'paused' ? void resumeSpeech() : pauseSpeech()}>{playback.status === 'paused' ? 'Продолжить звук' : 'Пауза'}</button><button className="btn secondary" disabled={playback.status === 'idle'} onClick={stopSpeech}>Остановить звук</button></div>
      </div>
      {/* Scenario Context Card */}
      <div ref={sessionRef} className="voice-session" role="region" aria-label="Текущая разговорная ситуация" tabIndex={0} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "#059669", color: "#fff", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
              {currentScenario.level}
            </span>
            <span style={{ opacity: 0.6, fontSize: "0.85rem" }}>
              #{currentIndex + 1} из {filteredScenarios.length} · {currentScenario.themeTitle}
            </span>
          </div>
          {completedIds[currentScenario.id] && (
            <span style={{ color: "#34d399", fontSize: "0.85rem", fontWeight: 600 }}>
              ✓ Ситуация освоена
            </span>
          )}
        </div>

        <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.5rem 0", color: "#f3f4f6" }}>
          {currentScenario.title}
        </h3>
        <p style={{ margin: "0 0 1.25rem 0", opacity: "0.85", fontSize: "0.95rem", color: "#93c5fd" }}>
          Контекст: {currentScenario.situation}
        </p>

        {/* Partner prompt dialogue balloon */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", borderRadius: "10px", padding: "1rem 1.25rem", borderLeft: "4px solid #38bdf8", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#38bdf8", fontWeight: 700 }}>
              Собеседник говорит:
            </span>
            <button
              className="btn secondary"
              onClick={() => playAudio(partnerPrompt)}
              style={{ fontSize: "0.75rem", padding: "2px 8px" }}
            >
              🔊 Озвучить
            </button>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", marginBottom: "4px" }} lang="bg">
            «{partnerPrompt}»
          </div>
          <div style={{ fontSize: "0.9rem", opacity: 0.8, color: "#cbd5e1" }}>
            {partnerPromptRu}
          </div>
        </div>

        {/* Hints */}
        {currentScenario.hints && currentScenario.hints.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.7, alignSelf: "center", marginRight: "4px" }}>Подсказки:</span>
            {currentScenario.hints.map((h, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "8px", fontSize: "0.75rem", color: "#fbbf24" }}>
                {h}
              </span>
            ))}
          </div>
        )}

        {/* User Interaction Studio (Mic or Text) */}
        <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>
              Ваш ответ на болгарском:
            </span>
            <button
              className="btn secondary"
              onClick={() => {releaseRecognition();setUseTextInput(!useTextInput);}}
              style={{ fontSize: "0.75rem", padding: "2px 8px" }}
            >
              {useTextInput ? "🎤 Включить микрофон" : "⌨ Ввод текста"}
            </button>
          </div>

          {!useTextInput ? (
            /* Microphone voice recording control */
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                <button
                  className={`btn ${isRecording ? "danger" : "primary"}`}
                  onClick={startRecording}
                  style={{
                    minWidth: "160px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: isRecording ? "#ef4444" : undefined,
                    boxShadow: isRecording ? "0 0 15px rgba(239,68,68,0.5)" : undefined
                  }}
                >
                  {isRecording ? "⏹ Остановить запись" : "🎙 Записать ответ"}
                </button>

                <button
                  className="btn secondary"
                  onClick={() => playAudio(targetResponse, speed)}
                  style={{ fontSize: "0.85rem" }}
                  title="Прослушать эталонное произношение"
                >
                  🔊 Эталон речи
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
                  <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Скорость:</span>
                  {[0.75, 0.85, 1.0].map((s) => (
                    <button
                      key={s}
                      className={`btn ${speed === s ? "primary" : "secondary"}`}
                      style={{ fontSize: "0.72rem", padding: "2px 6px" }}
                      onClick={() => {setSpeed(s);configureAudio({rate:s});}}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {speechTranscript && (
                <div style={{ padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "2px" }}>Распознано:</div>
                  <div style={{ fontSize: "1.05rem", color: "#38bdf8", fontWeight: 500 }} lang="bg">
                    {speechTranscript}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Text input fallback mode */
            <div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "0.5rem" }}>
                <input
                  type="text"
                  aria-label="Ответ на болгарском"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && typedInput.trim()) evaluateResponse(typedInput); }}
                  placeholder="Напишите ответ на болгарском..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "1rem"
                  }}
                />
                <button
                  className="btn primary"
                  disabled={!typedInput.trim()}
                  onClick={() => evaluateResponse(typedInput)}
                >
                  Проверить
                </button>
              </div>
              <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
                💡 Режим ввода полезен при отсутствии микрофона или для тренировки правописания.
              </p>
            </div>
          )}

          {statusMessage && (
            <div style={{ fontSize: "0.85rem", color: "#fcd34d", marginTop: "8px" }}>
              {statusMessage}
            </div>
          )}
        </div>

        {/* Word Diff / Analysis */}
        {wordDiff && (
          <div style={{ background: "rgba(0,0,0,0.25)", padding: "12px", borderRadius: "8px", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, marginBottom: "6px" }}>
              Сравнение слов с эталоном:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {wordDiff.map((wd, i) => (
                <span
                  key={i}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: wd.isMatch ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)",
                    border: wd.isMatch ? "1px solid #10b981" : "1px solid #ef4444",
                    color: wd.isMatch ? "#6ee7b7" : "#fca5a5",
                    fontSize: "0.95rem"
                  }}
                >
                  {wd.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Target Response & Translation Details */}
        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "10px", borderLeft: "4px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#34d399", fontWeight: 700 }}>
              Эталонный болгарский ответ:
            </span>
            <button
              className="btn secondary"
              onClick={() => playAudio(targetResponse, speed)}
              style={{ fontSize: "0.75rem", padding: "2px 8px" }}
            >
              🔊 Произнести
            </button>
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#6ee7b7", marginBottom: "4px" }} lang="bg">
            {targetResponse}
          </div>
          <div style={{ fontSize: "0.9rem", opacity: 0.85, color: "#e2e8f0" }}>
            {targetResponseRu}
          </div>
        </div>

        {/* Multi-turn continuation button */}
        {currentScenario.followUp && activeTurn === "initial" && isEvaluated && (
          <div style={{ marginTop: "1rem", textAlign: "right" }}>
            <button
              className="btn primary"
              onClick={() => {
                stopSpeech();
                releaseRecognition();
                if (sessionRef.current) sessionRef.current.scrollTop=0;
                setActiveTurn("followUp");
                setSpeechTranscript("");
                setTypedInput("");
                setIsEvaluated(false);
                setStatusMessage("");
              }}
              style={{ background: "#7c3aed" }}
            >
              Продолжить диалог (следующая реплика) →
            </button>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="voice-navigation" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn secondary" onClick={handlePrev}>
            ← Предыдущая ситуация
          </button>
          <button className="btn secondary" onClick={handleNext}>
            Следующая ситуация →
          </button>
        </div>
        <button
          className="btn secondary"
          onClick={() => {
            resetScenario();
            const nextIdx = filteredScenarios.length > 1 ? (currentIndex + 1 + Math.floor(Math.random() * (filteredScenarios.length - 1))) % filteredScenarios.length : 0;
            setCurrentIndex(nextIdx);
          }}
          style={{ fontSize: "0.85rem" }}
        >
          🎲 Случайная ситуация
        </button>
      </div>
    </section>
  );
};
