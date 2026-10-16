export type VerbEntry={bg:string;ru:string;url?:string};
export function createVerbSearch<T extends VerbEntry>(entries:T[]){
 const index=entries.map(entry=>({entry,text:(entry.bg+' '+entry.ru).toLowerCase()}));
 return (query:string)=>{const term=query.trim().toLowerCase();return term?index.filter(row=>row.text.includes(term)).map(row=>row.entry):entries;};
}
