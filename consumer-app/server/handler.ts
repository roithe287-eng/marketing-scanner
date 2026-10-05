import type {IncomingMessage,ServerResponse} from 'node:http';
import {isIP} from 'node:net';
import {z} from 'zod';
import * as store from './store';
import {analyzeWebsite} from './analyze';
import {AccessError} from './errors';
const COOKIE='pocket_session';
const str=(v:unknown)=>typeof v==='string'?v:'';
const cookie=(token:string)=>`${COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV==='production'?'Secure; ':''}Max-Age=${token?7*86400:0}`;
const authSchema=z.object({email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(10,'비밀번호는 10자 이상 입력해 주세요.').max(128)});
export function allowedOrigin(origin:string,host:string){const allowed=[...(process.env.POCKET_WEB_ORIGINS||'').split(',').filter(Boolean),process.env.POCKET_WEB_ORIGIN,process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:undefined,process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:undefined,'capacitor://localhost','https://localhost'];if(process.env.NODE_ENV!=='production')allowed.push('http://localhost:5173','http://localhost:4173','http://127.0.0.1:5173');return !!origin&&allowed.includes(origin);}
async function body(req:IncomingMessage&{body?:unknown}){if(req.body!==undefined){if(typeof req.body==='string'){if(Buffer.byteLength(req.body)>4096)throw new AccessError(413,'입력 내용이 너무 길어요.');return JSON.parse(req.body);}if(Buffer.byteLength(JSON.stringify(req.body))>4096)throw new AccessError(413,'입력 내용이 너무 길어요.');return req.body;}let size=0;const chunks:Buffer[]=[];for await(const c of req){const b=Buffer.from(c);size+=b.length;if(size>4096)throw new AccessError(413,'입력 내용이 너무 길어요.');chunks.push(b);}return chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};}
export default async function handler(req:IncomingMessage&{body?:unknown},res:ServerResponse){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');const send=(status:number,data:unknown)=>{res.statusCode=status;res.end(JSON.stringify(data));};const origin=str(req.headers.origin),host=str(req.headers.host);if(allowedOrigin(origin,host)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');}if(req.method==='OPTIONS'){res.statusCode=allowedOrigin(origin,host)?204:403;res.end();return;}
 try{
 const action=new URL(req.url||'','https://local.invalid').searchParams.get('action')||'session';
 if(req.method==='GET'&&action==='health'){send(200,{ready:store.ready(),product:'pocket',version:'0.1.0',method:'pocket-static-v1'});return;}
 const bearer=str(req.headers.authorization).replace(/^Bearer /,'');const rawCookie=str(req.headers.cookie).split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';const token=store.validToken(bearer)?bearer:rawCookie;
 if(req.method==='GET'&&action==='session'){const u=store.ready()?await store.session(token):null;send(200,{user:u?store.publicUser(u):null,ready:store.ready()});return;}
 if(req.method!=='POST')throw new AccessError(405,'지원하지 않는 요청이에요.');
 if(!allowedOrigin(origin,host)&&!store.validToken(bearer))throw new AccessError(403,'앱에서 다시 시도해 주세요.');
 if(!/application\/json/i.test(str(req.headers['content-type'])))throw new AccessError(415,'입력 형식을 확인해 주세요.');
 const b=await body(req);const ip=process.env.VERCEL==='1'?str(req.headers['x-vercel-forwarded-for']).split(',')[0].trim():req.socket.remoteAddress||'';const ipKey=store.digest(isIP(ip)?ip:'unknown');
 await store.rate('request:'+ipKey,100,600);
 if(['guest','register','login'].includes(action)){
 await store.rate('auth:'+ipKey,12,3600);let u:store.User;
 if(action==='guest'){const existing=await store.session(token);if(existing){send(200,{user:store.publicUser(existing)});return;}await store.rate('guest:'+ipKey,3,86400);u=await store.createGuest();}
 else{const a=authSchema.parse(b);u=action==='register'?await store.register(a.email,a.password):await store.login(a.email,a.password);}
 const t=await store.newSession(u);res.setHeader('Set-Cookie',cookie(t));send(200,{user:store.publicUser(u),...(b.client==='native'?{token:t}:{})});return;}
 const u=await store.session(token);if(!u)throw new AccessError(401,'로그인하거나 체험을 시작해 주세요.');
 if(action==='logout'){await store.db().del(store.key('session:'+store.digest(token)));res.setHeader('Set-Cookie',cookie(''));send(200,{ok:true});return;}
 if(action==='reports'){send(200,{reports:await store.reports(u.id)});return;}
 if(action==='analyze'){
 const a=z.object({url:z.string().min(4).max(2048),goal:z.enum(['inquiry','purchase','search'])}).parse(b);await store.rate('analyze:'+ipKey,10,86400);const quota=await store.reserve(u);try{const report=await analyzeWebsite(a.url,a.goal);await store.save(u.id,report);send(200,{report});}catch(e){await store.refund(quota);throw e;}return;}
 if(action==='task'){const a=z.object({id:z.string().uuid(),taskId:z.string().min(1).max(60),done:z.boolean()}).parse(b);await store.setTask(u.id,a.id,a.taskId,a.done);send(200,{ok:true});return;}
 if(action==='delete-report'){const a=z.object({id:z.string().uuid()}).parse(b);await store.removeReport(u.id,a.id);send(200,{ok:true});return;}
 if(action==='delete-account'){if(u.kind==='member'&&!await store.passwordMatches(str(b.password),u.passwordHash))throw new AccessError(401,'비밀번호를 확인해 주세요.');await store.deleteUser(u);res.setHeader('Set-Cookie',cookie(''));send(200,{ok:true});return;}
 throw new AccessError(404,'찾을 수 없는 요청이에요.');
 }catch(e){if(e instanceof AccessError){send(e.status,{error:e.message});return;}if(e instanceof z.ZodError){send(400,{error:e.issues[0]?.message||'입력 내용을 확인해 주세요.'});return;}if(e instanceof SyntaxError){send(400,{error:'입력 내용을 확인해 주세요.'});return;}console.error('[pocket]',e instanceof Error?e.name:'RequestError');send(503,{error:'지금은 요청을 처리하기 어려워요. 잠시 후 다시 시도해 주세요.'});}
}
