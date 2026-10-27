"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {createSoundscape,type SoundScene} from "@/lib/city/soundscape";

export function useSoundscape({active,rain,daylight}: SoundScene) {
  const engine=useRef<ReturnType<typeof createSoundscape>|null>(null),latest=useRef({active,rain,daylight});
  const [enabled,setEnabled]=useState(false),[error,setError]=useState("");
  const update=useCallback(()=>{
    const current=engine.current;
    void current?.update({...latest.current,active:latest.current.active&&!document.hidden}).catch(()=>{if(engine.current===current)setError("Chưa phát được âm thanh. Hãy tắt rồi bật lại.");});
  },[]);
  useEffect(()=>{latest.current={active,rain,daylight};update();},[active,rain,daylight,update]);
  useEffect(()=>{
    document.addEventListener("visibilitychange",update);
    return()=>{document.removeEventListener("visibilitychange",update);const current=engine.current;engine.current=null;void current?.dispose().catch(()=>{});};
  },[update]);
  const toggle=useCallback(()=>{
    setError("");
    if(engine.current){const old=engine.current;engine.current=null;setEnabled(false);void old.dispose().catch(()=>{});return;}
    let context:AudioContext|undefined;
    try {
      if(!window.AudioContext)throw Error("unsupported");
      // Created/resumed only in this explicit user gesture, never on page load.
      context=new AudioContext();engine.current=createSoundscape(context);setEnabled(true);update();
    }catch{void context?.close().catch(()=>{});setEnabled(false);setError("Trình duyệt chưa hỗ trợ âm thanh môi trường.");}
  },[update]);
  return {enabled,error,toggle};
}
