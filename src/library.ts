import { packageProcessor } from "./package-processor";
import { searchTokens } from "./content-processing";
export { searchTokens } from "./content-processing";
import { sentenceReviewReason } from "./content-quality";
import Dexie, { type Table } from "dexie";
export type Lexeme = {
  id: string;
  bg: string;
  stress: string | null;
  ru: string;
  senses: { gloss: string; tags: string[]; source?: string }[];
  pos: string;
  grammar: string;
  forms: { text: string; tags: string[] }[];
  synonyms: string[];
  antonyms: string[];
  related: string[];
  ipa: string[];
  categories: string[];
  examples: string[];
  active?: boolean;
  morphologySource?: string;
  relationsSource?: string;
  source: string;
  license: string;
  review: string;
  search: string[];
  packId: string;
};
export type Sentence = {
  id: string;
  bg: string;
  ru: string;
  translations: { id: number; text: string; author: string }[];
  author: string;
  source: string;
  license: string;
  review: string;
  audio: null | {
    url: string;
    author: string;
    license: string;
    attribution: string;
  };
  words: number;
  difficulty?: string;
  grammar?: string;
  lexemes?: string[];
  search: string[];
  packId: string;
};
export type ContentPackage = {
  id: string;
  kind: "dictionary" | "sentences";
  title: string;
  count: number;
  bytes: number;
  sha256: string;
  url: string;
};
export type Catalog = {
  schema: 1;
  version: string;
  builtAt: string;
  counts: {
    activeWords?: number;
    contextLinks?: number;
    words: number;
  difficulty?: string;
  grammar?: string;
  lexemes?: string[];
    sentences: number;
    licensedAudio: number;
    stress: number;
  };
  packages: ContentPackage[];
  sources: {
    name: string;
    url: string;
    license: string;
    licenseUrl: string;
    attribution: string;
  }[];
};
export type Installed = {
  id: string;
  version: string;
  count: number;
  kind: string;
  installedAt: number;
  sha256?: string;
};
export type PracticeRecord = {
  id: "current";
  items: Task[];
  index: number;
  correct: number;
  startedAt: number;
  checked?: boolean;
  answer?: string;
  lastCorrect?: boolean;
  courseUnitId?: string;
};
export type Mechanic =
  | "meaning"
  | "reverse"
  | "translate-bg"
  | "translate-ru"
  | "dictation"
  | "listen-choice"
  | "order"
  | "gap"
  | "spelling"
  | "article"
  | "conjugation"
  | "tense"
  | "correction"
  | "synonym"
  | "antonym"
  | "matching"
  | "stress"
  | "photo-choice"
  | "photo-name"
  | "dialogue"
  | "reading"
  | "technical"
  | "speed"
  | "multi"
  | "speaking";
