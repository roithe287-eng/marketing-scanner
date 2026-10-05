import {AsyncLocalStorage} from 'node:async_hooks';
import {AccessError} from '../security/request';

type Budget={signal:AbortSignal;endsAt:number};
const context=new AsyncLocalStorage<Budget>();
export const budgetSignal=()=>context.getStore()?.signal;
export const remainingBudget=()=>Math.max(0,(context.getStore()?.endsAt??Infinity)-Date.now());
export function scopedSignal(...signals:(AbortSignal|null|undefined)[]){
 const all=[budgetSignal(),...signals].filter((s):s is AbortSignal=>!!s);
 return all.length?AbortSignal.any(all):undefined;
}
/** Cancel downstream I/O and settle even when a dependency ignores its signal. */
export async function withBudget<T>(ms:number,work:()=>Promise<T>,parent?:AbortSignal,message='응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'):Promise<T>{
 const controller=new AbortController();
 const signal=scopedSignal(controller.signal,parent)!;
 const endsAt=Math.min(Date.now()+ms,context.getStore()?.endsAt??Infinity);
 const timer=setTimeout(()=>controller.abort(new AccessError(504,message)),Math.max(0,endsAt-Date.now()));
 let rejectAbort:(reason:unknown)=>void=()=>{};
 const aborted=new Promise<never>((_,reject)=>{rejectAbort=reject;});
 const onAbort=()=>rejectAbort(signal.reason||new AccessError(499,'요청이 취소되었습니다.'));
 signal.addEventListener('abort',onAbort,{once:true});
 try{
  signal.throwIfAborted();
  return await context.run({signal,endsAt},()=>Promise.race([Promise.resolve().then(work),aborted]));
 }finally{
  clearTimeout(timer);signal.removeEventListener('abort',onAbort);
  controller.abort(new DOMException('작업이 종료되었습니다.','AbortError'));
 }
}
export const budgetFetch:typeof fetch=(input,init={})=>fetch(input,{...init,signal:scopedSignal(init.signal,input instanceof Request?input.signal:undefined)});

export type AnalysisWarning={key:string;label:string;status:'timeout'|'unavailable'|'error'};
export async function optionalStage<T>(key:string,label:string,ms:number,work:()=>Promise<T|null>):Promise<{value:T|null;warning?:AnalysisWarning}>{
 try{
  const value=await withBudget(ms,work);
  return {value,...(value===null?{warning:{key,label,status:'unavailable' as const}}:{})};
 }catch(error){
  return {value:null,warning:{key,label,status:error instanceof AccessError&&error.status===504?'timeout':'error'}};
 }
}
