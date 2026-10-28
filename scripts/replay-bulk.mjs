/** Manual local bulk/cursor replay. One progress line after each accepted batch. */
import {parseArgs} from 'node:util';
import {bulkReplay,BulkReplayError} from './bulk-replay.mjs';
try {
 const {values}=parseArgs({options:{manifest:{type:'string'},'expected-manifest-sha256':{type:'string'},job:{type:'string'},action:{type:'string',default:'run'},'expected-checkpoint':{type:'string'},'max-batches':{type:'string',default:'1'},out:{type:'string'}},strict:true,allowPositionals:false});
 if(!values.manifest||!values['expected-manifest-sha256']||!values.job)throw new BulkReplayError('arguments');
 if(values.action==='status'&&(values.out||values['expected-checkpoint'])||values.action!=='export'&&values.out)throw new BulkReplayError('arguments');
 const result=bulkReplay({manifestPath:values.manifest,expectedManifestSha256:values['expected-manifest-sha256'],job:values.job,action:values.action,expectedCheckpoint:values['expected-checkpoint'],maxBatches:Number(values['max-batches']),out:values.out},{onCommit:result=>console.log(JSON.stringify(result))});
 if(values.action!=='run')console.log(JSON.stringify(result));
} catch(error) {
 const location=error instanceof BulkReplayError&&Number.isSafeInteger(error.location?.source)&&Number.isSafeInteger(error.location?.line)?` (source ${error.location.source}, line ${error.location.line})`:'';
 console.error(`Local bulk replay rejected: ${error instanceof BulkReplayError?error.code:'arguments-or-local-io'}${location}. Committed batches and source preserved; use status to inspect progress.`);
 process.exitCode=1;
}
