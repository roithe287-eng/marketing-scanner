import AccessShell from '@/components/access/AccessShell';
import {ACTIVITY_POLICY} from '@/lib/saas/activityTypes';
export const metadata={title:'개인정보·이용 기록 안내 | 마케팅스캐너'};
export default function PrivacyPage(){
  return <AccessShell wide eyebrow="PRIVACY & ACTIVITY" title="개인정보·이용 기록 안내" description="계정 제공, 이용 승인과 보안, 사용량 관리에 필요한 정보를 다음과 같이 처리합니다.">
    <div className="access-form">
      <p className="access-consent">{ACTIVITY_POLICY}</p>
      <section><h2>처리 항목과 목적</h2><p className="access-muted">주식회사 캐치크(진짜마케팅)는 이름·회사명·이메일·고유 사용자 ID·승인 상태·이용 기간·기능과 한도로 계정을 관리합니다. 비밀번호는 복원이 불가능한 방식으로 해시 처리합니다. 접속 IP, 브라우저·운영체제 종류, 로그인 성공·실패, 분석 요청·결과 상태, PDF 생성·저장 클릭, 공유 링크 생성·열람·갱신, 관리자 승인·변경 기록은 접근 통제, 계정 보호와 이용 내역 확인에 사용합니다. 활동 로그에는 보고서 본문, 비밀번호, 인증 코드, 세션 토큰을 기록하지 않습니다.</p></section>
      <section><h2>보관기간과 삭제</h2><p className="access-muted">공유 보고서 본문은 최초 보관 후 최대 7일, IP를 포함한 상세 활동 기록은 한국시간 일별로 최대 30일간 보관합니다. 활동 화면에는 최신 200건까지 표시되며 일별 상세 기록은 최대 1,000건으로 제한됩니다. 계정 정보와 IP를 제외한 누적 횟수는 계정 삭제 시까지 보관합니다. 월별 한도 집계는 최대 70일, 이용 문의는 90일, 계정 ID만 포함하는 관리자 변경 감사 기록은 최대 180일간 보관합니다. 계정을 삭제하면 사용자별 상세 활동과 누적 횟수도 삭제합니다. 이미 내려받은 PDF·복사본은 회수되지 않습니다.</p></section>
      <section><h2>열람 권한과 해석</h2><p className="access-muted">사용자별 상세 이용 기록은 소유자 관리자만 조회합니다. 승인되지 않았거나 중지·만료된 계정은 계정 이용 권한을 갖지 않습니다. 별도로 지정된 네트워크에서는 로그인 없이 진단·PDF·공동 보관함을 이용할 수 있으며, 이 경우 개인 계정별 이용 기록으로 집계하지 않습니다. 네트워크용 PDF 이용 확인 정보는 최대 1시간 후 삭제됩니다. 관리자 기능과 다른 고객의 계정 보고서는 개방되지 않습니다. IP는 공유되거나 변경될 수 있어 개인 또는 기기의 고유 신원을 증명하지 않습니다. PDF 생성 완료·저장·열기는 브라우저의 보고 또는 클릭 기록이며, 실제 디스크 저장 완료를 보장하지 않습니다. 브라우저 종류는 요청 정보에 기반하며 변경·위조될 수 있습니다.</p></section>
      <section><h2>문의와 권리 행사</h2><p className="access-muted">계정 정보·이용 기록의 열람, 정정, 삭제 또는 이용 중지를 원하면 <a href="/inquiry">이용 문의</a>로 요청해 주세요. 계정 소유자 확인 후 처리합니다. 서비스를 제공하는 데 필요한 계정·이용 기록의 처리를 원하지 않으면 계정 이용을 중단하고 삭제를 요청할 수 있습니다.</p></section>
      <p className="access-muted">이 안내는 마케팅스캐너의 계정·이용 기록 처리 범위를 설명합니다. <a href="/notice">진단 결과 이용 안내</a>도 함께 확인해 주세요. 적용일: 2026년 10월 6일.</p>
    </div>
  </AccessShell>;
}
