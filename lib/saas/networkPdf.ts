import { db, key, token } from './store';
import { AccessError, clientIp, digest } from '../security/request';
import { isLoginFreeNetwork } from '../security/networkAccess';

function networkId(headers: Headers) {
  if (!isLoginFreeNetwork(headers)) throw new AccessError(403, '등록된 네트워크에서 다시 이용해 주세요.');
  return digest(clientIp(headers));
}

// Network exports have short-lived, IP-bound receipts, never a fabricated account.
// Personal account activity continues through the existing account PDF path.
export async function startNetworkPdf(headers: Headers, eventId: string) {
  const network = networkId(headers), ticket = token();
  return db().eval<unknown[], string>(`
local prior=redis.call('GET',KEYS[1]);if prior then return prior end
redis.call('SET',KEYS[2],ARGV[1],'EX',3600)
redis.call('SET',KEYS[1],ARGV[2],'EX',3600);return ARGV[2]`,
    [key('network-pdf-request:'+network+':'+eventId),key('network-pdf-ticket:'+digest(ticket))],
    [JSON.stringify({network,state:'started'}),ticket]);
}

export async function finishNetworkPdf(headers: Headers, ticket: string, phase: 'ready'|'failed'|'save'|'open') {
  const result = await db().eval<unknown[], number>(`
local raw=redis.call('GET',KEYS[1]);if not raw then return -1 end
local t=cjson.decode(raw);if t.network~=ARGV[1] then return -1 end
local phase=ARGV[2]
if phase=='ready' or phase=='failed' then
  if t.state==phase then return 0 end
  if t.state~='started' then return -2 end
  t.state=phase;redis.call('SET',KEYS[1],cjson.encode(t),'KEEPTTL');return 1
end
if t.state~='ready' then return -2 end;return 1`,
    [key('network-pdf-ticket:'+digest(ticket))],[networkId(headers),phase]);
  if (result === -1) throw new AccessError(403, 'PDF 이용 권한이 만료되었거나 접속 네트워크가 변경되었습니다. 다시 생성해 주세요.');
  if (result === -2) throw new AccessError(409, 'PDF 생성 상태를 확인할 수 없습니다. 다시 생성해 주세요.');
}
