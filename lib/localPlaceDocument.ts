import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {buildLocalPlaceReview,LOCAL_PLACE_TITLE,LOOKUP_LABELS,PLACE_SCOPE} from './localPlaceReview';
import {buildSeasonalPlaceDocument} from './seasonalPlaceDocument';
import {policyPhase} from './localPlaceCatalog';
export function buildLocalPlaceDocument(report:MarketingReport):ReportBlock[]{
  const r=buildLocalPlaceReview(report.siteDiagnostics);if(!r)return [];
  const blocks:ReportBlock[]=[{kind:'heading',text:LOCAL_PLACE_TITLE},{kind:'body',text:r.evidence.name+' · '+r.sector.label+(r.evidence.franchise?' · 본사·가맹점 구분':''),href:r.page.url},{kind:'body',text:LOOKUP_LABELS[r.lookup.status]+' · '+r.lookup.note},{kind:'body',text:PLACE_SCOPE},{kind:'body',text:'조회 시각: '+r.lookup.observedAt+' · 검색어: '+(r.lookup.queries.join(' / ')||'미조회')}];
  for(const item of r.lookup.items)blocks.push({kind:'subheading',text:item.name+' · '+(item.match==='consistent'?'동일 업체 근거 일치':'업체·지점 확인 필요')},{kind:'body',text:'API 업종: '+(item.category||'응답에 없음')+' · 주소: '+(item.roadAddress||item.address||'응답에 없음')},{kind:'body',text:'API 소개: '+(item.description||'응답에 없음 · 상세설명 미등록 판정 아님')},{kind:'body',text:item.reasons.join(' · ')},{kind:'body',text:'지도에서 상호·주소 검색',href:item.mapUrl},...(item.link?[{kind:'body' as const,text:'API가 반환한 업체 링크',href:item.link}]:[]));
  for(const link of r.evidence.links)blocks.push({kind:'body',text:'홈페이지 연결 '+(link.kind==='place'?'플레이스':'네이버 단축 링크 · 목적지 확인'),href:link.url});
  blocks.push(...buildSeasonalPlaceDocument(r.seasonal));
  blocks.push({kind:'subheading',text:'업종별 우선 정보'},...r.sector.fields.map(text=>({kind:'body' as const,text})));
  for(const check of r.checks)blocks.push({kind:'subheading',text:check.label+' · '+check.status},{kind:'body',text:check.excerpt,href:check.url},{kind:'body',text:'실행: '+check.action});
  if(r.sector.id!=='medical')for(const group of ['상품·서비스','방문·이용 조건','고객·목적','지역·지점'])blocks.push({kind:'body',text:'홈페이지 관측 표현 · '+group+': '+(r.terms.filter(t=>t.group===group).map(t=>t.term).join(', ')||'표본에서 미확인')});
  blocks.push({kind:'body',text:'등록 키워드와 플레이스 사진·영상은 미조회입니다. 화면에서 입력한 대조값은 이 문서에 포함되지 않습니다.'},{kind:'body',text:'홈페이지 이미지 '+r.evidence.media.images+'개 · 설명 있는 이미지 '+r.evidence.media.described+'개 · 영상 요소 '+r.evidence.media.videos+'개'},{kind:'body',text:'홈페이지 메타 설명: '+(r.page.description||'미확인')},...r.sector.questions.map(text=>({kind:'body' as const,text:'답변 준비 질문: '+text})));
  blocks.push({kind:'subheading',text:'공식 공지·적용 조건 · '+r.reviewedOn+' 검토'});
  for(const p of r.policies)blocks.push({kind:'subheading',text:p.title+' · '+policyPhase(p,r.lookup.observedAt)},{kind:'body',text:'공지 '+p.published+(p.effective?' · 시행 '+p.effective:'')},{kind:'body',text:'적용 조건: '+p.scope},{kind:'body',text:'실행: '+p.action},{kind:'body',text:'네이버 공식 원문',href:p.url});
  r.steps.forEach((s,i)=>blocks.push({kind:'subheading',text:(i+1)+'. '+s.title},{kind:'body',text:s.text}));
  blocks.push({kind:'body',text:'지역 검색 API 제공 범위',href:r.apiDoc});return blocks;
}
