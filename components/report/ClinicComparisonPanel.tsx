'use client';
import React,{useEffect,useId,useRef,useState} from 'react';
import {requestJson} from '@/lib/client/request';
import {sameSite} from '@/lib/siteIdentity';
import {PLACE_CATEGORIES,type HospitalPlaceReview,type PlaceInputs} from '@/lib/hospitalPlace';
import {
  clinicPageFactsSchema,compactText,comparisonScope,comparisonTitle,emptyFieldNotes,observationInsights,photoSubjects,registeredTerms,visibleVideo,
  type ClinicObservation,type ClinicPageFacts,type PlaceFieldNotes
} from '@/lib/clinicPlaceInsights';
import {RoleLabel} from './ReportRole';
import ClinicIcon from './ClinicIcon';

function PlaceNotes({notes,onChange,owner=false}:{notes:PlaceFieldNotes;onChange:(notes:PlaceFieldNotes)=>void;owner?:boolean}){
  return <div className="hp-notes">
    <div className="hp-input-grid">
      <label><span>대표사진 주제</span><select value={notes.photo} onChange={e=>onChange({...notes,photo:e.target.value as PlaceFieldNotes['photo']})}>{photoSubjects.map(v=><option key={v}>{v}</option>)}</select></label>
      <label><span>플레이스 영상</span><select value={notes.video} onChange={e=>onChange({...notes,video:e.target.value as PlaceFieldNotes['video']})}>{visibleVideo.map(v=><option key={v}>{v}</option>)}</select></label>
    </div>
    {!owner&&<label><span>병원이 제공한 등록 키워드</span><input maxLength={900} value={notes.registered} onChange={e=>onChange({...notes,registered:e.target.value})} placeholder="제공받은 값만, 쉼표로 구분"/></label>}
    <label><span>{owner?'우리 플레이스 소개문':'병원이 제공한 플레이스 소개문'}</span><textarea maxLength={1200} rows={2} value={notes.description} onChange={e=>onChange({...notes,description:e.target.value})} placeholder={owner?'현재 운영 중인 소개문':'분석 권한이 있는 문구만 입력'}/></label>
  </div>;
}

function mediaText(page:ClinicPageFacts|null) {
  const m=page?.media;
  return m?'이미지 '+m.images+'개 · 설명 있는 이미지 '+m.described+'개 · 영상 요소 '+m.videos+'개'+(m.subjects.length?' / 사진 설명의 주제 '+m.subjects.join('·'):''):'미측정';
}

