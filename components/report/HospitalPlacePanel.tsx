'use client';
import React,{useId,useRef,useState} from 'react';
import {
  PLACE_CATEGORIES,PLACE_TITLE,PLACE_LIMIT,PLACE_RULE,PLACE_ROLLOUT,PLACE_EXCLUSIONS,PLACE_NOTICE,
  comparePlaceEntries,type HospitalPlaceReview,type PlaceInputs,type PlaceCategory,type PlaceCandidate
} from '@/lib/hospitalPlace';
import ClinicIcon from './ClinicIcon';
import ClinicComparisonPanel from './ClinicComparisonPanel';

const emptyEntries:PlaceInputs={증상:'',질병:'',시술:'',검진:''};
const listText=(values:string[])=>values.slice(0,5).join(', ')+(values.length>5?' 외 '+(values.length-5)+'개':'');

function TermLink({candidate}:{candidate:PlaceCandidate}){
  const reason={title:'페이지 제목에 표시',body:'본문에서 확인',context:'칼럼·방문·이력 문맥 확인'}[candidate.basis];
  return <a className="hp-chip" data-basis={candidate.basis} href={candidate.url} target="_blank" rel="noopener noreferrer" title={reason+' · 원문 열기'}>
    {candidate.term}{candidate.basis==='context'&&<small>문맥 확인</small>}<span aria-hidden="true">↗</span>
  </a>;
}

/** An original folded-map pictogram, with no geographic data. */
function PlaceMarker(){
  return <svg className="hp-place-mark" viewBox="0 0 104 80" width="104" height="80" fill="none" aria-hidden="true" focusable="false">
    <path d="m7 31 26-10 33 10 30-11v45L67 77 34 65 7 76Z" fill="#e6f3ef" stroke="#abd3c8" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M33 21v44l34 12V31Z" fill="#cfe8df"/><path d="m10 54 23-9 34 12 26-10M17 34l10 14-10 23m51-14 16 12" stroke="#fff" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M33 22v42m34-32v44" stroke="#a3ccbf" strokeDasharray="3 3"/>
    <ellipse cx="53" cy="54" rx="12" ry="4" fill="#82b6a5" opacity=".4"/>
    <path d="M53 53s-17-16-17-29a17 17 0 1 1 34 0c0 13-17 29-17 29Z" fill="#25725e" stroke="#f9fffc" strokeWidth="2.5"/>
    <circle cx="53" cy="24" r="6.5" fill="#fff"/>
  </svg>;
}

