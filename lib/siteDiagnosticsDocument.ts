import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
export function buildSiteDiagnosticsDocument(report:MarketingReport):ReportBlock[]{
  const audit=report.siteDiagnostics;if(!audit)return [];
  const blocks:ReportBlock[]=[{kind:'heading',text:'페이지·기술 정밀 점검'},{kind:'body',text:`관측 ${audit.observedAt} · ${audit.scopeNote}`}];
  for(const p of audit.pages){blocks.push({kind:'subheading',text:p.title||'제목 미감지'},{kind:'body',text:p.url,href:p.url},{kind:'body',text:`메타 설명: ${p.description||'미감지'} · canonical: ${p.canonicals.join(' · ')||'미감지'}${p.noindex?' · noindex 선언':''}`});}
  blocks.push({kind:'subheading',text:'사이트맵·선택 파일'},{kind:'body',text:`사이트맵 ${audit.sitemap.status} · ${audit.sitemap.note} · URL 표본 ${audit.sitemap.entries}개 / lastmod ${audit.sitemap.lastmod}개 / 날짜 이상 ${audit.sitemap.invalidDates}개 / 미래 날짜 ${audit.sitemap.futureDates}개 · robots 선언 ${audit.sitemap.declared?'감지':'미감지'}${audit.sitemap.sampled?' · 일부 표본':''}`,href:audit.sitemap.url},{kind:'body',text:`llms.txt ${audit.llms.status} · ${audit.llms.note}`,href:audit.llms.url},{kind:'body',text:'사이트맵은 전체 색인·순위를 보장하지 않습니다. lastmod는 실제 변경일을 기록하며 llms.txt는 Google 검색 필수 파일이 아닙니다. 존재 여부를 점수에 반영하지 않습니다.'});
  for(const a of audit.attempts)blocks.push({kind:'body',text:`추가 수집 ${a.status} · ${a.note}`,href:a.url});
  blocks.push({kind:'subheading',text:'AI 검색·학습·사용자 요청 정책'},{kind:'body',text:'입력 경로에 적용되는 robots.txt 선언만 관측했습니다. 학습 허용은 운영자 선택이며 차단에 감점하지 않습니다. 실제 접근·색인·인용은 별도입니다.'});
  for(const c of audit.crawlers)blocks.push({kind:'body',text:`${c.agent} · ${c.role} · ${c.status==='allowed'?'차단 규칙 없음':c.status==='blocked'?'차단 규칙 감지':'미확인'} · ${c.rule} · ${c.note}`,href:c.source});
  for(const f of audit.findings){blocks.push({kind:'subheading',text:`[${{action:'보완 필요',review:'직접 확인',observed:'관측 확인'}[f.status]}] ${f.title}`},{kind:'body',text:`근거: ${f.evidence}`},{kind:'body',text:`실행·확인: ${f.action}`});for(const url of f.urls)blocks.push({kind:'body',text:url,href:url});}
  if(audit.pages.some(p=>p.medicalRelevant))blocks.push({kind:'body',text:'Schema.org MedicalClinic · 의료기관 정보 연결 기준',href:'https://schema.org/MedicalClinic'},{kind:'body',text:'Schema.org Physician · 의료진·진료기관 유형 기준',href:'https://schema.org/Physician'});
  return blocks;
}
