import {useEffect,useState,type ImgHTMLAttributes} from 'react';
import widths from './responsive-photos.json';
const photos:Record<string,{small:number;large:number}>=widths;
export function responsivePhoto(src:string){const name=src.match(/^\/images\/([^/]+)\.jpg$/)?.[1];if(!name||!photos[name])return undefined;return {srcSet:photos[name].small===photos[name].large?`/images/responsive/${name}-640.webp ${photos[name].large}w`:`/images/responsive/${name}-320.webp ${photos[name].small}w, /images/responsive/${name}-640.webp ${photos[name].large}w`,small:`/images/responsive/${name}-320.webp`,large:`/images/responsive/${name}-640.webp`};}
export function PhotoImage({src='',sizes='(max-width: 600px) 90vw, (max-width: 1100px) 44vw, 320px',onError,...props}:ImgHTMLAttributes<HTMLImageElement>){
 const [offline,setOffline]=useState<{src:string;url:string}>(),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true,url:string|undefined;setOffline(undefined);if((!navigator.onLine||failed)&&'caches' in globalThis)void(async()=>{try{const response=await(await caches.open('chameleon-photos')).match(src);if(response){url=URL.createObjectURL(await response.blob());if(alive)setOffline({src,url});else URL.revokeObjectURL(url);}}catch{/* Standard image fallback remains intact. */}})();return()=>{alive=false;if(url)URL.revokeObjectURL(url);};},[src,failed]);
 const saved=offline?.src===src?offline.url:undefined;const photo=responsivePhoto(src);return <picture>{photo&&!saved&&<source type="image/webp" srcSet={photo.srcSet} sizes={sizes}/>}<img loading="lazy" decoding="async" {...props} src={saved??src} onError={e=>{setFailed(true);onError?.(e);}}/></picture>;
}
export function preloadPhoto(src:string){const image=new Image();image.decoding='async';image.fetchPriority='low';image.src=responsivePhoto(src)?.large??src;return()=>{image.removeAttribute('src');};}