export type Task = {
  id: string;
  type: Mechanic;
  prompt: string;
  bg?: string;
  ru?: string;
  answers: string[];
  options?: string[];
  pairs?: { left: string; right: string }[];
  image?: string;
  explanation: string;
  source?: string;
  sourceLabel?: string;
  wordId?: string;
  skill: string;
  level?: string;
  timeLimit?: number;
  audio?: Sentence["audio"];
  stressSensitive?: boolean;
};
class ContentDB extends Dexie {
  lexemes!: Table<Lexeme, string>;
  sentences!: Table<Sentence, string>;
  packages!: Table<Installed, string>;
  meta!: Table<{ id: string; value: Catalog }, string>;
  constructor() {
    super("chameleon-content");
    this.version(1).stores({
      lexemes: "id,bg,pos,packId,*search",
      sentences: "id,words,packId,*search",
      packages: "id,kind",
      meta: "id",
    });
  }
}
export const contentDB = new ContentDB();
let catalogRequest:Promise<Catalog>|null=null;
let catalogFetched=0;
export function getCatalog():Promise<Catalog>{
 if(catalogRequest&&Date.now()-catalogFetched<60000)return catalogRequest;
 catalogFetched=Date.now();catalogRequest=fetchCatalog().catch(e=>{catalogRequest=null;throw e;});return catalogRequest;
}
async function fetchCatalog(): Promise<Catalog> {
  try {
    const r = await fetch("/content/manifest.json");
    if (!r.ok) throw Error("Каталог недоступен");
    const c = await r.json();
    if (c.schema !== 1 || !Array.isArray(c.packages))
      throw Error("Некорректный каталог");
    await contentDB.meta.put({ id: "catalog", value: c });
    return c;
  } catch (e) {
    const saved = await contentDB.meta.get("catalog");
    if (saved) return saved.value;
    throw e;
  }
}
let installation: Promise<void> | null = null;
let installationSignal: AbortSignal | undefined;
export function installContent(
  catalog: Catalog,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (installation) {
    if (installationSignal?.aborted && !signal?.aborted) return installation.catch(() => {}).then(() => installContent(catalog, onProgress, signal));
    return installation;
  }
  installationSignal = signal;
  installation = (async () => {
    let processor:ReturnType<typeof packageProcessor>|null=null;
    try {
    let done = 0;
    const total = catalog.packages.length;
    const installed=await contentDB.packages.bulkGet(catalog.packages.map(p=>p.id));
    const oldPackages=new Map(installed.filter((p):p is Installed=>!!p).map(p=>[p.id,p]));
    for (const pack of catalog.packages) {
      if (signal?.aborted) break;
      const old = oldPackages.get(pack.id);
      if (old?.version === catalog.version && old.sha256 === pack.sha256) {
        onProgress(++done, total);
        continue;
      }
      const r = await fetch(pack.url + "?v=" + pack.sha256, { signal });
      if (!r.ok) throw Error(`Не удалось загрузить ${pack.title}`);
      const bytes = await r.arrayBuffer();
      processor??=packageProcessor();
      const items=await processor.parse(bytes,pack);
      if(signal?.aborted)break;
      const table: Table<any, string> = pack.kind === "dictionary" ? contentDB.lexemes : contentDB.sentences;
      await contentDB.transaction(
        "rw",
        [table, contentDB.packages],
        async () => {
          await table.where("packId").equals(pack.id).delete();
          await table.bulkPut(items);
          await contentDB.packages.put({
            id: pack.id,
            version: catalog.version,
            count: items.length,
            kind: pack.kind,
            installedAt: Date.now(),
            sha256: pack.sha256,
          });
        },
      );
      onProgress(++done, total);
    }
    } finally { processor?.close(); }
  })().finally(() => {
    installation = null;
    installationSignal = undefined;
  });
  return installation;
}
export async function searchLexemes(query: string, offset = 0, pos = "all", activeOnly = false) {
  const token = searchTokens(query)[0];
  let collection = token
    ? contentDB.lexemes.where("search").startsWith(token).distinct()
    : contentDB.lexemes.orderBy("bg");
  if (activeOnly) collection = collection.filter(w => !!w.active);
  if (pos !== "all") collection = collection.filter((w) => w.pos === pos);
  const allTokens = searchTokens(query);
  if (allTokens.length > 1)
    collection = collection.filter((w) =>
      allTokens.every((t) => w.search.some((s) => s.startsWith(t))),
    );
  return collection.offset(offset).limit(36).toArray();
}
export async function searchSentences(query: string, offset = 0) {
  const token = searchTokens(query)[0];
  let collection = token
    ? contentDB.sentences.where("search").startsWith(token).distinct()
    : contentDB.sentences.orderBy("words");
  const allTokens = searchTokens(query);
  if (allTokens.length > 1)
    collection = collection.filter((s) =>
      allTokens.every((t) => s.search.some((x) => x.startsWith(t))),
    );
  return collection.offset(offset).limit(24).toArray();
}
function randomized<T>(rows:T[]):T[] {
  const result=[...rows];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
async function sampleTable<T>(table:Table<T,string>,count:number,filter:(row:T)=>boolean):Promise<T[]> {
  if(count<=0)return [];
  const total=await table.count(),size=256,result:T[]=[];
  // Every chunk is reachable, including the last one. Sparse filters scan further.
  for(const chunk of randomized(Array.from({length:Math.ceil(total/size)},(_,i)=>i))){
    const rows=await table.offset(chunk*size).limit(size).toArray();
    result.push(...randomized(rows.filter(filter)));
    if(result.length>=count)break;
  }
  return randomized(result).slice(0,count);
}
export async function randomLexemes(count=20,filter?:(w:Lexeme)=>boolean){
  return sampleTable(contentDB.lexemes,count,filter??(()=>true));
}
export async function randomSentences(count=10,maxWords=25,filter?:(s:Sentence)=>boolean){
  return sampleTable(contentDB.sentences,count,s=>s.words>=3&&s.words<=maxWords&&!sentenceReviewReason(s)&&(!filter||filter(s)));
}
