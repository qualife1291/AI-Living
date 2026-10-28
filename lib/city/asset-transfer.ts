export type AssetTransfer = {sourceSha256:string;sha256:string;bytes:number};
async function sha256(bytes: ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
/** Check both transport and canonical bytes before handing anything to the glTF parser. */
export async function decodeAssetTransfer(raw: ArrayBuffer, entry: AssetTransfer) {
  if(raw.byteLength!==entry.bytes||await sha256(raw)!==entry.sha256)throw Error('Asset transport checksum');
  const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decoded=await new Response(stream).arrayBuffer();
  if(await sha256(decoded)!==entry.sourceSha256)throw Error('Canonical asset checksum');
  return decoded;
}
