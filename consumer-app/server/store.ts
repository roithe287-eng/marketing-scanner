import {Redis} from '@upstash/redis';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {AccessError} from './errors';
import type {Report,Account} from '../src/types';
export type User=Account&{passwordHash?:string;createdAt:string};
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const prefix=()=>`ms:pocket:v1:${process.env.VERCEL_ENV==='preview'?'preview':'production'}:`;
export const key=(s:string)=>prefix()+s;
let client:Redis|undefined;
function config(){if(process.env.POCKET_REDIS_REST_URL&&process.env.POCKET_REDIS_REST_TOKEN)return {url:process.env.POCKET_REDIS_REST_URL,token:process.env.POCKET_REDIS_REST_TOKEN};if(process.env.KV_REST_API_URL&&process.env.KV_REST_API_TOKEN)return {url:process.env.KV_REST_API_URL,token:process.env.KV_REST_API_TOKEN};return null;}
export function ready(){return !!config();}
export function db(){if(!ready())throw new AccessError(503,'회원·기록 저장소를 준비 중이에요. 그동안 예시 진단을 둘러볼 수 있어요.');return client||=new Redis(config()!);}
export function parse<T>(x:unknown):T|null{return !x?null:typeof x==='string'?JSON.parse(x):x as T;}
export const publicUser=(u:User):Account=>({id:u.id,kind:u.kind,...(u.email?{email:u.email}:{})});
export async function rate(bucket:string,limit:number,ttl:number){const n=await db().eval<unknown[],number>("local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return n",[key('rate:'+bucket)],[ttl]);if(n>limit)throw new AccessError(429,'요청이 많아요. 잠시 후 다시 시도해 주세요.');}
const derive=(s:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(s,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(e,k)=>e?reject(e):resolve(k)));
export async function passwordHash(s:string){const salt=randomBytes(16).toString('hex');return salt+':'+(await derive(s,salt)).toString('hex');}
export async function passwordMatches(s:string,hash?:string){const p=hash?.split(':');const valid=!!p&&/^[a-f0-9]{32}$/.test(p[0])&&/^[a-f0-9]{128}$/.test(p[1]);const k=await derive(s,valid?p![0]:'0'.repeat(32));return valid&&timingSafeEqual(k,Buffer.from(p![1],'hex'));}
export const validToken=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s);
export async function session(token:string){if(!validToken(token))return null;const id=await db().get<string>(key('session:'+digest(token)));return id?parse<User>(await db().get(key('user:'+id))):null;}
export async function newSession(user:User){const token=randomBytes(32).toString('base64url');await db().set(key('session:'+digest(token)),user.id,{ex:7*86400});await db().sadd(key('sessions:'+user.id),digest(token));await db().expire(key('sessions:'+user.id),8*86400);return token;}
export async function createGuest(){const u:User={id:randomUUID(),kind:'guest',createdAt:new Date().toISOString()};await db().set(key('user:'+u.id),u,{ex:7*86400});return u;}
export async function register(email:string,password:string){const id=randomUUID(),u:User={id,email,kind:'member',passwordHash:await passwordHash(password),createdAt:new Date().toISOString()};const k=key('email:'+digest(email));const reserved=await db().set(k,id,{nx:true});if(!reserved)throw new AccessError(409,'가입할 수 없는 이메일이에요. 기존 계정으로 로그인하거나 다른 이메일을 사용해 주세요.');try{await db().set(key('user:'+id),u);}catch(e){await db().del(k);throw e;}return u;}
export async function login(email:string,password:string){const id=await db().get<string>(key('email:'+digest(email)));const u=id?parse<User>(await db().get(key('user:'+id))):null;if(!await passwordMatches(password,u?.passwordHash)||!u)throw new AccessError(401,'이메일 또는 비밀번호를 확인해 주세요.');return u;}
export function normalizedReport(raw:unknown){const r=parse<Report>(raw);return r?{...r,completed:Array.isArray(r.completed)?r.completed:[]}:null;}
export const reportKey=(userId:string,id:string)=>key(`report:${userId}:${id}`);
export async function report(userId:string,id:string){if(!/^[\w-]{36}$/.test(id))throw new AccessError(400,'진단 기록을 확인해 주세요.');return normalizedReport(await db().get(reportKey(userId,id)));}
export async function reports(userId:string){const ids=await db().zrange<string[]>(key('reports:'+userId),0,39,{rev:true});if(!ids.length)return [];const rows=await db().mget<unknown[]>(...ids.map(id=>reportKey(userId,id)));return rows.map(x=>normalizedReport(x)).filter((x):x is Report=>!!x);}
export async function save(userId:string,r:Report){await db().set(reportKey(userId,r.id),r,{ex:90*86400});await db().zadd(key('reports:'+userId),{score:Date.parse(r.createdAt),member:r.id});const old=await db().zrange<string[]>(key('reports:'+userId),0,-41);if(old.length){await db().del(...old.map(id=>reportKey(userId,id)));await db().zrem(key('reports:'+userId),...old);}await db().expire(key('reports:'+userId),90*86400);}
export async function setTask(userId:string,id:string,taskId:string,done:boolean){const k=reportKey(userId,id);const changed=await db().eval<unknown[],number>(`local raw=redis.call('GET',KEYS[1]);if not raw then return 0 end;local r=cjson.decode(raw);local valid=false;for _,g in ipairs(r.guides) do if g.id==ARGV[1] then valid=true end end;if not valid then return -1 end;local next={};for _,v in ipairs(r.completed) do if v~=ARGV[1] then table.insert(next,v) end end;if ARGV[2]=='1' then table.insert(next,ARGV[1]) end;r.completed=next;redis.call('SET',KEYS[1],cjson.encode(r),'KEEPTTL');return 1`,[k],[taskId,done?'1':'0']);if(changed!==1)throw new AccessError(404,'수정할 기록을 찾지 못했어요.');}
export async function removeReport(userId:string,id:string){await db().del(reportKey(userId,id));await db().zrem(key('reports:'+userId),id);}
export async function deleteUser(u:User){const ids=await db().zrange<string[]>(key('reports:'+u.id),0,-1),sessions=await db().smembers<string[]>(key('sessions:'+u.id));const keys=[key('user:'+u.id),key('reports:'+u.id),key('sessions:'+u.id),...ids.map(id=>reportKey(u.id,id)),...sessions.map(s=>key('session:'+s))];if(u.email)keys.push(key('email:'+digest(u.email)));await db().del(...keys);}
export async function reserve(u:User){const limit=u.kind==='guest'?1:3,k=key(`quota:${u.id}:${new Date(Date.now()+9*3600000).toISOString().slice(0,10)}`);const n=await db().eval<unknown[],number>(`local n=tonumber(redis.call('GET',KEYS[1]) or '0');if n>=tonumber(ARGV[1]) then return -1 end;redis.call('INCR',KEYS[1]);redis.call('EXPIRE',KEYS[1],172800);return n+1`,[k],[limit]);if(n===-1)throw new AccessError(429,`베타 진단은 ${u.kind==='guest'?'체험 사용자 1회':'회원 3회'}/일이에요. 다음 날 다시 이용해 주세요. (한국 시간 기준)`);return k;}
export async function refund(k:string){await db().eval(`local n=tonumber(redis.call('GET',KEYS[1]) or '0');if n>0 then redis.call('DECR',KEYS[1]) end;return 1`,[k],[]);}
