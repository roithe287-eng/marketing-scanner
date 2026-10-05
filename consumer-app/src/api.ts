import {Capacitor} from '@capacitor/core';
import type {Account,Report,Goal} from './types';
const base=Capacitor.isNativePlatform()?(import.meta.env.VITE_API_ORIGIN||'https://www.mktscanner.com'):'';
let nativeToken='';
export async function request<T>(action:string,body?:unknown):Promise<T>{
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),35000);
 try{
  let response:Response;
  try{
   response=await fetch(`${base}/api/pocket?action=${action}`,{
    method:body===undefined?'GET':'POST',credentials:'include',
    headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(nativeToken?{'Authorization':'Bearer '+nativeToken}:{})},
    body:body===undefined?undefined:JSON.stringify({...body as object,client:Capacitor.isNativePlatform()?'native':'web'}),
    signal:controller.signal,
   });
  }catch{
   throw Error(controller.signal.aborted?'연결이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.':'서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
  }
  let data:any;
  try{data=await response.json();}catch{throw Error('서버 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');}
  if(!response.ok){if(response.status===401)nativeToken='';throw Error(data.error||'요청을 처리하지 못했어요.');}
  if(data.token)nativeToken=data.token;
  if(action==='logout'||action==='delete-account')nativeToken='';
  return data as T;
 }finally{clearTimeout(timeout);}
}
export const api={
 session:()=>request<{user:Account|null;ready:boolean}>('session'),
 guest:()=>request<{user:Account}>('guest',{}),
 auth:(mode:'login'|'register',email:string,password:string)=>request<{user:Account}>(mode,{email,password}),
 reports:()=>request<{reports:Report[]}>('reports',{}),
 analyze:(url:string,goal:Goal)=>request<{report:Report}>('analyze',{url,goal}),
 task:(id:string,taskId:string,done:boolean)=>request('task',{id,taskId,done}),
 logout:()=>request('logout',{}),remove:(id:string)=>request('delete-report',{id}),
 deleteAccount:(password:string)=>request('delete-account',{password}),
};
