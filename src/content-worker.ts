/// <reference lib="webworker" />
import {decodePackage,indexItem,type PackageSpec} from './content-processing';
self.onmessage=async(e:MessageEvent<{id:number;bytes:ArrayBuffer;pack:PackageSpec}>)=>{const {id,bytes,pack}=e.data;try{const items=(await decodePackage(bytes,pack)).map(row=>indexItem(row,pack.id));self.postMessage({id,items});}catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}};
