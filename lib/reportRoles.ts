/** Reading roles, not pass/fail states. A proposal is never a completed change. */
export const reportRoles = {
  current: {accent:'#475569', background:'#f1f5f9', border:'#b8c5d5', ink:'#263449'},
  review: {accent:'#9a4b0a', background:'#fff5e6', border:'#e5b36f', ink:'#693710'},
  proposal: {accent:'#087569', background:'#e9f8f3', border:'#83c8b6', ink:'#11594f'},
  verify: {accent:'#6b43a6', background:'#f3effb', border:'#c1a9e3', ink:'#503279'},
  location: {accent:'#2657ab', background:'#edf4ff', border:'#9cbce7', ink:'#254574'},
} as const;
export type ReportRole = keyof typeof reportRoles;

/** Only known document field labels get a role; arbitrary text is never reclassified. */
export function reportFieldRole(label:string):ReportRole|undefined {
  const name=label.replace(/[:：]$/,'').trim();
  const groups:Record<ReportRole,readonly string[]>={
    current:['현재','현재 상태','현재 값','현재 예시','개선 전','AS-IS','원문 관측','관측 근거','확인 근거','이전','문제'],
    review:['진단','진단 해석','원인','이유','효과 한계','적용 조건'],
    proposal:['개선','개선안','개선 예시','개선 후','TO-BE','제안·작성 틀','수정 방법','수정 가이드','실행 제안','권장 조치','권장 행동'],
    verify:['완료 확인','완료 조건','확인 지표','공식 근거의 원리','확인 방법','검증 기준'],
    location:['위치','수정 위치','원문 위치','편집 경로'],
  };
  return (Object.keys(groups) as ReportRole[]).find(role=>groups[role].includes(name));
}
