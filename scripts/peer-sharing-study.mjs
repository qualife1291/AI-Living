/** Local fixed synthetic experiment only; no input artifact, URLs, DB or model. */
import {peerSharingStudy} from '../lib/living/peer-sharing-study.ts';
import {prepareStudyOutput,writeStudyOutput,studyDigest} from './ground-study-files.mjs';
try{
 const args=process.argv.slice(2);if(args.length>1||args.some(a=>!a.startsWith('--out=')||!a.slice(6)))throw Error('arguments');
 const out=args.length?prepareStudyOutput(args[0].slice(6)):null;
 const result=await peerSharingStudy();
 const sha256=out?writeStudyOutput(out,result,1_000_000):studyDigest(result);
 console.log(JSON.stringify({kind:result.kind,sha256,positive:result.positive,negativeDiagnostics:result.negatives.length,runtimeImportAllowed:false,productionAccess:false}));
}catch{console.error('Peer sharing study failed validation; no runtime promotion.');process.exitCode=1;}
