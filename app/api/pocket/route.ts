import handler from '../../../consumer-app/server/handler';
import type {IncomingMessage,ServerResponse} from 'node:http';
export const runtime='nodejs';
export const maxDuration=30;
export const dynamic='force-dynamic';
// Dedicated B2C boundary: own session cookie, account namespace, quotas and report ownership.
// No B2B principal, allowlisted-IP exception, report store, or analysis API is reused here.
async function handle(request:Request){
 const headers=new Headers();let status=200,output='';let input='';
 if(request.body){const reader=request.body.getReader();const chunks:Uint8Array[]=[];let bytes=0;while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>4096){await reader.cancel();return Response.json({error:'입력 내용이 너무 길어요.'},{status:413,headers:{'Cache-Control':'no-store'}});}chunks.push(next.value);}input=Buffer.concat(chunks).toString();}
 const req={method:request.method,url:request.url,headers:Object.fromEntries(request.headers),body:input||{},socket:{remoteAddress:''}} as IncomingMessage&{body?:unknown};
 const res={setHeader(name:string,value:string|number|readonly string[]){headers.set(name,Array.isArray(value)?value.join(','):String(value));},get statusCode(){return status;},set statusCode(value:number){status=value;},end(value?:string){output=value||'';}} as unknown as ServerResponse;
 await handler(req,res);return new Response(status===204?null:output,{status,headers});
}
export const GET=handle;export const POST=handle;export const OPTIONS=handle;
