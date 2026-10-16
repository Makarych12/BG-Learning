import type { Mechanic } from "./library";
export const mechanics: { id: Mechanic; name: string; description: string }[] =
  [
    {
      id: "meaning",
      name: "Слово → значение",
      description: "Выберите русское значение словарной статьи",
    },
    {
      id: "reverse",
      name: "Значение → слово",
      description: "Узнайте болгарское слово по русскому значению",
    },
    {
      id: "translate-bg",
      name: "Перевод BG → RU",
      description: "Воспроизведите русский перевод из контекста",
    },
    {
      id: "translate-ru",
      name: "Перевод RU → BG",
      description: "Восстановите исходную болгарскую фразу",
    },
    {
      id: "dictation",
      name: "Аудиодиктант",
      description: "Прослушайте и напишите услышанное",
    },
    {
      id: "listen-choice",
      name: "Слушай и выбирай",
      description: "Соотнесите речь с переводом",
    },
    {
      id: "order",
      name: "Конструктор предложений",
      description: "Соберите исходную фразу из слов",
    },
    {
      id: "gap",
      name: "Пропущенное слово",
      description: "Восстановите слово из оригинального контекста",
    },
    {
      id: "spelling",
      name: "Активный словарь",
      description: "Напишите слово по памяти",
    },
    {
      id: "article",
      name: "Артикли",
      description: "Полный, краткий и определённый артикль",
    },
    {
      id: "conjugation",
      name: "Спряжение",
      description: "Личные формы и составные времена",
    },
    {
      id: "tense",
      name: "Узнай время",
      description: "Определите временную форму по предложению",
    },
    {
      id: "correction",
      name: "Редактор",
      description: "Исправьте конструкцию, а не угадывайте слово",
    },
    {
      id: "synonym",
      name: "Синонимы",
      description: "Смысловая связь из словарного источника",
    },
    {
      id: "antonym",
      name: "Антонимы",
      description: "Найдите противоположное значение",
    },
    {
      id: "matching",
      name: "Соедини пары",
      description: "Сопоставьте четыре слова и значения",
    },
    {
      id: "stress",
      name: "Ударение",
      description: "Положение ударения, указанное в источнике",
    },
    {
      id: "photo-choice",
      name: "Фото → слово",
      description: "Узнайте предмет по настоящей фотографии",
    },
    {
      id: "photo-name",
      name: "Назови предмет",
      description: "Введите болгарское название на фотографии",
    },
    {
      id: "dialogue",
      name: "Ответ в диалоге",
      description: "Выберите уместную реплику собеседника",
    },
    {
      id: "reading",
      name: "Понимание текста",
      description: "Прочитайте фразу и выберите её перевод",
    },
    {
      id: "technical",
      name: "Технический термин",
      description: "Профессиональное значение без русской подсказки",
    },
    { id: "speed", name: "Спринт", description: "Ответьте за 20 секунд" },
    {
      id: "multi",
      name: "Внимательное слушание",
      description: "Отметьте все слова, которые услышали",
    },
    {
      id: "speaking",
      name: "Скажи вслух",
      description: "Распознавание текста вашей реплики",
    },
  ];
