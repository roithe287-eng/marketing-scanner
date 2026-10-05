export class RequestError extends Error{
 constructor(public status:number,message:string){super(message);this.name='RequestError';}
}
/** Timeout covers both response headers and body. Works without AbortSignal.timeout. */
export async function requestJson<T=unknown>(url:string,init:RequestInit={},timeoutMs=15000):Promise<T>{
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();
 if(init.signal?.aborted)controller.abort();else init.signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try{
  const response=await fetch(url,{...init,signal:controller.signal});
  const json=(response.headers.get('content-type')||'').includes('application/json');
  const data=json?await response.json().catch(()=>null):null;
  if(!response.ok)throw new RequestError(response.status,typeof data?.message==='string'?data.message:response.status===504||response.status===408?'응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.':response.status===401?'로그인이 만료됐습니다. 다시 로그인해 주세요.':'서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.');
  if(data===null)throw new RequestError(502,'서버 응답 형식을 확인하지 못했습니다. 다시 시도해 주세요.');
  return data as T;
 }catch(error){
  if(init.signal?.aborted)throw new DOMException('요청이 취소되었습니다.','AbortError');
  if(timedOut)throw new RequestError(504,'응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
  if(error instanceof RequestError)throw error;
  throw new RequestError(0,'서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
 }finally{clearTimeout(timer);init.signal?.removeEventListener('abort',cancel);}
}
