import {writeFileSync} from 'node:fs';
import {dialogues} from '../src/dialogues';
const rows=dialogues.filter(d=>d.topic==='Железная дорога');
writeFileSync('src/rail-dialogues.json',JSON.stringify(rows));
console.log('Railway dialogue subset:',rows.length,'unchanged dialogues');
