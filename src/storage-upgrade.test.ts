import {it,expect} from 'vitest';
import Dexie from 'dexie';
import {db,defaultSettings} from './storage';
import {createEmptyCard} from 'ts-fsrs';
it('добавление индексов сохраняет старую память, историю, настройки и попытки',async()=>{
 db.close();await Dexie.delete('chameleon-bg');
 const legacy=new Dexie('chameleon-bg');legacy.version(2).stores({settings:'id',memory:'id,wordId,skill',attempts:'++id,exerciseId,at,skill',sessions:'id',practice:'id'});
 const now=new Date(),card=createEmptyCard(now),record={id:'preserved:recognition',wordId:'preserved',skill:'recognition',card,history:[{duration:20,note:'legacy-history'}]};
 await legacy.table('memory').put(record);await legacy.table('settings').put({...defaultSettings,name:'Сохранённый пользователь'});await legacy.table('attempts').add({exerciseId:'legacy-answer',at:now.getTime(),correct:true,skill:'test',duration:10});legacy.close();
 await db.open();expect(await db.memory.get(record.id)).toEqual(record);expect((await db.settings.get('profile'))?.name).toBe('Сохранённый пользователь');expect(await db.attempts.count()).toBe(1);expect(await db.memory.where('card.due').belowOrEqual(now).count()).toBe(1);
 db.close();await Dexie.delete('chameleon-bg');
});
