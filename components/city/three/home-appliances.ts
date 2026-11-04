import * as THREE from 'three';
type Box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,parent?:THREE.Object3D)=>THREE.Mesh;
/** Original lightweight3D furniture. The screen is an abstract animation, not
 * external video, an inventory grant or a claim that an actor owns appliances. */
export function createHomeAppliances(scene:THREE.Scene,box:Box,home:boolean,cinema:boolean){
  const root=new THREE.Group();scene.add(root);
  let door:THREE.Group|undefined;
  if(home){
    box(-6.7,1.85,-3.9,1.6,3.7,1.45,'#c8d6d2',root);
    box(-6.7,1.85,-3.15,1.38,3.42,.08,'#526f73',root);
    for(const y of [.65,1.5,2.35]){box(-6.7,y,-3.55,1.35,.06,.67,'#e8efe7',root);box(-6.7,y+.17,-3.5,.65,.28,.35,'#d3a474',root);}
    door=new THREE.Group();door.position.set(-7.48,0,-3.1);root.add(door);
    box(.78,1.85,0,1.54,3.55,.12,'#dce7e0',door);box(1.35,2.1,.12,.08,.65,.09,'#718b8d',door);
    box(3.5,.43,3.7,3.2,.86,1.35,'#537c79',root);
    box(3.5,.94,3.7,3.05,.16,1.25,'#c2cec0',root);
    box(3.5,1.35,4.28,3.2,1.25,.18,'#537c79',root);
    for(const x of [1.85,5.15])box(x,1.05,3.7,.16,.8,1.35,'#6a9189',root);
  }
  const tvX=home?3.5:0,tvY=cinema?3.6:2.85,tvZ=-5.75,width=cinema?9:3.2,height=cinema?3.9:1.85;
  box(tvX,tvY,tvZ,width+.22,height+.22,.15,'#233840',root);
  const screenMaterial=new THREE.MeshBasicMaterial({color:'#5684a0'}),screen=new THREE.Mesh(new THREE.PlaneGeometry(width,height),screenMaterial);
  screen.position.set(tvX,tvY,tvZ+.09);root.add(screen);
  const bars:THREE.Mesh[]=[];
  for(let i=0;i<4;i++){const m=box(tvX+(i-1.5)*width*.22,tvY,tvZ+.11,width*.16,height*.6,.025,['#a2c4b8','#d0b18b','#91b7c9','#c5949a'][i],root);bars.push(m);}
  return {update(seconds:number,fridge:boolean,watching:boolean){
    if(door)door.rotation.y=fridge?-.9*(.9+.1*Math.sin(seconds*.7)):0;
    screenMaterial.color.set(watching?'#5684a0':'#263f49');
    bars.forEach((bar,i)=>{bar.visible=watching;bar.scale.y=height*(.35+.18*Math.sin(seconds*.8+i));});
    return {fridgeOpen:!!door&&Math.abs(door.rotation.y)>.01,screenOn:watching,program:'abstract-local-animation'};
  },dispose(){screen.geometry.dispose();screenMaterial.dispose();root.removeFromParent();}};
}
