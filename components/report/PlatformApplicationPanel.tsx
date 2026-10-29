'use client';
import React,{useId,useMemo,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {APPLICATION_PLATFORMS,applicationRoute,applicationTextReady,buildPlatformApplication,platformApplicationBrief,type ApplicationPlatform,type OtherEditor} from '@/lib/platformApplication';
import ReportJumpLink from './ReportJumpLink';

function CopyApplication({text,label,disabled=false}:{text:string;label:string;disabled?:boolean}){
 const [message,setMessage]=useState(''),[fallback,setFallback]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(text);setMessage('복사했습니다.');setFallback(false);}catch{setFallback(true);setMessage('아래 내용을 선택해 복사하세요.');}}
 return <div className="apply-copy"><button type="button" className="report-secondary-button" disabled={disabled} onClick={copy}>{label}</button><span role="status" aria-live="polite">{message}</span>{fallback&&<label>복사할 내용<textarea readOnly rows={5} value={text} onFocus={e=>e.currentTarget.select()}/></label>}</div>;
}
export default function PlatformApplicationPanel({report}:{report:MarketingReport}){
 return <InstallationGuide key={`${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report}/>;
}
function InstallationGuide({report}:{report:MarketingReport}){
 const model=useMemo(()=>buildPlatformApplication(report),[report]);
 const [selected,setSelected]=useState<ApplicationPlatform|null>(model.initialPlatform),[other,setOther]=useState<OtherEditor>(model.otherEditor);
 const id=useId(),route=selected?applicationRoute(model,selected,other):null;
 return <section className="report-card platform-application" id="report-platform-application" aria-labelledby={`${id}-heading`}>
  <header className="apply-heading"><h3 id={`${id}-heading`}>호스팅별 설정·설치 방법</h3><p>사용 중인 플랫폼을 선택하면 입력 위치와 적용 순서를 확인할 수 있습니다.</p><strong className="apply-detected">{model.detected.label}</strong></header>
  <div className="apply-platforms" aria-label="플랫폼별 적용 가이드">{APPLICATION_PLATFORMS.map(p=><button type="button" key={p.id} aria-expanded={selected===p.id} aria-controls={`${id}-panel`} onClick={()=>setSelected(current=>current===p.id?null:p.id)}><span className="apply-platform-icon" aria-hidden="true">{p.icon}</span><strong>{p.label}</strong><small>{model.initialPlatform===p.id&&model.detected.platform?'감지된 플랫폼':'설정 방법'}</small><span aria-hidden="true">{selected===p.id?'−':'＋'}</span></button>)}</div>
  <div id={`${id}-panel`} hidden={!selected}>
   {route&&selected&&<>
    <div className="apply-context"><h4>{route.label} 설정 방법</h4>{selected==='other'&&<label>편집 방식<select value={other} onChange={e=>setOther(e.target.value as OtherEditor)}><option value="unknown">공통 안내</option><option value="wordpress">WordPress</option><option value="shopify">Shopify</option><option value="wix">Wix</option><option value="custom">직접 제작·독립몰</option></select></label>}<small>관리자 버전에 따라 메뉴 이름이 다를 수 있습니다.</small></div>
    <div className="apply-setup-grid">{route.guides.map(guide=><article className="apply-setup-card" key={guide.id}><h5>{guide.title}</h5><div className="apply-location"><strong>입력 위치</strong><p>{guide.path.join(' → ')}</p></div><ol>{guide.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><div className="apply-check"><strong>완료 확인</strong><p>{guide.check}</p></div></article>)}</div>
    <div className="apply-section-heading"><h4>입력할 수정값</h4></div>
    <div className="apply-fields">{model.fields.map(field=><article key={field.id} className="apply-field"><h5>{field.label}</h5><div className="apply-current"><strong>현재</strong><p>{field.before||'실제 화면에서 확인'}</p></div><div className="apply-value"><strong>입력할 값</strong><p>{field.value||'실제 내용으로 작성'}</p></div><CopyApplication label={`${field.label} 복사`} text={field.value} disabled={!applicationTextReady(field.value)}/></article>)}</div>
    <p className="apply-destination"><strong>버튼 연결</strong> · {model.ctaUrl||'현재 버튼의 링크·전화·예약창 동작에서 확인'}</p>
    <div className="apply-footer"><ReportJumpLink id="report-view-overview-questions">고객 질문·답변 확인</ReportJumpLink><CopyApplication label={`${route.label} 설정 방법 전체 복사`} text={platformApplicationBrief(model,selected,other)}/></div>
    <footer className="apply-sources"><div>{route.sources.map(source=><a href={source.url} key={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</div></footer>
   </>}
  </div>
 </section>;
}
