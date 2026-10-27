import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import osm from '@/data/city/hcm-district1.json';
import { closedFootprint, buildingHeight } from '@/lib/city/osm';
export function createOsm(host:HTMLDivElement) {
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#bdd5df');scene.fog=new THREE.Fog('#bdd5df',2800,7000);
  const camera=new THREE.PerspectiveCamera(42,1,1,12000);camera.position.set(2300,1800,2500);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(1200,0,750);controls.enableDamping=true;controls.maxPolarAngle=1.5;controls.minDistance=100;controls.maxDistance=6000;
  scene.add(new THREE.HemisphereLight('#e4f5ff','#ad9c7d',2.2));const sun=new THREE.DirectionalLight('#ffe6c1',3);sun.position.set(-1000,2000,1000);scene.add(sun);
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
  const groundGeometry=new THREE.PlaneGeometry(3000,2100);geometries.push(groundGeometry);const groundMaterial=new THREE.MeshStandardMaterial({color:'#ced8bf',roughness:1});materials.push(groundMaterial);const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.set(1200,-1,750);scene.add(ground);
  const buckets:THREE.BufferGeometry[][]=[[],[],[],[]];let count=0,estimated=0;
  const unitsPerMeter=2240/((osm.bbox[3]-osm.bbox[1])*111320*Math.cos(osm.bbox[0]*Math.PI/180));
  for(const feature of osm.features){
    if(!closedFootprint(feature))continue;
    const height=buildingHeight(feature);if(height.source!=='height-tag')estimated++;
    const shape=new THREE.Shape(feature.points.slice(0,-1).map(p=>new THREE.Vector2(p[0],-p[1])));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:height.meters*unitsPerMeter,bevelEnabled:true,bevelThickness:0.35,bevelSize:0.25,bevelSegments:2,steps:1});geometry.rotateX(-Math.PI/2);
    buckets[count%4].push(geometry);count++;
  }
  buckets.forEach((list,i)=>{if(!list.length)return;const merged=mergeGeometries(list);list.forEach(g=>g.dispose());if(!merged)return;geometries.push(merged);const material=new THREE.MeshStandardMaterial({color:['#c6b79b','#a9c2b8','#aabac3','#d0baaa'][i],roughness:.8});materials.push(material);scene.add(new THREE.Mesh(merged,material));});
  const lines:number[]=[];
  for(const feature of osm.features.filter(f=>f.kind==='road'))for(let i=1;i<feature.points.length;i++){const a=feature.points[i-1],b=feature.points[i];lines.push(a[0],.3,a[1],b[0],.3,b[1]);}
  const lineGeometry=new THREE.BufferGeometry();lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));geometries.push(lineGeometry);const lineMaterial=new THREE.LineBasicMaterial({color:'#57767b'});materials.push(lineMaterial);scene.add(new THREE.LineSegments(lineGeometry,lineMaterial));
  let frame=0,last=0;const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const onLoss=(event:Event)=>{event.preventDefault();host.dataset.ready='false';};renderer.domElement.addEventListener('webglcontextlost',onLoss);
  function tick(t:number){frame=requestAnimationFrame(tick);if(document.hidden||t-last<33)return;last=t;controls.update();renderer.render(scene,camera);host.dataset.ready='true';host.dataset.buildings=String(count);host.dataset.estimated=String(estimated);host.dataset.drawCalls=String(renderer.info.render.calls);}
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',onLoss);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
}
