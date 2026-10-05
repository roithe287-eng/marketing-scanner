'use client';
import React,{createContext,useContext,useMemo,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {elementLocation} from '@/lib/guideGrounding';
import type {PageElement} from '@/lib/siteEditingSchema';
import {buildSiteGuide,editingEvidence,editingPlatform,elementLink,guideInstruction,PLATFORM_NAMES,type GuideRequest} from '@/lib/siteGuidebook';
import {GUIDE_SOURCES} from '@/lib/guideKnowledge';

const GuideContext=createContext<MarketingReport|null>(null);
export function SiteGuideProvider({report,children}:{report:MarketingReport;children:React.ReactNode}){return <GuideContext.Provider value={report}>{children}</GuideContext.Provider>;}
function ElementCard({element,url,nearby=false}:{element:PageElement;url:string;nearby?:boolean}){
 const href=elementLink(url,element);
 return <article className="guide-element"><div><span>{nearby?'삽입 위치를 찾기 위한 참고 원문':`수집 원문 · ${element.tag.toUpperCase()}`}</span><small>HTML 순서 {element.order}</small></div>{element.section&&<p className="guide-context"><strong>소속 구역</strong> {elementLocation(element)}</p>}{element.heading&&element.kind!=='heading'&&<p className="guide-context">앞선 제목: {element.heading}</p>}<blockquote>{element.text||'대체 텍스트가 저장되지 않은 이미지'}</blockquote>{element.truncated&&<p className="guide-note">긴 원문의 일부입니다. 수정할 때는 원문 전체와 문맥을 확인하세요.</p>}<details className="guide-selector"><summary>개발자용 HTML 위치 보기</summary><code>{element.selector}</code><p>수집 시점의 선택자입니다. 현재 DOM과 달라질 수 있으며 관리자 메뉴·소스 파일명은 아닙니다.</p></details>{href&&<a href={href} target="_blank" rel="noopener noreferrer">원문에서 위치 확인 ↗</a>}</article>;
}
export function Guidebook(props:GuideRequest&{compact?:boolean}){
 const report=useContext(GuideContext);
 const [selectedKey,setSelectedKey]=useState('');
 const guide=useMemo(()=>report?buildSiteGuide(report,{...props,selectedKey}):null,[report,props.title,props.proposal,props.keyword,props.topic,props.current,props.evidence,props.instructions,props.scope,props.completion,selectedKey]);
 const [status,setStatus]=useState(''),[fallback,setFallback]=useState(false);
 if(!guide)return null;
 const g=guide,sources=[...new Set([...g.effect.sources,...g.route.sources])];
 return <div className="guidebook">
  <div className="guide-effect"><span className="guide-label">기대효과 · 조건부</span><span className="guide-proof-badge">{g.effect.sources.length?'공식 원리 근거 · 사이트 성과는 별도 검증':'측정·운영 목적 · 성과 근거 아님'}</span><p>{g.effect.expected}</p><small>{g.effect.limit}</small></div>
  {!props.compact&&<details className="guide-details"><summary><span><strong>어디서, 어떻게 수정하나요?</strong><small>{g.platform.label} · 원문 위치 → 편집 경로 → 적용 → 검증</small></span><b aria-hidden="true">＋</b></summary>
   <div className="guide-content"><p className="guide-note">{g.route.scope}</p><div className="guide-route" aria-label="권장 편집 경로">{g.route.path.map((s,i)=><span key={i}><b>{i+1}</b>{s}</span>)}</div><p>{g.route.instruction}</p>
   <div className="guide-source-heading"><h5>이 URL에서 찾을 원문</h5><span>{g.hasCapture?'수집 HTML 위치 연결':'이전 보고서 · 위치 관측 없음'}</span></div>
   <div className="guide-grounding"><strong>{g.matchLabel}</strong><p>{g.matchReason}</p>{g.targets.length>1&&<label>수정할 원문 선택 · {g.targets.length}개 연결<select value={g.focus?.key||''} onChange={e=>setSelectedKey(e.target.value)}>{g.targets.map((e,i)=><option key={e.key} value={e.key}>{i+1}. {e.section?.label||e.tag.toUpperCase()} · {e.text.slice(0,90)||'이미지'}</option>)}</select></label>}<p><b>페이지에서 찾을 구역</b> {g.location}</p></div>
   {g.focus&&<ElementCard key={g.focus.key} element={g.focus} url={g.url}/>}
   {!!g.settings.length&&<div className="guide-settings">{g.settings.map(s=><article key={s.selector}><strong>{s.name}</strong><pre>{s.value||'빈 값'}{s.truncated?'\n(일부 발췌 · 전체 원본 확인 필요)':''}</pre><details className="guide-selector"><summary>설정의 HTML 위치</summary><code>{s.selector}</code></details></article>)}</div>}
   <div className="guide-field-list"><h5>이 위치에서 실제로 수정할 항목</h5>{g.fields.map((f,i)=><article key={f.label+i}><h6>{String(i+1).padStart(2,'0')} · {f.label}</h6><dl><div><dt>현재 값</dt><dd>{f.before}</dd></div><div><dt>수정 방법</dt><dd>{f.action}</dd></div><div><dt>완료 조건</dt><dd>{f.done}</dd></div></dl></article>)}</div>
   {g.missing&&g.topic!=='account'&&<p className="guide-unconfirmed">일치하는 요소를 저장된 HTML에서 확인하지 못했습니다. 실제 페이지에서 위치를 확인한 뒤 수정하세요. 관리자 화면과 브라우저 렌더링은 수집하지 않았습니다.</p>}
   {g.nearby.map(e=><ElementCard key={e.key} element={e} url={g.url} nearby/>)}
   <p className="guide-note">위치는 화면의 좌표가 아닌 문서 순서입니다. 원문 링크의 위치 이동은 브라우저 지원·페이지 변경에 따라 작동하지 않을 수 있습니다. 그때는 원문 문구로 페이지 찾기를 사용하세요.</p>
   <ol className="guide-steps">{g.steps.map((s,i)=><li key={s.title}><span>{String(i+1).padStart(2,'0')}</span><div><h5>{s.title}</h5><p>{s.detail}</p></div></li>)}</ol>
   {g.proposal&&<div className="guide-proposal"><h5>이 작업에 적용할 TO-BE · 사실 확인 후 사용</h5><p>{g.proposal}</p></div>}
   <div className="guide-proof"><h5>기대효과의 근거와 확인 지표</h5><p><strong>{g.effect.sources.length?'공식 문서가 설명하는 원리':'수신 확인이 필요한 측정 작업'}</strong>{g.effect.mechanism}</p><p><strong>확인할 지표</strong>{g.effect.metric}</p><p><strong>효과 판정 조건</strong>원문·설정 반영과 실제 성과를 나눠 확인합니다. 단순 전후 차이는 이 수정의 인과 효과가 아닙니다.</p><div className="guide-links">{sources.map(id=><a href={GUIDE_SOURCES[id].url} key={id} target="_blank" rel="noopener noreferrer">{GUIDE_SOURCES[id].title} ↗</a>)}</div><small>공식 문서 검토 {g.reviewedAt} · 해당 사이트의 성과를 실증한 자료는 아닙니다.</small></div>
   <button type="button" className="report-secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(guideInstruction(g));setStatus('위치·순서·기대효과·근거를 복사했습니다.');setFallback(false);}catch{setFallback(true);setStatus('아래 전체 작업 지시서를 직접 선택해 복사하세요.');}}}>맞춤 실행 가이드 복사</button><p role="status" className="guide-note">{status}</p>{fallback&&<label className="guide-fallback">전체 작업 지시서<textarea readOnly rows={12} value={guideInstruction(g)}/></label>}
   </div>
  </details>}
 </div>;
}
export function SiteGuidebookOverview({report}:{report:MarketingReport}){
 const p=editingEvidence(report),site=p?.siteEditing,platform=editingPlatform(report),[expanded,setExpanded]=useState(false),[filter,setFilter]=useState('all');
 const all=site?.elements.filter(e=>filter==='all'||e.kind===filter)||[],shown=expanded?all:all.slice(0,5);
 return <section className="report-card guide-overview" id="report-site-guide" aria-label="URL 맞춤 편집 안내"><div className="report-card-heading"><p className="report-eyebrow">YOUR URL · EDITING GUIDEBOOK</p><h3>이 사이트는 어디서 수정할까요?</h3><p className="report-note">각 개선안 아래에 편집 경로와 기대효과를 연결했습니다. 먼저 제작 도구의 단서와 실제 수집 원문을 확인하세요.</p></div>
 <div className="guide-platform"><div><span className="guide-label">제작 도구</span><h4>{platform.label}</h4><p>공개 HTML의 흔적을 이용한 후보 판단입니다. 호스팅·CDN과 콘텐츠 편집 도구는 다릅니다.</p></div><div><span className="guide-label">관측 범위</span><h4>HTML 원문·요소 위치</h4><p>브라우저 화면 캡처·관리자 화면·화면 좌표는 포함하지 않습니다. 아래 카드는 수집 원문을 재배열한 안내입니다.</p></div></div>
 {!!site?.signals.length&&<ul className="guide-signals">{site.signals.map(s=><li key={s.id}><strong>{PLATFORM_NAMES[s.id]} · {s.kind==='cms'?'제작 도구 후보':s.kind==='framework'?'프레임워크 단서':'전송 계층 단서'}</strong><span>{s.evidence.join(' · ')}</span></li>)}</ul>}
 <p className="guide-note">{site&&p?`대상: ${p.finalUrl} · 수집: ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(p.capturedAt))} KST`:'이전 보고서에는 새 위치 관측값이 없습니다. 재진단하면 제작 도구 단서와 요소 위치를 함께 저장합니다.'}</p>
 <div className="guide-filters" role="group" aria-label="수집 원문 종류">{[['all','전체'],['heading','제목'],['text','본문'],['cta','링크·버튼'],['image','이미지'],['title','검색 제목'],['description','검색 설명']].map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setExpanded(false);}}>{label}</button>)}</div>
 <div className="guide-elements">{shown.map(e=><ElementCard key={e.key} element={e} url={p?.finalUrl||report.url}/>)}</div>{!shown.length&&<p className="guide-unconfirmed">이 종류의 저장된 요소가 없습니다. 실제 화면에서 존재 여부를 확인하세요.</p>}
 {all.length>5&&<button type="button" className="report-secondary-button" onClick={()=>setExpanded(!expanded)}>{expanded?'원문 목록 접기':`${all.length}개 수집 원문 모두 보기`}</button>}
 {site?.elementsTruncated&&<p className="guide-note">최대 100개 요소를 저장한 결과입니다. 수집 이후 생성되는 동적 콘텐츠와 저장 범위 밖의 내용은 원문에서 확인하세요.</p>}
 </section>;
}
