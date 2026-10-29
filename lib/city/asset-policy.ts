import selection from '../../data/assets/supplied-selection.json' with {type:'json'};
export const OWNER_ASSET_LICENSE='LicenseRef-Owner-Confirmed-Free';
/** Owner-supplied permission is scoped to exact reviewed members, never inferred from a price. */
export function reviewedAssetLicense(asset:{id:string;license:string;sourceSha256?:string}){
 if(!asset.id.startsWith('supplied/'))return asset.license==='CC0-1.0';
 return asset.license===OWNER_ASSET_LICENSE&&selection.assets.some(a=>a.id===asset.id&&a.sourceSha256===asset.sourceSha256);
}
