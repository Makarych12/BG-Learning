import {it,expect,beforeEach} from 'vitest';
import {contentDB,randomSentences,type Sentence} from './library';
import {sentenceReviewReason} from './content-quality';
beforeEach(()=>contentDB.sentences.clear());
const sentence=(id:string,review='source-human-parallel'):Sentence=>({id,bg:'Това е нашият влак.',ru:'Это наш поезд.',translations:[{id:1,text:'Это наш поезд.',author:'test'}],author:'test',source:'https://example.org',license:'fixture',review,audio:null,words:4,search:[],packId:'test'});
it('сомнительные предложения остаются в библиотеке, но не попадают в проверяемые задания',async()=>{
 const pivot=sentence('pivot','tatoeba-linked-via-intermediate'),mixed={...sentence('mixed'),bg:'Виe говорите ли български?'};
 await contentDB.sentences.bulkPut([pivot,mixed,sentence('direct')]);
 expect((await randomSentences(10)).map(s=>s.id)).toEqual(['direct']);
 expect(await contentDB.sentences.count()).toBe(3);
 expect(sentenceReviewReason(pivot)).toContain('промежуточный');
});
it('редкий допустимый материал доступен за пределами первого случайного фрагмента',async()=>{
 await contentDB.sentences.bulkPut([...Array.from({length:600},(_,i)=>({...sentence('long-'+i),words:99})),sentence('eligible')]);
 expect((await randomSentences(10,7)).map(s=>s.id)).toEqual(['eligible']);
});
