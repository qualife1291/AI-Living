import {systemLog} from '../system-log.ts';

/** Record the wrapped pipeline's actual outcome. Inference telemetry must not
 * report success from a finally block when the durable pipeline rejected/threw.
 * Aggregate/sink failure must never change a returned result or thrown error. */
export async function withH6Measurement<T>(
  event:'h6_shadow_eval'|'h6_canary_result',run:()=>Promise<T>,
  aggregate:()=>Record<string,unknown>,
):Promise<T>{
  let status=500;
  try{
    const result=await run();
    status=200;
    try{
      const value=result&&typeof result==='object'&&'status' in result?result.status:undefined;
      if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)status=value;
    }catch{ /* an unusual result accessor is not an instrumentation failure */ }
    return result;
  }finally{
    try{systemLog(event,{...aggregate(),status});}catch{ /* best effort instrumentation */ }
  }
}
