import {finishNavigation} from "./performance-metrics";
import { useEffect,useState } from 'react';
import type { HubMode } from './ContentHub';
type Data={grammarUnits:typeof import('./grammar-units')['grammarUnits'];dialogues:typeof import('./dialogues')['dialogues'];railTerms:typeof import('./railway')['railTerms'];railExamples:typeof import('./railway')['railExamples'];railSources:Partial<typeof import('./railway')['railSources']>;photos:import('./photo-data').Photo[]};
const empty:Data={grammarUnits:[],dialogues:[],railTerms:[],railExamples:[],railSources:{},photos:[]};
const loaded=new Map<HubMode,Promise<Data>>();
export function loadHubData(mode:HubMode):Promise<Data>{
 let pending=loaded.get(mode);if(pending)return pending;
 pending=(async()=>{
  const data={...empty};const jobs:Promise<void>[]=[];
  if(['courses','grammar','plan'].includes(mode))jobs.push(import('./grammar-units').then(m=>{data.grammarUnits=m.grammarUnits;}));
  if(mode==='dialogues')jobs.push(import('./dialogues').then(m=>{data.dialogues=m.dialogues;}));
  if(mode==='railway')jobs.push(import('./rail-dialogues.json').then(m=>{data.dialogues=m.default as Data['dialogues'];}));
  if(mode==='railway')jobs.push(import('./railway').then(m=>{data.railTerms=m.railTerms;data.railExamples=m.railExamples;data.railSources=m.railSources;}));
  if(mode==='library')jobs.push(import('./photos.json').then(m=>{data.photos=m.default;}));
  await Promise.all(jobs);return data;
 })().catch(e=>{loaded.delete(mode);throw e;});loaded.set(mode,pending);return pending;
}
export function useHubData(mode:HubMode){
 const [state,setState]=useState<{mode:HubMode;data:Data}|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let alive=true;setError(false);void loadHubData(mode).then(data=>{if(alive){setState({mode,data});requestAnimationFrame(()=>finishNavigation(mode,"data"));}}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[mode]);
 return {data:state?.mode===mode?state.data:empty,ready:state?.mode===mode,error};
}
