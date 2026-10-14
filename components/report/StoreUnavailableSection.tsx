import React from 'react';
import type {ReportChapterId} from './ReportChapter';

type PreviewKind='radar'|'bars'|'table'|'journey'|'copy';
type Preview={id:string;title:string;reason:string;kind:PreviewKind;rows:readonly string[]};
const siteOnly='이번 스토어 URL 진단에서는 일반 웹사이트의 페이지 구조와 편집 권한을 전제로 한 평가를 적용하지 않습니다.';
const aiOnly='이번 스토어 URL 진단에서는 AI 답변·인용과 외부 출처를 수집하지 않아 결과를 제공하지 않습니다.';
const searchOnly='이번 스토어 URL 진단에서는 검색 순위·노출이나 네이버 쇼핑 검색 성과를 측정하지 않습니다.';
const evidenceOnly='공개 정보 일부만으로는 개별 스토어의 문제나 개선 효과를 판단할 수 없어 자동 진단을 적용하지 않습니다.';
const competitorOnly='이번 스토어 URL 진단에서는 경쟁 스토어와 업종 표본을 수집하지 않아 비교 결과를 제공하지 않습니다.';

/** UI-only fictional examples. Never passed to the report API, scoring, sharing or exports. */
export const STORE_UNAVAILABLE_SECTIONS:Record<ReportChapterId,readonly Preview[]>={
  overview:[
    {id:'today',title:'오늘 먼저 확인할 개선 과제',reason:evidenceOnly,kind:'journey',rows:['핵심 문구 점검','신뢰 정보 보완','행동 버튼 검토']},
    {id:'radar',title:'사이트 진단 레이더 · 종합 점수',reason:siteOnly,kind:'radar',rows:['첫 화면','행동 유도','문구','신뢰','전환 동선','광고 연결','모바일','SEO']},
    {id:'diagnosis-comparison',title:'이전 진단과 점수 비교',reason:'스토어에는 일반 웹사이트 점수를 생성하지 않으므로 점수 변화와 재진단 비교를 적용하지 않습니다.',kind:'bars',rows:['이전 진단','이번 진단','항목별 변화']},
    {id:'conversion',title:'고객의 전환 동선',reason:'공개 HTML 일부로 실제 화면·버튼 동작·구매 경로를 확인할 수 없어 전환 동선을 평가하지 않습니다.',kind:'journey',rows:['검색·유입','페이지 이해','신뢰 확인','문의·구매']},
  ],
  geo:[
    {id:'readiness',title:'GEO 준비도 점검판',reason:siteOnly,kind:'bars',rows:['브랜드 식별','질문과 답변','구조화 정보']},
    {id:'citation',title:'AI 답변에서 확인한 GEO 결과',reason:aiOnly,kind:'table',rows:['고객 질문 A · 언급 예시','고객 질문 B · 인용 예시','고객 질문 C · 출처 예시']},
    {id:'answer-map',title:'질문과 답변 페이지 연결',reason:aiOnly,kind:'journey',rows:['고객 질문','답변 내용','근거 페이지']},
    {id:'brand-review',title:'AI가 설명하는 브랜드',reason:aiOnly,kind:'copy',rows:['예시 브랜드의 핵심 서비스','고객이 확인할 차별점','설명을 뒷받침할 근거']},
    {id:'sources',title:'AI 답변의 출처 목록',reason:aiOnly,kind:'table',rows:['예시 공식 소개 페이지','예시 서비스 안내 페이지','예시 외부 참고 페이지']},
    {id:'geo-comparison',title:'GEO 재진단 비교',reason:aiOnly,kind:'bars',rows:['이전 답변 관측','이번 답변 관측','인용 출처 변화']},
  ],
  search:[
    {id:'page-edit',title:'페이지 수정 전·후 미리보기',reason:evidenceOnly,kind:'copy',rows:['수정 전 · 예시 페이지 문구','수정 후 · 혜택과 근거를 연결한 문구','확인할 지표 · 행동 버튼 클릭']},
    {id:'page-map',title:'페이지별 작업 지도',reason:siteOnly,kind:'table',rows:['소개 페이지 · 설명 보완','서비스 페이지 · 근거 연결','문의 페이지 · 동선 점검']},
    {id:'growth-plan',title:'SEO·GEO·AEO 성장 계획',reason:evidenceOnly,kind:'journey',rows:['검색에서 찾기','내용 이해하기','다음 행동하기']},
    {id:'keywords',title:'키워드 작업실 · 전체 빈도',reason:'스토어 전체 본문을 수집하지 않으므로 키워드 빈도와 자동 수정안을 만들지 않습니다. 확인된 제목·설명은 위 실제 관측 영역에서 볼 수 있습니다.',kind:'table',rows:['예시 핵심 표현 · 12회','예시 서비스 표현 · 8회','예시 고객 질문 · 4회']},
    {id:'rank',title:'키워드 검색 순위',reason:searchOnly,kind:'table',rows:['예시 키워드 A · 3위','예시 키워드 B · 8위','예시 키워드 C · 12위']},
    {id:'naver',title:'네이버 웹 검색 최적화',reason:'일반 웹사이트용 네이버 웹 검색 점검은 네이버 쇼핑·스토어 검색 평가와 다르므로 이번 진단에 적용하지 않습니다.',kind:'bars',rows:['웹 검색 등록','문서 정보','수집 설정']},
    {id:'technical-seo',title:'공식 가이드 기반 기술 SEO',reason:'HTML 템플릿·robots.txt·사이트맵 등 네이버 플랫폼 관리 영역을 판매자의 개선 점수로 평가하지 않습니다.',kind:'table',rows:['페이지 제목 · 예시 확인','사이트맵 · 예시 확인','수집 설정 · 예시 검토']},
    {id:'checklist',title:'기본 진단 체크리스트',reason:evidenceOnly,kind:'table',rows:['첫 화면 메시지 · 통과 예시','신뢰 정보 · 보완 예시','모바일 동선 · 검토 예시']},
  ],
  competition:[
    {id:'landscape',title:'경쟁사 비교 지도',reason:competitorOnly,kind:'bars',rows:['예시 업체 A','예시 업체 B','예시 업체 C']},
    {id:'messages',title:'경쟁사 표현별 상세 비교',reason:competitorOnly,kind:'table',rows:['예시 업체 A · 핵심 혜택','예시 업체 B · 신뢰 근거','예시 업체 C · 고객 안내']},
    {id:'competitor-pages',title:'경쟁사 페이지 원문과 상세 분석',reason:competitorOnly,kind:'copy',rows:['예시 업체의 소개 문구','고객층과 서비스 설명','차이를 확인할 원문']},
    {id:'benchmark',title:'같은 업종의 수집 표본 비교',reason:competitorOnly,kind:'bars',rows:['예시 표본 평균','예시 상위 표본','예시 비교 대상']},
  ],
  actions:[
    {id:'execution',title:'개선 과제 실행 보드',reason:evidenceOnly,kind:'journey',rows:['확인한 문제','수정할 작업','검증할 지표']},
    {id:'geo-focus',title:'GEO 집중 개선 과제',reason:aiOnly,kind:'table',rows:['브랜드 설명 정리','질문별 근거 연결','AI 답변 다시 관측']},
    {id:'issues',title:'핵심 이슈와 개선 예시',reason:evidenceOnly,kind:'copy',rows:['문제 · 예시 정보 누락','조치 · 근거 문구 보완','검증 · 실제 화면 확인']},
    {id:'roadmap',title:'실행 일정과 빠른 개선',reason:evidenceOnly,kind:'journey',rows:['즉시 확인','이번 주 수정','다음 관측']},
    {id:'copy',title:'문구 개선안',reason:evidenceOnly,kind:'copy',rows:['기존 예시 문구','고객 혜택을 구체화한 예시','사실과 근거를 확인할 목록']},
  ],
};

