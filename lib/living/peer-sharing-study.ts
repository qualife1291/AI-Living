/** Bounded admission benchmark, not a learning-quality or runtime-promotion study. */
import {PeerAdviceInbox,replayPeerSharing,PEER_HALF_LIFE_MS,PEER_SCOPE} from './peer-sharing.ts';
import {groundHash} from './ground-timeline.ts';
import protocol from '../../docs/validation/peer-sharing-protocol-v1.json' with {type:'json'};
export async function peerSharingStudy(){
 const trial=await replayPeerSharing(),inbox=new PeerAdviceInbox({...trial.scope,recipientId:'neighbor-1'}),now=270000;
 const admission=trial.proofs.map(proof=>inbox.receive(proof,now));
 const duplicates=trial.proofs.map(proof=>inbox.receive(proof,now));
 let cloneRejections=0;for(const proof of trial.proofs){try{inbox.receive(structuredClone(proof),now);}catch{cloneRejections++;}}
 let wrongRecipientRejections=0;for(const who of ['an','chi','neighbor-2']){const other=new PeerAdviceInbox({...trial.scope,recipientId:who});try{other.receive(trial.proofs[0],now);}catch{wrongRecipientRejections++;}if(other.select(now).length)throw Error('peer-study-privacy');}
 const negatives=[];for(const diagnostic of ['baseline','partial','paused','cancel','transit'] as const){const result=await replayPeerSharing({diagnostic});negatives.push({diagnostic,mintedAdvice:result.proofs.length,physicsSteps:result.inspection.physicsSteps});}
 const first=trial.proofs[0];if(!first)throw Error('peer-study-no-proof');
 const confidence=inbox.select(first.heardAtSimMs+PEER_HALF_LIFE_MS,'gardening')[0]?.confidence;
 const expired=inbox.select(Math.max(...trial.proofs.map(p=>p.expiresAtSimMs))).length;
 if(admission.length!==3||admission.some(v=>v!=='accepted')||duplicates.some(v=>v!=='duplicate')||cloneRejections!==3||wrongRecipientRejections!==3||confidence!==.25||expired!==0||negatives.some(v=>v.mintedAdvice!==0))throw Error('peer-study-admission');
 return {kind:'H5-peer-admission-study-v1',namespace:PEER_SCOPE,protocolSha256:await groundHash(protocol),scope:'synthetic editorial offers with actual accepted physics; not blind semantic evaluation',positive:{admitted:admission.length,duplicateNoops:duplicates.length,cloneRejections,wrongRecipientRejections,heardLines:trial.inspection.counts.heard,physicsSteps:trial.inspection.physicsSteps,halfLifeConfidence:confidence,expiredVisible:expired},negatives,evidence:trial.proofs.map(p=>({id:p.id,source:p.source,topic:p.topic,evidence:p.evidence})),worldOrPolicyWrites:false,runtimeImportAllowed:false,modelQualityGainMeasured:false,productionAccess:false};
}
