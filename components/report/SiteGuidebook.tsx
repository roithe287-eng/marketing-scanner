'use client';
import {VisualSteps} from './ReportVisualSummary';
import {RoleBox,RoleLabel} from './ReportRole';
import EvidenceFlow from './EvidenceFlow';
import React,{createContext,useContext,useMemo,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildSiteGuide,editingEvidence,editingPlatform,guideInstruction,PLATFORM_NAMES,type GuideRequest} from '@/lib/siteGuidebook';
import ElementCard from './SourceElementCard';
import {GUIDE_SOURCES,naverGuideCondition} from '@/lib/guideKnowledge';

const GuideContext=createContext<MarketingReport|null>(null);
export function SiteGuideProvider({report,children}:{report:MarketingReport;children:React.ReactNode}){return <GuideContext.Provider value={report}>{children}</GuideContext.Provider>;}
export function Guidebook(props:GuideRequest&{compact?:boolean}){
 return <GuidebookContent key={[props.title,props.topic,props.keyword,props.current,props.scope].join('::')} {...props}/>;
}
function GuidebookContent(props:GuideRequest&{compact?:boolean}){
 const report=useContext(GuideContext);
 const [selectedKey,setSelectedKey]=useState('');
 const guide=useMemo(()=>report?buildSiteGuide(report,{...props,selectedKey}):null,[report,props.title,props.proposal,props.keyword,props.topic,props.current,props.evidence,props.instructions,props.scope,props.completion,selectedKey]);
 const [status,setStatus]=useState(''),[fallback,setFallback]=useState(false);
 if(!guide)return null;
 const g=guide,sources=[...new Set([...g.effect.sources,...g.route.sources])];
 async function copyGuide(){try{await navigator.clipboard.writeText(guideInstruction(g));setStatus('실행 가이드를 복사했습니다.');setFallback(false);}catch{setFallback(true);setStatus('아래 작업 지시서를 선택해 복사하세요.');}}
 return <div className="guidebook guidebook-compact">
  {!props.compact&&<section className="guide-application" aria-label="적용 체크포인트">
   <header className="guide-application-heading"><RoleLabel role="proposal" label="적용 체크포인트"/><button type="button" className="report-secondary-button" onClick={copyGuide}>실행 가이드 복사</button></header>
   {g.targets.length>1&&<label className="guide-target-select">수정할 내용<select value={g.focus?.key||''} onChange={e=>setSelectedKey(e.target.value)}>{g.targets.map((e,i)=><option key={e.key} value={e.key}>{i+1}. {e.text.slice(0,90)||'이미지'}{g.targets.filter(t=>t.text===e.text).length>1?` · ${e.section?.label||e.href||e.tag.toUpperCase()}`:''}</option>)}</select></label>}
   <div className="guide-field-list">{g.fields.map((f,i)=><article key={f.label+i}><h6><span>{String(i+1).padStart(2,'0')}</span>{f.label}</h6><EvidenceFlow label={`${f.label} 현재와 수정안`} items={[{label:"현재 값",kicker:"AS-IS",role:"current",content:f.before},{label:"수정 방법",kicker:"TO-BE · 제안",role:"proposal",content:f.action},{label:"완료 조건",role:"verify",content:f.done}]}/></article>)}</div>
   {g.missing&&g.topic!=='account'&&<p className="guide-unconfirmed">저장된 HTML에서 일치하는 요소를 확인하지 못했습니다. 실제 페이지를 확인한 뒤 적용하세요.</p>}
   {g.proposal&&<RoleBox className="guide-proposal" role="proposal" label="적용할 문구" kicker="TO-BE · 제안"><p>{g.proposal}</p></RoleBox>}
   {status&&<p role="status" className="guide-note">{status}</p>}{fallback&&<label className="guide-fallback">전체 작업 지시서<textarea readOnly rows={8} value={guideInstruction(g)}/></label>}
  </section>}
  <div className="guide-outcomes">
   <RoleBox role="proposal" label="기대 효과"><p>{g.effect.expected}</p><small>{g.effect.limit}</small></RoleBox>
   <RoleBox role="verify" label="완료 후 확인"><p>{g.effect.metric}</p>{naverGuideCondition(g.topic)&&<small>{naverGuideCondition(g.topic)}</small>}</RoleBox>
   <RoleBox role="current" label="판단 근거"><p>{g.effect.mechanism}</p><div className="guide-links">{sources.map(id=><a href={GUIDE_SOURCES[id].url} key={id} target="_blank" rel="noopener noreferrer">{GUIDE_SOURCES[id].title} ↗</a>)}</div><small>공식 문서 확인 {g.reviewedAt}</small></RoleBox>
  </div>
 </div>;
}
export function SiteGuidebookOverview({report}:{report:MarketingReport}){
 const p=editingEvidence(report),site=p?.siteEditing,platform=editingPlatform(report),[filter,setFilter]=useState('all');
 const shown=site?.elements.filter(e=>filter==='all'||e.kind===filter)||[];
 return <section className="report-card guide-overview" id="report-site-guide" aria-label="URL 맞춤 편집 안내"><div className="report-card-heading"><p className="report-eyebrow">YOUR URL · EDITING GUIDEBOOK</p><h3>내 페이지의 현재 내용</h3><p className="report-note">종류별로 원문을 확인하고 필요한 문구를 복사하세요.</p></div>
 <VisualSteps kind="editing" label="페이지 편집 순서"/><div className="guide-platform"><RoleBox role="review" label="제작 도구 후보"><h4>{platform.label}</h4><p>공개 HTML의 단서로 추정한 후보입니다.</p></RoleBox><RoleBox role="verify" label="관측 범위"><h4>공개 HTML 원문</h4><p>실제 화면·관리자 화면은 미확인</p></RoleBox></div>
 {!!site?.signals.length&&<ul className="guide-signals">{site.signals.map(s=><li key={s.id}><strong>{PLATFORM_NAMES[s.id]} · {s.kind==='cms'?'제작 도구 후보':s.kind==='framework'?'프레임워크 단서':'전송 계층 단서'}</strong><span>{s.evidence.join(' · ')}</span></li>)}</ul>}
 <p className="guide-note">{site&&p?`대상: ${p.finalUrl} · 수집: ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(p.capturedAt))} KST`:'저장된 원문이 없습니다. 재진단 후 확인하세요.'}</p>
 <div className="guide-filters" role="group" aria-label="수집 원문 종류">{[['all','전체'],['heading','제목'],['text','본문'],['cta','링크·버튼'],['image','이미지'],['title','검색 제목'],['description','검색 설명']].map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
 <div className="guide-elements">{shown.map(e=><ElementCard key={e.key} element={e} url={p?.finalUrl||report.url}/>)}</div>{!shown.length&&<p className="guide-unconfirmed">이 종류의 저장된 요소가 없습니다. 실제 화면에서 존재 여부를 확인하세요.</p>}
 {site?.elementsTruncated&&<p className="guide-note">최대 100개 요소를 저장한 결과입니다. 수집 이후 생성되는 동적 콘텐츠와 저장 범위 밖의 내용은 원문에서 확인하세요.</p>}
 </section>;
}