export default function HospitalPlacePanel({review,webAllowed=true}:{review:HospitalPlaceReview;webAllowed?:boolean}){
  const [entries,setEntries]=useState<PlaceInputs>(emptyEntries);
  const [filter,setFilter]=useState<PlaceCategory|'전체'>('전체');
  const [editCategory,setEditCategory]=useState<PlaceCategory>('증상');
  const filterButtons=useRef<Partial<Record<PlaceCategory,HTMLButtonElement|null>>>({});
  const resultsId=useId(),inputsId=useId();
  const comparison=comparePlaceEntries(review,entries);
  const count=review.groups.reduce((total,g)=>total+g.terms.length,0);
  const groups=review.groups.filter(g=>filter==='전체'||g.category===filter);
  return <>
    <section className="hospital-place hp-panel" aria-labelledby="hospital-place-title">
      <header className="hp-place-head"><div><h4 id="hospital-place-title">{PLACE_TITLE}</h4>
        <p>홈페이지의 진료 표현과 스마트플레이스 등록 목록을 대조하세요.</p></div></header>
      <div className="hp-profile"><PlaceMarker/><div className="hp-profile-name"><small>홈페이지에서 확인한 병의원</small>
        <strong>{review.profile.name}</strong>{review.profile.address&&<span>{review.profile.address}</span>}
        <a href={review.page.url} target="_blank" rel="noopener noreferrer">{review.profile.host} ↗</a></div>
        {review.link?<a className="hp-place-link" href={review.link.url} target="_blank" rel="noopener noreferrer"><ClinicIcon kind="place"/>{review.link.kind==='place'?'플레이스 열기 ↗':'네이버 단축 링크 · 목적지 확인 ↗'}</a>:<span className="hp-profile-note">홈페이지의 플레이스 링크 미확인</span>}
      </div>
      {review.coverage==='sample'?<>
        <div className="hp-list-title"><h5>홈페이지 키워드 후보</h5><span>{count}개</span></div>
        <div className="hp-filters" role="group" aria-label="진료 키워드 분류 선택">
          <button type="button" aria-controls={resultsId} aria-pressed={filter==='전체'} onClick={()=>setFilter('전체')}>전체</button>
          {review.groups.map(g=><button type="button" key={g.category} ref={button=>{filterButtons.current[g.category]=button;}} aria-controls={resultsId} aria-pressed={filter===g.category} onClick={()=>setFilter(g.category)}>{g.category} <b>{g.terms.length}</b></button>)}
        </div>
        <div className="hp-category-list" id={resultsId} aria-live="polite">{groups.map(({category,terms})=>
          <article className="hp-category" key={category} data-filled={terms.length>0}>
            <header><span className="hp-cat-icon"><ClinicIcon kind={category}/></span><strong>{category}</strong></header>
            {terms.length?<div className="hp-chips">{terms.slice(0,filter==='전체'?3:terms.length).map(c=><TermLink key={c.term} candidate={c}/>)}
              {filter==='전체'&&terms.length>3&&<button className="hp-view-all" type="button" onClick={()=>{setFilter(category);filterButtons.current[category]?.focus();}}>+{terms.length-3}개 보기</button>}</div>:<p className="hp-empty">표본에서 미확인</p>}
          </article>)}</div>
      </>:<p className="hp-note">{review.coverage==='limited'?'수집 제한 · 공개 진료 문구를 확인하지 못했습니다.':'같은 URL로 다시 진단하면 홈페이지 후보를 확인할 수 있습니다.'}</p>}
      <dl className="hp-tally" aria-label="홈페이지 후보와 등록값 대조">
        <div><dt>홈페이지 후보</dt><dd>{review.coverage==='sample'?count+'개':'미확인'}</dd></div>
        <div><dt>등록 목록</dt><dd>{comparison.count?comparison.count+' / '+PLACE_LIMIT+'개':'관리자 확인'}</dd></div>
        <div><dt>같은 분류 일치</dt><dd>{comparison.count&&count?comparison.matches.length+'개':'대조 전'}</dd></div>
      </dl>
      <details className="hp-disclosure hp-entry"><summary><span>등록한 키워드와 대조하기</span><small>4개 분류 · 합계 30개</small></summary>
        <div className="hp-disclosure-body"><p>관리 화면의 등록값을 분류별로 입력하세요. 쉼표나 줄바꿈으로 나눌 수 있습니다.</p>
          <div className="hp-edit-choices" role="group" aria-label="등록 키워드 입력 분류">{PLACE_CATEGORIES.map(category=>
            <button type="button" key={category} aria-controls={inputsId} aria-pressed={editCategory===category} onClick={()=>setEditCategory(category)}>{category}</button>)}</div>
          <div id={inputsId}>{PLACE_CATEGORIES.map(category=><div key={category} hidden={editCategory!==category}><label><span>{category} 등록값</span><textarea rows={2} maxLength={1800} value={entries[category]} placeholder={category+' 키워드'} onChange={e=>{const value=e.target.value;setEntries(prev=>({...prev,[category]:value}));}}/></label></div>)}</div>
          <div className="hp-result" role="status" aria-live="polite">
            <strong>{comparison.count?'입력 '+comparison.count+'개 / 최대 '+PLACE_LIMIT+'개':'등록 목록 입력 전'}</strong>
            {comparison.count>PLACE_LIMIT&&<p>{comparison.count-PLACE_LIMIT}개 초과 · 주력 진료 항목부터 정리하세요.</p>}
            {!!comparison.duplicates.length&&<p>중복 표기 · {listText(comparison.duplicates)}</p>}
            {!!comparison.count&&!!count&&<><p>같은 분류에서 일치 · {comparison.matches.length}개</p>
              {!!comparison.otherCategory.length&&<p>분류 대조 · {listText(comparison.otherCategory)}</p>}
              {!!comparison.toCheck.length&&<p>입력 목록에서 미확인 · {listText(comparison.toCheck)}</p>}</>}
          </div>
        </div>
      </details>
      <details className="hp-disclosure hp-policy"><summary><span>등록 기준·제외 설정</span></summary><div className="hp-disclosure-body"><p>{PLACE_RULE}</p><p>{PLACE_ROLLOUT}</p><p>{PLACE_EXCLUSIONS}</p>
        <div className="hp-links"><a href="https://new.smartplace.naver.com/" target="_blank" rel="noopener noreferrer">관리 화면 ↗</a><a href={PLACE_NOTICE} target="_blank" rel="noopener noreferrer">등록 안내 ↗</a></div></div></details>
    </section>
    <ClinicComparisonPanel key={review.page.url} review={review} entries={entries} webAllowed={webAllowed}/>
  </>;
}