function Example({preview}:{preview:Preview}) {
  const {kind,rows}=preview;
  if(kind==='radar')return <div className="store-demo-radar"><svg viewBox="0 0 240 200" aria-hidden="true"><g fill="none" stroke="#ccd6e1">{[1,.7,.4].map(scale=><polygon key={scale} points="120,16 180,41 205,100 180,159 120,184 60,159 35,100 60,41" transform={`translate(${120*(1-scale)} ${100*(1-scale)}) scale(${scale})`}/>)}</g><polygon points="120,40 163,57 187,100 156,136 120,161 76,144 60,100 83,63" fill="#b9ddce" stroke="#277a62" strokeWidth="2"/></svg><div>{rows.map(row=><span key={row}>{row}<b>예시</b></span>)}</div></div>;
  if(kind==='bars')return <div className="store-demo-bars">{rows.map((row,i)=><div key={row}><span>{row}</span><div><i style={{width:`${[72,48,85][i%3]}%`}}/></div><b>{[72,48,85][i%3]}</b></div>)}</div>;
  if(kind==='journey')return <div className="store-demo-journey">{rows.map((row,i)=><div key={row}><b>0{i+1}</b><strong>{row}</strong><span>예시 확인 항목</span></div>)}</div>;
  return <div className={`store-demo-${kind}`}>{rows.map((row,i)=><div key={row}><span>{kind==='table'?`0${i+1}`:i===0?'BEFORE':i===1?'AFTER':'CHECK'}</span><strong>{row}</strong><i/></div>)}</div>;
}

export default function StoreUnavailableSections({chapter}:{chapter:ReportChapterId}) {
  return <div className="store-unavailable-grid">{STORE_UNAVAILABLE_SECTIONS[chapter].map(preview=><article key={preview.id} className="report-card store-unavailable" data-store-section={preview.id} data-applicability="unavailable" aria-labelledby={`store-section-${preview.id}`}>
    <div className="store-section-heading"><h3 id={`store-section-${preview.id}`}>{preview.title}</h3><span>미적용</span></div>
    <p className="store-demo-label">일반 웹사이트 진단 예시 · 이 스토어의 분석값이 아닙니다</p>
    <div className="store-unavailable-body">
      <div className="store-example-blur" inert aria-hidden="true"><Example preview={preview}/></div>
      <div className="store-unavailable-overlay"><span className="store-lock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="4" y="10" width="16" height="12" rx="3"/><path d="M12 14v4"/></svg></span><strong>스마트스토어·브랜드스토어는 미적용</strong><p>{preview.reason}</p></div>
    </div>
  </article>)}</div>;
}