function CompareResults({ours,peer,tags,ownNotes}:{ours:ClinicPageFacts;peer:ClinicObservation;tags:string[];ownNotes:PlaceFieldNotes}) {
  const [copyStatus,setCopyStatus]=useState('');
  const notes=peer.notes,other=peer.page,insights=observationInsights(ours,peer,tags,ownNotes);
  const keywords=(page:ClinicPageFacts|null)=>page?.terms?.length?compactText(page.terms.map(t=>t.term).join(', '),125):page?.terms?'표본에서 미확인':'미측정';
  const observedMedia=(n:PlaceFieldNotes)=>'사진 '+n.photo+' · '+(n.video==='영상 표시'?'영상 표시':n.video==='미확인'?'영상 미확인':'화면에서 영상 미확인');
  const facts=[
    ['홈페이지 진료 표현',keywords(ours),keywords(other)],
    ['홈페이지 메타 설명',ours.description||'표본에서 미확인',other?other.description||'표본에서 미확인':'미측정'],
    ['홈페이지 미디어',mediaText(ours),mediaText(other)],
    ['제공된 등록 키워드',tags.length?compactText(tags.join(', '),125):'우리 목록 미입력',registeredTerms(notes.registered).join(', ')||'미제공'],
    ['제공된 플레이스 소개',ownNotes.description||'미입력',notes.description||'미제공'],
    ['직접 본 플레이스 미디어',observedMedia(ownNotes),observedMedia(notes)]
  ];
  const location=peer.area+' · '+peer.query+' · 일반 결과 '+peer.position+'번째';
  const time=new Date(peer.seenAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  async function copy(){
    try {await navigator.clipboard.writeText([location,'직접 관찰 입력 '+time+' KST','비교 병원 '+peer.name,...facts.map(([label,a,b])=>label+' | 우리 '+a+' | 비교 '+b),...insights.map(i=>i.label+' · '+i.text),comparisonScope].join('\n'));setCopyStatus('복사했습니다.');}
    catch{setCopyStatus('화면의 비교 내용을 선택해 복사하세요.');}
  }
  return <div className="hp-comparison-result">
    <div className="hp-observation"><span>직접 관찰</span><strong>{location}</strong><small>기록 {time} KST</small></div>
    <div className="hp-sites"><div><small>우리 병원 · 홈페이지</small><a href={ours.url} target="_blank" rel="noopener noreferrer">{ours.title||new URL(ours.url).hostname} ↗</a></div>
      <div><small>비교 병원 · 일반 결과</small>{other?<a href={other.url} target="_blank" rel="noopener noreferrer">{peer.name} ↗</a>:<strong>{peer.name}</strong>}</div></div>
    <div className="hp-insights"><RoleLabel role="proposal" label="우리 병원에 적용할 점"/>
      <ul>{insights.slice(0,3).map(i=><li key={i.label}><strong>{i.label}</strong><span>{i.text}</span></li>)}</ul>
      {insights.length>3&&<details className="hp-more"><summary>제안 {insights.length-3}개 더 보기</summary><ul>{insights.slice(3).map(i=><li key={i.label}><strong>{i.label}</strong><span>{i.text}</span></li>)}</ul></details>}</div>
    <details className="hp-disclosure"><summary><span>항목별 대조</span><small>홈페이지 · 플레이스</small></summary>
      <dl className="hp-facts">{facts.map(([label,a,b])=><div key={label}><dt>{label}</dt><dd><small>우리 병원</small>{a}</dd><dd><small>비교 병원</small>{b}</dd></div>)}</dl>
    </details>
    <div className="hp-copy"><button type="button" onClick={copy}>비교 요약 복사</button><span role="status">{copyStatus}</span></div>
  </div>;
}

export default function ClinicComparisonPanel({review,entries}:{review:HospitalPlaceReview;entries:PlaceInputs}) {
  const queryList=useId();
  const options=[...new Set(review.groups.flatMap(g=>g.terms.map(t=>t.term)))];
  const [query,setQuery]=useState(review.groups.find(g=>g.category==='질병')?.terms[0]?.term||options[0]||'');
  const [area,setArea]=useState(''),[url,setUrl]=useState(''),[name,setName]=useState(''),[position,setPosition]=useState('');
  const [mode,setMode]=useState<'web'|'notes'>('web'),[organic,setOrganic]=useState(false);
  const [notes,setNotes]=useState<PlaceFieldNotes>(emptyFieldNotes),[ownNotes,setOwnNotes]=useState<PlaceFieldNotes>(emptyFieldNotes);
  const [rows,setRows]=useState<ClinicObservation[]>([]),[selected,setSelected]=useState(0),[ours,setOurs]=useState<ClinicPageFacts>(review.page);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[showForm,setShowForm]=useState(false);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  const tags=PLACE_CATEGORIES.flatMap(category=>registeredTerms(entries[category]));
  const lock=busy||rows.length>0;
  const mapSearch=area.trim()&&query.trim()?'https://map.naver.com/p/search/'+encodeURIComponent(area.trim()+' '+query.trim()):null;
  async function readPage(address:string,signal:AbortSignal){
    return clinicPageFactsSchema.parse(await requestJson('/api/clinic-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:address}),signal},17000));
  }
  async function add(e:React.FormEvent) {
    e.preventDefault();
    if(active.current||rows.length>=3)return;
    setError('');
    const order=Number(position);
    if(!area.trim()||!query.trim()){setError('먼저 검색어와 검색 지역을 입력하세요.');return;}
    if(!organic||!Number.isInteger(order)||order<1||order>100){setError('광고 표시를 확인하고 일반 결과에서 본 순서를 입력하세요.');return;}
    if(rows.some(r=>r.position===order)){setError('이 검색 조건에서 이미 비교한 순서입니다.');return;}
    if(mode==='notes'&&(!name.trim()||notes.photo==='미확인'&&notes.video==='미확인'&&!notes.description.trim()&&!notes.registered.trim())){
      setError('비교 병원명과 직접 확인했거나 제공받은 특징을 하나 이상 입력하세요.');return;
    }
    const controller=new AbortController();active.current=controller;setBusy(true);
    try {
      const peer=mode==='web'?await readPage(url,controller.signal):null;
      if(peer&&(sameSite(peer.url,ours.url)||sameSite(ours.url,peer.url)))throw new Error('우리 병원과 다른 공식 홈페이지 주소를 입력하세요.');
      if(peer&&rows.some(r=>r.page&&(sameSite(r.page.url,peer.url)||sameSite(peer.url,r.page.url))))throw new Error('이미 추가한 병원 홈페이지입니다.');
      if(mode==='notes'&&rows.some(r=>r.name===name.trim()))throw new Error('이미 추가한 병원입니다.');
      if(controller.signal.aborted)return;
      const observation:ClinicObservation={area:area.trim(),query:query.trim(),seenAt:new Date().toISOString(),position:order,name:peer?.title||name.trim()||(peer?new URL(peer.url).hostname:''),page:peer,notes:{...notes}};
      setRows(prev=>[...prev,observation]);setSelected(order);
      setUrl('');setName('');setPosition('');setOrganic(false);setNotes(emptyFieldNotes);setShowForm(false);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'비교 정보를 확인하지 못했습니다.');}
    finally{if(active.current===controller){active.current=null;setBusy(false);}}
  }
  async function refreshOwn() {
    if(active.current)return;
    const controller=new AbortController();active.current=controller;setBusy(true);setError('');
    try{const page=await readPage(ours.url,controller.signal);if(!controller.signal.aborted)setOurs(page);}
    catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'홈페이지를 확인하지 못했습니다.');}
    finally{if(active.current===controller){active.current=null;setBusy(false);}}
  }
  const peer=rows.find(r=>r.position===selected)||rows[0];
  return <section className="hp-panel hp-peer" aria-labelledby="hospital-place-comparison">
    <header className="hp-heading"><span className="hp-heading-icon"><ClinicIcon kind="compare"/></span><div><h4 id="hospital-place-comparison">{comparisonTitle}</h4>
      <p>같은 지역·검색어에서 직접 확인한 병원을 골라 소개문, 진료 표현, 사진·영상을 비교하세요.</p></div></header>
    <div className="hp-reference"><div><strong>우리 홈페이지</strong><small>{review.page.media?'진단 시 확인한 페이지':ours.media?'이번에 다시 확인한 페이지':'기존 보고서 · 미디어 미측정'}</small></div>
      <div><ClinicIcon kind="image"/><span>이미지</span><b>{ours.media?ours.media.images+'개':'미측정'}</b></div>
      <div><ClinicIcon kind="video"/><span>영상 요소</span><b>{ours.media?ours.media.videos+'개':'미측정'}</b></div>
      {!ours.media&&<button type="button" onClick={refreshOwn} disabled={busy}>홈페이지 확인</button>}</div>
    <div className="hp-query"><label><span>검색 지역</span><input maxLength={60} disabled={lock} value={area} placeholder="예) 부산 해운대구" onChange={e=>setArea(e.target.value)}/></label>
      <label><span>검색어</span><input maxLength={60} list={queryList} disabled={lock} value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <datalist id={queryList}>{options.map(t=><option key={t} value={t}/>)}</datalist>
      {mapSearch?<a className="hp-map-link" href={mapSearch} target="_blank" rel="noopener noreferrer">지도에서 결과 확인 ↗</a>:<span className="hp-map-prompt">지역·검색어를 입력하세요.</span>}</div>
    <div className="hp-controls"><button type="button" className="hp-add" disabled={busy||rows.length>=3} aria-expanded={showForm} onClick={()=>{setShowForm(!showForm);setError('');}}>{showForm?'입력 닫기':'+ 비교 병원 추가'}</button>
      {!!rows.length&&<button type="button" disabled={busy} onClick={()=>{setRows([]);setShowForm(false);setError('');setOrganic(false);setPosition('');setUrl('');setName('');setNotes(emptyFieldNotes);}}>검색 조건 변경</button>}
      <small>비교 {rows.length} / 3곳</small></div>
    {showForm&&<form className="hp-peer-form" onSubmit={add}><fieldset disabled={busy}><legend>비교할 일반 결과</legend>
      <div className="hp-input-grid"><label><span>비교 자료</span><select value={mode} onChange={e=>setMode(e.target.value as 'web'|'notes')}><option value="web">공식 홈페이지 분석</option><option value="notes">관찰·제공 자료만</option></select></label>
        <label><span>광고 제외 순서</span><input required type="number" min={1} max={100} value={position} placeholder="목록에서 본 순서" onChange={e=>setPosition(e.target.value)}/></label></div>
      {mode==='web'?<label><span>비교 병원 공식 홈페이지</span><input required inputMode="url" maxLength={2048} value={url} placeholder="병원 홈페이지 주소" onChange={e=>setUrl(e.target.value)}/></label>:
        <label><span>비교 병원명</span><input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}
      <label className="hp-confirm"><input type="checkbox" required checked={organic} onChange={e=>setOrganic(e.target.checked)}/><span>이 지역·검색어에서 광고 표시가 없는 병의원 결과를 직접 확인했습니다.</span></label>
      {mode==='notes'?<PlaceNotes notes={notes} onChange={setNotes}/>:<details className="hp-disclosure"><summary><span>플레이스 관찰·제공 자료 추가</span><small>선택</small></summary><PlaceNotes notes={notes} onChange={setNotes}/></details>}
      <button className="hp-primary" type="submit">{busy?'확인 중…':mode==='web'?'공식 홈페이지 분석하기':'관찰값 비교하기'}</button>
    </fieldset></form>}
    {error&&<p className="hp-error" role="alert">{error}</p>}
    {peer&&<><div className="hp-peer-tabs" role="group" aria-label="비교 병원 선택">{rows.map(r=><button key={r.position} type="button" aria-pressed={r.position===peer.position} onClick={()=>setSelected(r.position)}>{r.position}번째 · {compactText(r.name,22)}</button>)}</div>
      <CompareResults key={peer.seenAt} ours={ours} peer={peer} tags={tags} ownNotes={ownNotes}/>
      <button className="hp-remove" type="button" onClick={()=>setRows(prev=>prev.filter(r=>r.position!==peer.position))}>선택한 병원 빼기</button></>}
    <details className="hp-disclosure hp-own"><summary><span>우리 플레이스 관찰값 추가</span><small>선택</small></summary><PlaceNotes notes={ownNotes} onChange={setOwnNotes} owner/></details>
    <p className="hp-scope">{comparisonScope} 비교 입력값과 결과는 현재 화면에서만 사용합니다.</p>
  </section>;
}
