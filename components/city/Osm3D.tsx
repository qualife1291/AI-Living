"use client";
import { useEffect, useRef, useState } from 'react';
import { UrbanMap } from './UrbanMap';
import type { ComponentProps } from 'react';
export function Osm3D(props: ComponentProps<typeof UrbanMap>) {
  const host=useRef<HTMLDivElement>(null), [failed,setFailed]=useState(false);
  useEffect(()=>{
    let cancelled=false,dispose:(()=>void)|undefined;
    import('./three/osm').then(({createOsm})=>{
      if(cancelled||!host.current)return;
      try{dispose=createOsm(host.current);}catch{setFailed(true);}
    }).catch(()=>setFailed(true));
    return()=>{cancelled=true;dispose?.();};
  },[]);
  if(failed)return <UrbanMap {...props} />;
  return <div className="urban-map-host city-three"><div ref={host} className="three-canvas osm-three" /><div className="live-hud osm-note"><b>TP.HCM · Khảo sát 3D</b><p>Dấu chân công trình OSM · Chiều cao thiếu dữ liệu được ước lượng.</p><small>Kéo để xoay · Hai ngón để dịch · Cuộn để zoom. Cư dân vẫn sống trong thành phố mô phỏng, không hiển thị trên bản đồ khảo sát này.</small></div><div className="map-credit"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a> · Snapshot, không phải dữ liệu trực tiếp</div></div>;
}
