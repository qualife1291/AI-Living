import {readFileSync} from 'node:fs';
import {AssetLibrary} from '../components/city/three/assets.ts';
import {loadLocalGLTF} from './load-local-gltf.mjs';
/** Only approved checked-in civilian derivatives; no network or image decoder. */
export async function loadCivilianLibrary(){
 const library=new AssetLibrary(),catalog=JSON.parse(readFileSync('public/models/supplied/catalog.json'));
 for(const asset of catalog.assets)library.loaded.set(asset.id,await loadLocalGLTF(asset.url));
 return library;
}
