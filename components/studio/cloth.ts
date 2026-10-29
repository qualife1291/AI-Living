import * as THREE from 'three';
/** A folded sheet with raised sides, not the old rigid rectangular prop.
 * Timeline dimensions unfold it on the ground and fold it around the kitten. */
export function studioCloth(){
 const vertices:number[]=[],indices:number[]=[],columns=8,rows=6;
 for(let z=0;z<=rows;z++)for(let x=0;x<=columns;x++){const u=x/columns-.5,v=z/rows-.5;vertices.push(u,Math.pow(Math.abs(u)*2,3)+.06*Math.sin(v*Math.PI*6),v);}
 for(let z=0;z<rows;z++)for(let x=0;x<columns;x++){const i=z*(columns+1)+x;indices.push(i,i+columns+1,i+1,i+1,i+columns+1,i+columns+2);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 return new THREE.Group().add(new THREE.Mesh(geometry,new THREE.MeshPhongMaterial({color:'#d5a6b3',side:THREE.DoubleSide,shininess:2})));
}
