import {parseArgs} from 'node:util';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compareLearningRollouts} from '../lib/living/sim-harness.ts';
const {values}=parseArgs({options:{baseline:{type:'string'},candidate:{type:'string'},out:{type:'string'}},strict:true});
if(!values.baseline||!values.candidate)throw Error('baseline and candidate report paths required');
function verified(path) {
 const {sha256,...report}=JSON.parse(readFileSync(path,'utf8'));
 if(createHash('sha256').update(JSON.stringify(report)).digest('hex')!==sha256)throw Error('Report checksum mismatch');
 return report;
}
const comparison=compareLearningRollouts(verified(values.baseline),verified(values.candidate));
if(values.out)writeFileSync(values.out,JSON.stringify(comparison,null,2)+'\n');
console.log(JSON.stringify(comparison));
