import React, { useState, useEffect, useMemo,useSyncExternalStore } from "react";
import { listeningTasks, type ListeningTask, type ListeningCategory } from "./listening-tasks";
import { speak, stopSpeech,configureAudio,audioState,subscribeAudio } from "./speech";
import type { Level } from "./content";

interface ListeningLabProps {
  notify: (msg: string) => void;
  onLaunchPractice?: () => void;
}

const CATEGORY_NAMES: Record<ListeningCategory | "all", string> = {
  all: "Все категории",
  phrases: "Короткие фразы",
  numbers_time: "Числа, время и даты",
  announcements: "Вокзальные объявления",
  railway: "Ж/Д радиопереговоры BDZ",
  dialogues: "Диалоги на слух",
  monologues: "Рассказы и монологи",
};

const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/[.,!?:;«»"-]/g, "");

export const ListeningLab: React.FC<ListeningLabProps> = ({ notify }) => {
  const [selectedCategory, setSelectedCategory] = useState<ListeningCategory | "all">("all");
  const [selectedLevel, setSelectedLevel] = useState<Level | "all">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const playback=useSyncExternalStore(subscribeAudio,audioState);
  const speed=playback.rate;
  const isPlaying=playback.status==='playing'||playback.status==='loading';
  const [userInput, setUserInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("chameleon_listening_completed");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Filter tasks based on category and level
  const filteredTasks = useMemo(() => {
    return listeningTasks.filter((t) => {
      const matchCat = selectedCategory === "all" || t.category === selectedCategory;
      const matchLvl = selectedLevel === "all" || t.level === selectedLevel;
      return matchCat && matchLvl;
    });
  }, [selectedCategory, selectedLevel]);

  // Current active task
  const currentTask: ListeningTask | undefined = filteredTasks[currentIndex] || filteredTasks[0];

  useEffect(() => {
    // Reset state on task switch
    setUserInput("");
    setSelectedOption(null);
    setIsSubmitted(false);
    setShowFullTranscript(false);
    stopSpeech();
  }, [currentIndex, selectedCategory, selectedLevel]);

  useEffect(()=>()=>stopSpeech(),[]);

  // Auto-play audio when task changes if user previously played
  const handlePlayAudio = (rate = speed, textToPlay?: string) => {
    if (!currentTask) return;
    const text = textToPlay || currentTask.audioText;
    speak(text, notify, rate);
  };

  const handleStopAudio = () => {
    stopSpeech();
  };

  const handleSubmit = () => {
    if (!currentTask) return;
    setIsSubmitted(true);
    setShowFullTranscript(true);

    let isCorrect = false;
    if (currentTask.type === "choice" || currentTask.type === "comprehension") {
      isCorrect = selectedOption?.trim().toLowerCase() === currentTask.answer.trim().toLowerCase();
    } else {
      const cleanUser = normalizeAnswer(userInput);
      const cleanAns = normalizeAnswer(currentTask.answer);
      isCorrect = !!cleanUser && cleanUser === cleanAns;
    }

    if (isCorrect) {
      notify("Отлично! Ответ верный.");
      const updated = { ...completedIds, [currentTask.id]: true };
      setCompletedIds(updated);
      try {
        localStorage.setItem("chameleon_listening_completed", JSON.stringify(updated));
      } catch {}
    } else {
      notify("Есть неточность. Изучите правильный ответ и текст.");
    }
  };

  const resetExercise = () => {setUserInput("");setSelectedOption(null);setIsSubmitted(false);setShowFullTranscript(false);stopSpeech();};
  const handleNext = () => {
    resetExercise();
    if (currentIndex < filteredTasks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    resetExercise();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(filteredTasks.length - 1);
    }
  };

  const handleRandom = () => {
    resetExercise();
    const nextIdx = filteredTasks.length > 1 ? (currentIndex + 1 + Math.floor(Math.random() * (filteredTasks.length - 1))) % filteredTasks.length : 0;
    setCurrentIndex(nextIdx);
  };

  const completedCount = Object.keys(completedIds).length;

  if (!currentTask) {
    return (
      <section className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Упражнения не найдены</h3>
        <p>Попробуйте сбросить фильтры уровней или категорий.</p>
        <button className="btn primary" onClick={() => { setSelectedCategory("all"); setSelectedLevel("all"); }}>
          Показать все упражнения
        </button>
      </section>
    );
  }

  return (
    <section className="panel listening-lab" style={{ margin: "1.5rem 0", padding: "1.5rem" }}>
      {/* Header with Title & Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <span className="hero-tag" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 600 }}>
            ТРЕНАЖЁР АУДИРОВАНИЯ · {listeningTasks.length} УПРАЖНЕНИЙ
          </span>
          <h2 style={{ margin: "0.5rem 0 0.25rem 0", fontSize: "1.6rem" }}>
            Лаборатория понимания речи
          </h2>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "0.95rem" }}>
            Слушайте естественную болгарскую речь: фразы, вокзальные объявления, переговоры машинистов BDZ и монологи.
          </p>
        </div>
        <div style={{ textAlign: "right", background: "rgba(255,255,255,0.04)", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>Прогресс аудирования</div>
          <strong style={{ fontSize: "1.2rem", color: "#34d399" }}>
            {completedCount} / {listeningTasks.length}
          </strong>
          <span style={{ fontSize: "0.85rem", opacity: 0.7, marginLeft: "4px" }}>выполнено</span>
        </div>
      </div>

      {/* Filters: Categories & Levels */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.15)", borderRadius: "10px" }}>
        {/* Category Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {(Object.keys(CATEGORY_NAMES) as (ListeningCategory | "all")[]).map((cat) => {
            const count = cat === "all" ? listeningTasks.length : listeningTasks.filter((t) => t.category === cat).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                className={`btn ${active ? "primary" : "secondary"}`}
                style={{ fontSize: "0.82rem", padding: "5px 12px", borderRadius: "16px" }}
                onClick={() => { setSelectedCategory(cat); setCurrentIndex(0); }}
              >
                {CATEGORY_NAMES[cat]} ({count})
              </button>
            );
          })}
        </div>

        {/* Level Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
          <span style={{ opacity: 0.7 }}>Уровень:</span>
          {(["all", "A1", "A2", "B1", "B2"] as const).map((lvl) => (
            <button
              key={lvl}
              className={`btn ${selectedLevel === lvl ? "primary" : "secondary"}`}
              style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "12px" }}
              onClick={() => { setSelectedLevel(lvl); setCurrentIndex(0); }}
            >
              {lvl === "all" ? "Все уровни" : lvl}
            </button>
          ))}
          <span style={{ marginLeft: "auto", opacity: 0.6 }}>
            Найдено: {filteredTasks.length} упражнений
          </span>
        </div>
      </div>

      {/* Active Exercise Card */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Exercise Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "#2563eb", color: "#fff", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
              {currentTask.level}
            </span>
            <span style={{ opacity: 0.6, fontSize: "0.85rem" }}>
              #{currentIndex + 1} из {filteredTasks.length} · {currentTask.title}
            </span>
          </div>
          {completedIds[currentTask.id] && (
            <span style={{ color: "#34d399", fontSize: "0.85rem", fontWeight: 600 }}>
              ✓ Выполнено
            </span>
          )}
        </div>

        {/* Question Prompt */}
        <h3 style={{ fontSize: "1.15rem", margin: "0 0 1.25rem 0", color: "#f3f4f6" }}>
          {currentTask.prompt}
        </h3>

        {/* Audio Player Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", padding: "1rem", background: "rgba(15, 23, 42, 0.4)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "1.5rem" }}>
          <button
            className="btn primary"
            onClick={() => (isPlaying ? handleStopAudio() : handlePlayAudio())}
            style={{ minWidth: "120px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            {isPlaying ? "⏹ Стоп" : "▶ Слушать"}
          </button>

          <button
            className="btn secondary"
            onClick={() => handlePlayAudio(0.75)}
            title="Воспроизвести медленнее"
            style={{ fontSize: "0.85rem" }}
          >
            🐢 Медленно
          </button>

          {/* Speed Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", marginLeft: "auto" }}>
            <span style={{ fontSize: "0.8rem", opacity: 0.7, marginRight: "4px" }}>Скорость:</span>
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <button
                key={s}
                className={`btn ${speed === s ? "primary" : "secondary"}`}
                style={{ fontSize: "0.75rem", padding: "3px 8px", minWidth: "42px" }}
                onClick={() => configureAudio({rate:s})}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Answer Input or Options */}
        <div style={{ marginBottom: "1.5rem" }}>
          {currentTask.type === "choice" || currentTask.type === "comprehension" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "10px" }}>
              {currentTask.options?.map((opt, i) => {
                const isSelected = selectedOption === opt;
                const isCorrect = isSubmitted && opt.trim().toLowerCase() === currentTask.answer.trim().toLowerCase();
                const isWrong = isSubmitted && isSelected && !isCorrect;

                let borderStyle = "1px solid rgba(255,255,255,0.1)";
                let bgStyle = "rgba(255,255,255,0.03)";
                if (isSelected) {
                  borderStyle = "2px solid #3b82f6";
                  bgStyle = "rgba(59, 130, 246, 0.15)";
                }
                if (isSubmitted) {
                  if (isCorrect) {
                    borderStyle = "2px solid #10b981";
                    bgStyle = "rgba(16, 185, 129, 0.2)";
                  } else if (isWrong) {
                    borderStyle = "2px solid #ef4444";
                    bgStyle = "rgba(239, 68, 68, 0.2)";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => !isSubmitted && setSelectedOption(opt)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "8px",
                      textAlign: "left",
                      background: bgStyle,
                      border: borderStyle,
                      cursor: isSubmitted ? "default" : "pointer",
                      color: "#f3f4f6",
                      transition: "all 0.2s",
                      fontSize: "0.95rem"
                    }}
                  >
                    <span style={{ opacity: 0.6, marginRight: "8px" }}>{String.fromCharCode(65 + i)})</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", opacity: 0.8 }}>
                {currentTask.type === "dictation" ? "Введите услышанный текст на болгарском:" : "Введите пропущенное слово:"}
              </label>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isSubmitted && userInput.trim()) handleSubmit(); }}
                disabled={isSubmitted}
                placeholder={currentTask.type === "dictation" ? "Запишите предложение..." : "Пропущенное слово..."}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.3)",
                  border: isSubmitted
                    ? (!!normalizeAnswer(userInput) && normalizeAnswer(userInput) === normalizeAnswer(currentTask.answer)
                      ? "2px solid #10b981"
                      : "2px solid #ef4444")
                    : "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {!isSubmitted ? (
            <button
              className="btn primary"
              disabled={!(selectedOption || userInput.trim())}
              onClick={handleSubmit}
              style={{ minWidth: "140px" }}
            >
              Проверить ответ
            </button>
          ) : (
            <button
              className="btn primary"
              onClick={handleNext}
              style={{ minWidth: "140px" }}
            >
              Следующее упражнение →
            </button>
          )}

          <button
            className="btn secondary"
            onClick={() => setShowFullTranscript(!showFullTranscript)}
            style={{ fontSize: "0.85rem" }}
          >
            {showFullTranscript ? "Скрыть текст и перевод" : "Показать текст и перевод"}
          </button>
        </div>

        {/* Revealed Transcript, Translation & Explanation */}
        {showFullTranscript && (
          <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: "10px", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.05em", marginBottom: "4px" }}>
                Болгарский текст (оригинал):
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "1.05rem", color: "#60a5fa" }} lang="bg">
                  {currentTask.audioText}
                </strong>
                <button
                  className="btn secondary"
                  onClick={() => handlePlayAudio(speed)}
                  style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                >
                  🔊 Повторить
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.05em", marginBottom: "4px" }}>
                Точный русский перевод:
              </div>
              <div style={{ fontSize: "0.95rem", opacity: 0.9 }}>
                {currentTask.translation}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.05em", marginBottom: "4px" }}>
                Разбор и комментарий:
              </div>
              <div style={{ fontSize: "0.9rem", color: "#34d399", opacity: 0.95 }}>
                {currentTask.explanation}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn secondary" onClick={handlePrev}>
            ← Назад
          </button>
          <button className="btn secondary" onClick={handleNext}>
            Вперёд →
          </button>
        </div>
        <button className="btn secondary" onClick={handleRandom} style={{ fontSize: "0.85rem" }}>
          🎲 Случайное упражнение
        </button>
      </div>
    </section>
  );
};
