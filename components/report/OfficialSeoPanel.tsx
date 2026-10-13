'use client';
import React,{useMemo,useState} from 'react';
import type {OfficialSeoAudit,OfficialSeoEngine} from '@/lib/officialSeoSchema';
import {analyzeOfficialSeo} from '@/lib/analyzeOfficialSeo';
import {OFFICIAL_SEO_GUIDES,OFFICIAL_SEO_COVERAGE,OFFICIAL_SEO_SCOPE,OFFICIAL_SEO_EDUCATION,officialSeoCheckSources} from '@/lib/officialSeoCatalog';
import {OFFICIAL_SEO_TOPICS,OFFICIAL_SEO_STATUS,type OfficialSeoTopic} from '@/lib/officialSeoKnowledge';
const names={naver:'네이버',google:'Google'};
export default function OfficialSeoPanel({audit,targetUrl}:{audit?:OfficialSeoAudit|null;targetUrl:string}) {
 const report=useMemo(()=>audit||analyzeOfficialSeo(null,targetUrl),[audit,targetUrl]);
 const [engine,setEngine]=useState<'all'|OfficialSeoEngine>('all'),[status,setStatus]=useState('action');
 const [catalogOpen,setCatalogOpen]=useState(false),[topic,setTopic]=useState('all'),[query,setQuery]=useState(''),[page,setPage]=useState(0);
 const counts=report.checks.reduce((s,c)=>({...s,[c.status]:s[c.status]+1}),{observed:0,action:0,manual:0,not_applicable:0});
 const rows=report.checks.filter(c=>(engine==='all'||c.engines.includes(engine))&&(status==='all'||c.status===status));
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase();
  return OFFICIAL_SEO_GUIDES.filter(g=>(engine==='all'||g.engine===engine)&&(topic==='all'||g.topic===topic)&&(!q||[g.title,g.category,g.url,...g.guidance,...(g.properties||[]).flatMap(p=>[p.scope,...p.required,...p.recommended,...p.conditional])].join(' ').toLocaleLowerCase().includes(q)));
 },[engine,topic,query]);
 const pages=Math.max(1,Math.ceil(filtered.length/20)),current=Math.min(page,pages-1);
 function showTopic(next:string){setTopic(next);setQuery('');setPage(0);setCatalogOpen(true);}
 return <section className="report-card official-seo" id="official-seo" aria-labelledby="official-seo-title">
  <div className="report-card-heading"><div><p className="report-eyebrow">NAVER · GOOGLE · OFFICIAL SEO</p><h3 id="official-seo-title">공식 검색 기준 재검증</h3></div><span className="naver-reviewed">기준 확인일<br/><strong>{report.catalogVersion}</strong></span></div>
  <div className="official-seo-coverage"><strong>네이버 {OFFICIAL_SEO_COVERAGE.naver} · Google {OFFICIAL_SEO_COVERAGE.google} 문서</strong><span>반영 {OFFICIAL_SEO_COVERAGE.reviewed}개 · 교육 PDF 2종{OFFICIAL_SEO_COVERAGE.unavailable>0?` · 원문 재확인 필요 ${OFFICIAL_SEO_COVERAGE.unavailable}개`:null}</span></div>
  <p className="report-note">{OFFICIAL_SEO_SCOPE}</p>
  {report.mode==='guide'?<p className="naver-legacy">이전 보고서입니다. 현재 URL의 추가 검사는 재진단 후 표시됩니다.</p>:<div className="naver-counts">{(['action','observed','manual'] as const).map(key=><div key={key} data-state={key}><span>{OFFICIAL_SEO_STATUS[key]}</span><strong>{counts[key]}<small>개</small></strong></div>)}</div>}
  <div className="official-seo-controls">
   <label>검색엔진<select value={engine} onChange={e=>{setEngine(e.target.value as typeof engine);setPage(0);}}><option value="all">전체</option><option value="naver">네이버</option><option value="google">Google</option></select></label>
   <label>검사 결과<select value={status} onChange={e=>setStatus(e.target.value)}><option value="action">보완 필요</option><option value="observed">관측 확인</option><option value="manual">직접 확인</option><option value="all">전체</option></select></label>
   <span aria-live="polite">{rows.length}개 항목</span>
  </div>
  <div className="naver-checks">{rows.length?rows.map(check=><details key={check.id} className="naver-check" data-state={check.status}>
   <summary><span className="naver-check-main"><strong>{check.title}</strong><small>{check.engines.map(e=>names[e]).join(' · ')} · {check.evidence.length>220?check.evidence.slice(0,220)+'…':check.evidence}</small></span><span className="naver-badge">{OFFICIAL_SEO_STATUS[check.status]}</span><span aria-hidden="true">+</span></summary>
   <div className="naver-check-body"><p className="official-seo-evidence">{check.evidence}</p><p>{check.interpretation}</p><ol className="official-seo-steps">{check.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><div className="naver-completion"><strong>완료 확인</strong><p>{check.completion}</p></div><div className="naver-check-footer"><div className="naver-sources">{officialSeoCheckSources(check).slice(0,3).map(source=><a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">{names[source.engine]} · {source.title} ↗</a>)}</div><button type="button" className="naver-copy" onClick={()=>showTopic(check.topic)}>관련 기준 전체 보기</button></div></div>
  </details>):<p className="report-empty">이 조건의 항목이 없습니다. 직접 확인 항목과 문서 기준은 아래에서 확인하세요.</p>}</div>
  <details className="official-seo-library" open={catalogOpen} onToggle={e=>setCatalogOpen(e.currentTarget.open)}><summary>전체 문서 기준 · 유형별 속성 찾아보기</summary>
   <div className="official-seo-controls"><label className="official-seo-search">문서·속성 검색<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="예: Product, 파비콘, noindex"/></label><label>분야<select value={topic} onChange={e=>{setTopic(e.target.value);setPage(0);}}><option value="all">전체 분야</option>{Object.entries(OFFICIAL_SEO_TOPICS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
   <p className="report-note">각 유형·하위 기능을 사용할 때만 해당 속성을 적용합니다. 속성 목록은 필수값의 형식·허용값·조건·노출 자격에 대한 공식 검증을 대신하지 않습니다.</p>
   <div className="official-seo-guides">{filtered.slice(current*20,(current+1)*20).map(guide=><details key={guide.id} className="official-seo-guide"><summary><span><small>{names[guide.engine]} · {guide.category}</small><strong>{guide.title}</strong></span><span>{guide.status==='unavailable'?'재확인 필요':'기준 보기'} +</span></summary><div><p className="report-note">적용: {guide.applicability} · {OFFICIAL_SEO_TOPICS[guide.topic as OfficialSeoTopic]}</p>{guide.guidance.map((text,i)=><p key={i}>{text}</p>)}{guide.properties?.length? <div className="official-seo-properties">{guide.properties.map((group,i)=><div key={i}><h5>{group.scope} · 해당 유형/기능 사용 시</h5>{(['required','recommended','conditional'] as const).map(key=>group[key].length?<p key={key}><strong>{{required:'필수',recommended:'권장·선택',conditional:'조건·대안'}[key]}</strong><span>{group[key].join(' · ')}</span></p>:null)}</div>)}</div>:null}{guide.reviewNote?<p className="report-note">{guide.reviewNote}</p>:null}<a href={guide.reviewedUrl||guide.url} target="_blank" rel="noopener noreferrer">공식 원문의 세부 조건·예제 확인 ↗</a></div></details>)}</div>
   <div className="official-seo-pagination"><span aria-live="polite">{filtered.length}개 문서 · {current+1}/{pages}</span><button type="button" disabled={current===0} onClick={()=>setPage(current-1)}>이전</button><button type="button" disabled={current>=pages-1} onClick={()=>setPage(current+1)}>다음</button></div>
   <div className="naver-sources">{OFFICIAL_SEO_EDUCATION.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</div>
  </details>
 </section>;
}
