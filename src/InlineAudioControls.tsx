import {useSyncExternalStore} from 'react';
import {audioState,subscribeAudio,speak,stopSpeech,pauseSpeech,resumeSpeech,configureAudio} from './speech';

export default function InlineAudioControls({text,notify,onPlay}:{text:string;notify:(message:string)=>void;onPlay?:()=>void}){
  const audio=useSyncExternalStore(subscribeAudio,audioState);
  return <section className="inline-audio-controls" aria-label="Звук упражнения">
    <span role="status">{audio.status==='error'?audio.error:audio.status==='loading'?'Загружаем звук…':audio.status==='playing'?'Воспроизводится фраза':audio.status==='paused'?'Пауза':'Готово к прослушиванию'}</span>
    <div>
      <button className="btn secondary listen-play" onClick={()=>{onPlay?.();void speak(text,notify);}}>Прослушать фразу</button>
      <button className="btn secondary" disabled={!['playing','paused'].includes(audio.status)} onClick={()=>audio.status==='paused'?void resumeSpeech():pauseSpeech()}>{audio.status==='paused'?'Продолжить звук':'Пауза'}</button>
      <button className="btn secondary" onClick={stopSpeech}>Стоп</button>
      <label>Скорость <select aria-label="Скорость звука упражнения" value={audio.rate} onChange={e=>configureAudio({rate:+e.target.value})}>{[.75,1,1.25,1.5].map(rate=><option key={rate} value={rate}>{rate}x</option>)}</select></label>
    </div>
  </section>;
}
