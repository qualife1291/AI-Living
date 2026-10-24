'use client';
import {useEffect,useState} from 'react';
export function useLifeClock(paused:boolean){const [now,setNow]=useState<number|null>(null);useEffect(()=>{setNow(Date.now());if(paused)return;let frame=0,last=0;const tick=(time:number)=>{if(time-last>75){setNow(Date.now());last=time}frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[paused]);return now;}
