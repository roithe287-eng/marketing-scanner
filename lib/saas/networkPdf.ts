import { db, key, token, decode } from './store';
import { AccessError, clientIp, digest } from '../security/request';
import { isLoginFreeNetwork } from '../security/networkAccess';
import { activityEntry, WRITE_ACTIVITY_LUA, PDF_TRANSITION_LUA, type Details } from './activity';
import { NETWORK_ACTIVITY_ID, type PdfPhase, type PdfMetrics } from './activityTypes';

function networkId(headers: Headers) {
  if (!isLoginFreeNetwork(headers)) throw new AccessError(403, '등록된 네트워크에서 다시 이용해 주세요.');
  return digest(clientIp(headers));
}
type NetworkTicket = {network:string;state:string;scope?:'full'|'summary';target?:string;reportId?:string};
// These IP-bound tickets never grant account or administrator privileges.
export async function startNetworkPdf(headers: Headers, eventId: string, details:Details={}) {
  const network=networkId(headers),ticket=token();
  const e=activityEntry(NETWORK_ACTIVITY_ID,'pdf_requested',headers,details,eventId);
  return db().eval<unknown[],string>(`
local prior=redis.call('GET',KEYS[8]);if prior then return prior end
redis.call('SET',KEYS[7],ARGV[5],'EX',3600)
redis.call('SET',KEYS[8],ARGV[6],'EX',3600)
local function write() ${WRITE_ACTIVITY_LUA} end
write();return ARGV[6]`,[...e.keys,key('network-pdf-ticket:'+digest(ticket)),key('network-pdf-request:'+network+':'+eventId)],
    [...e.args,JSON.stringify({network,state:'started',scope:details.scope,target:details.target,reportId:details.reportId}),ticket]);
}
export async function finishNetworkPdf(headers: Headers, ticket: string, phase:PdfPhase, eventId:string, metrics:PdfMetrics={}) {
  const network=networkId(headers),ticketKey=key('network-pdf-ticket:'+digest(ticket));
  const original=decode<NetworkTicket>(await db().get(ticketKey));
  if(!original||original.network!==network)throw new AccessError(403,'PDF 이용 권한이 만료되었거나 접속 네트워크가 변경되었습니다. 다시 생성해 주세요.');
  const e=activityEntry(NETWORK_ACTIVITY_ID,`pdf_${phase}`,headers,{scope:original.scope,target:original.target,reportId:original.reportId,source:'browser',...(phase==='ready'?metrics:{})},eventId);
  const result=await db().eval<unknown[],number>(`
local raw=redis.call('GET',KEYS[7]);if not raw then return -1 end
local t=cjson.decode(raw);if t.network~=ARGV[5] then return -1 end
${PDF_TRANSITION_LUA}
${WRITE_ACTIVITY_LUA}`,[...e.keys,ticketKey,key('network-pdf-save:'+digest(ticket+':'+eventId))],[...e.args,network,0,phase]);
  if(result===-1)throw new AccessError(403,'PDF 이용 권한이 만료되었거나 접속 네트워크가 변경되었습니다. 다시 생성해 주세요.');
  if(result===-2)throw new AccessError(409,'PDF 생성 상태를 확인할 수 없습니다. 다시 생성해 주세요.');
}
