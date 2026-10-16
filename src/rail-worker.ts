/// <reference lib="webworker" />
import {railSections,railwayBank,selectRailSession} from './rail-practice';
import type {RailSection} from './rail-sections';
import type {Mechanic} from './library';
self.onmessage=(e:MessageEvent<{id:number;kind:'stats'|'session';mode:Mechanic|'mixed';section:RailSection;count:number;attempts:{exerciseId:string;correct:boolean;at:number}[]}>)=>{
 const {id,kind,mode,section,count,attempts}=e.data;
 try{const result=kind==='stats'?railSections.map(s=>{const bank=railwayBank(s.id).filter(t=>mode==='mixed'||t.type===mode);return {tasks:bank.length,materials:new Set(bank.map(t=>t.materialId)).size};}):selectRailSession(railwayBank(section),count,attempts,mode);self.postMessage({id,result});}
 catch(e){self.postMessage({id,error:e instanceof Error?e.message:String(e)});}
};
