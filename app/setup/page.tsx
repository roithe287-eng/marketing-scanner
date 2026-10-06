import AccessShell from "@/components/access/AccessShell";
import AuthForm from "@/components/access/AuthForm";
import {headers} from 'next/headers';
import {isInternal} from '@/lib/security/request';
import {db,key} from '@/lib/saas/store';
export const dynamic='force-dynamic';
export default async function SetupPage() {
  let state:'ready'|'completed'|'unavailable'|'network'='ready';
  try{
    if(await db().get(key('admin-initialized')))state='completed';
    else if(!isInternal(await headers()))state='network';
    else if(!/^[a-f0-9]{64}$/.test(process.env.SAAS_SETUP_TOKEN_HASH||'')||!(Number(process.env.SAAS_SETUP_EXPIRES_AT)>Date.now()))state='unavailable';
  }catch{state='unavailable';}
  return (
    <AccessShell
      eyebrow="ADMIN SETUP"
      title="최초 관리자 등록"
      description="등록된 네트워크에서 관리자 등록 코드를 입력해 주세요. 최초 한 번만 등록할 수 있습니다."
    >
      {state==='ready'?<AuthForm mode="setup"/>:<div className="access-notice"><p>{state==='completed'?'관리자 등록이 이미 완료되었습니다. 추가 관리자는 생성할 수 없습니다.':state==='network'?'등록된 관리자 네트워크에서 접속해 주세요. 네트워크에 접속하는 것만으로는 등록되지 않으며, 별도의 1회용 관리자 등록 코드가 필요합니다.':'최초 관리자 등록 준비가 완료되지 않았거나 등록 코드가 만료되었습니다. 프로젝트 소유자가 관리자 등록 설정을 확인해야 합니다.'}</p><a className="jm-button" href="/login">기존 관리자 로그인</a></div>}
    </AccessShell>
  );
}
