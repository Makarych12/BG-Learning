import importedVerbs from "./verb-paradigms.json";
const originalVerbParadigms = [
  {
    bg: "чета",
    ru: "читать",
    present: ["чета", "четеш", "чете", "четем", "четете", "четат"],
    aorist: ["четох", "чете", "чете", "четохме", "четохте", "четоха"],
    imperfect: ["четях", "четеше", "четеше", "четяхме", "четяхте", "четяха"],
    participle: "чел",
    plural: "чели",
  },
  {
    bg: "пиша",
    ru: "писать",
    present: ["пиша", "пишеш", "пише", "пишем", "пишете", "пишат"],
    aorist: ["писах", "писа", "писа", "писахме", "писахте", "писаха"],
    imperfect: ["пишех", "пишеше", "пишеше", "пишехме", "пишехте", "пишеха"],
    participle: "писал",
    plural: "писали",
  },
  {
    bg: "работя",
    ru: "работать",
    present: ["работя", "работиш", "работи", "работим", "работите", "работят"],
    aorist: [
      "работих",
      "работи",
      "работи",
      "работихме",
      "работихте",
      "работиха",
    ],
    imperfect: [
      "работех",
      "работеше",
      "работеше",
      "работехме",
      "работехте",
      "работеха",
    ],
    participle: "работил",
    plural: "работили",
  },
  {
    bg: "говоря",
    ru: "говорить",
    present: ["говоря", "говориш", "говори", "говорим", "говорите", "говорят"],
    aorist: [
      "говорих",
      "говори",
      "говори",
      "говорихме",
      "говорихте",
      "говориха",
    ],
    imperfect: [
      "говорех",
      "говореше",
      "говореше",
      "говорехме",
      "говорехте",
      "говореха",
    ],
    participle: "говорил",
    plural: "говорили",
  },
  {
    bg: "проверявам",
    ru: "проверять",
    present: [
      "проверявам",
      "проверяваш",
      "проверява",
      "проверяваме",
      "проверявате",
      "проверяват",
    ],
    aorist: [
      "проверявах",
      "проверява",
      "проверява",
      "проверявахме",
      "проверявахте",
      "проверяваха",
    ],
    imperfect: [
      "проверявах",
      "проверяваше",
      "проверяваше",
      "проверявахме",
      "проверявахте",
      "проверяваха",
    ],
    participle: "проверявал",
    plural: "проверявали",
  },
];
export const verbParadigms = [
  ...importedVerbs,
  ...originalVerbParadigms.filter(v => !importedVerbs.some(i => i.bg === v.bg)).map(v => ({ ...v, imperative: [null, null] as (string | null)[], presentParticiple: {masculine:null, feminine:null, neuter:null, plural:null}, participles: { masculine: v.participle, feminine: v.participle + "а", neuter: v.participle + "о", plural: v.plural }, aspect: "imperfective", pairs: [] as string[], source: "https://ibl.bas.bg/", license: "Авторский учебный материал", review: "editorial", reflexive: false })),
];
export function paradigm(
  v: (typeof verbParadigms)[number],
  tense: number,
  person: number,
  gender = "m",
  form = "positive",
) {
  const clitic = v.bg.match(/ (се|си)$/)?.[1];
  if (clitic) {
    const strip = (text: string) => text.replace(/ (се|си)$/, "");
    const finite = [v.present, v.aorist, v.imperfect].map(table => strip(table[person]));
    const aux = ["съм", "си", "е", "сме", "сте", "са"][person];
    const past = ["бях", "беше", "беше", "бяхме", "бяхте", "бяха"][person];
    const futurePast = ["щях", "щеше", "щеше", "щяхме", "щяхте", "щяха"][person];
    const cluster = person === 2 ? `${clitic} ${aux}` : `${aux} ${clitic}`;
    const part = strip(person > 2 ? v.plural : v.participles[gender === "f" ? "feminine" : gender === "n" ? "neuter" : "masculine"]);
    const positive = [...finite.map(f=>`${f} ${clitic}`), `${part} ${cluster}`, `${past} ${clitic} ${part}`, `ще ${clitic} ${finite[0]}`, `${futurePast} да ${clitic} ${finite[0]}`, `ще ${cluster} ${part}`, `${futurePast} да ${cluster} ${part}`];
    if (form === "negative") return [...finite.map(f=>`не ${clitic} ${f}`), `не ${cluster} ${part}`, `не ${past} ${clitic} ${part}`, `няма да ${clitic} ${finite[0]}`, `нямаше да ${clitic} ${finite[0]}`, `няма да ${cluster} ${part}`, `нямаше да ${cluster} ${part}`][tense];
    if (form === "question") return [...finite.map(f=>`${f} ли ${clitic}?`), `${part} ли ${cluster}?`, `${past} ли ${clitic} ${part}?`, `ще ${clitic} ${finite[0]} ли?`, `${futurePast} ли да ${clitic} ${finite[0]}?`, `ще ${cluster} ${part} ли?`, `${futurePast} ли да ${cluster} ${part}?`][tense];
    return positive[tense];
  }
  const aux = ["съм", "си", "е", "сме", "сте", "са"][person],
    past = ["бях", "беше", "беше", "бяхме", "бяхте", "бяха"][person],
    futurePast = ["щях", "щеше", "щеше", "щяхме", "щяхте", "щяха"][person];
  const part =
    person > 2
      ? v.plural
      : v.participles[gender === "f" ? "feminine" : gender === "n" ? "neuter" : "masculine"];
  const positive = [
    v.present[person],
    v.aorist[person],
    v.imperfect[person],
    `${part} ${aux}`,
    `${past} ${part}`,
    `ще ${v.present[person]}`,
    `${futurePast} да ${v.present[person]}`,
    `ще ${aux} ${part}`,
    `${futurePast} да ${aux} ${part}`,
  ][tense];
  if (form === "negative") {
    if (tense === 5) return `няма да ${v.present[person]}`;
    if (tense === 6) return `нямаше да ${v.present[person]}`;
    if (tense === 7) return `няма да ${aux} ${part}`;
    if (tense === 8) return `нямаше да ${aux} ${part}`;
    if (tense === 3) return `не ${aux} ${part}`;
    return "не " + positive;
  }
  if (form === "question")
    return [
      `${v.present[person]} ли?`,
      `${v.aorist[person]} ли?`,
      `${v.imperfect[person]} ли?`,
      `${part} ли ${aux}?`,
      `${past} ли ${part}?`,
      `ще ${v.present[person]} ли?`,
      `${futurePast} ли да ${v.present[person]}?`,
      `ще ${aux} ли ${part}?`,
      `${futurePast} ли да ${aux} ${part}?`,
    ][tense];
  return positive;
}
