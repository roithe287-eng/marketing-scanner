'use client';
import React,{useState} from 'react';
import {
  PLACE_CATEGORIES,PLACE_TITLE,PLACE_LIMIT,PLACE_RULE,PLACE_ROLLOUT,PLACE_EXCLUSIONS,PLACE_NOTICE,
  comparePlaceEntries,type HospitalPlaceReview,type PlaceInputs,type PlaceCandidate
} from '@/lib/hospitalPlace';
import {RoleLabel} from './ReportRole';
import ClinicIcon from './ClinicIcon';
import ClinicComparisonPanel from './ClinicComparisonPanel';

const emptyEntries:PlaceInputs = {증상:'',질병:'',시술:'',검진:''};
const listText = (values:string[]) => values.slice(0,5).join(', ')+(values.length>5?' 외 '+(values.length-5)+'개':'');
function TermLink({candidate}:{candidate:PlaceCandidate}){
  const reason={title:'페이지 제목에 표시',body:'본문에서 확인',context:'칼럼·방문·이력 문맥 확인'}[candidate.basis];
  return <a className="hp-chip" data-basis={candidate.basis} href={candidate.url} target="_blank" rel="noopener noreferrer" title={reason+' · 원문 열기'}>
    {candidate.term}{candidate.basis==='context'&&<small>문맥 확인</small>}<span aria-hidden="true">↗</span>
  </a>;
}
export default function HospitalPlacePanel({review}:{review:HospitalPlaceReview}) {
  const [entries,setEntries]=useState<PlaceInputs>(emptyEntries);
  const comparison=comparePlaceEntries(review,entries);
  const count=review.groups.reduce((n,g)=>n+g.terms.length,0);
  return <>
    <section className="hospital-place hp-panel" aria-labelledby="hospital-place-title">
      <header className="hp-heading"><span className="hp-heading-icon"><ClinicIcon kind="place"/></span>
        <div><h4 id="hospital-place-title">{PLACE_TITLE}</h4><p>홈페이지에서 찾은 후보와 관리 화면의 등록 목록을 대조하세요.</p></div>
      </header>
      <ol className="hp-flow" aria-label="홈페이지 후보부터 등록 대조까지">
        <li><RoleLabel role="current" label="홈페이지 후보"/><b>{review.coverage==='sample'?count+'개':'미확인'}</b></li>
        <li><RoleLabel role="location" label="등록 목록"/><b>{comparison.count?comparison.count+' / '+PLACE_LIMIT+'개':'관리자 확인'}</b></li>
        <li><RoleLabel role="verify" label="같은 분류 일치"/><b>{comparison.count&&count?comparison.matches.length+'개':'대조 전'}</b></li>
      </ol>
      {review.coverage==='sample'?<div className="hp-category-grid">{review.groups.map(({category,terms})=>
        <article className="hp-category" key={category} data-filled={terms.length>0}><header><span className="hp-cat-icon"><ClinicIcon kind={category}/></span><strong>{category}</strong><span className="hp-count">{terms.length}개</span></header>
          {terms.length?<div className="hp-chips">{terms.slice(0,3).map(c=><TermLink key={c.term} candidate={c}/>)}{terms.length>3&&
            <details className="hp-more"><summary>외 {terms.length-3}개 보기</summary><div className="hp-chips">{terms.slice(3).map(c=><TermLink key={c.term} candidate={c}/>)}</div></details>}</div>:<p className="hp-empty">표본에서 미확인</p>}
        </article>)}</div>:<p className="hp-note">{review.coverage==='limited'?'수집 제한 · 공개 진료 문구를 확인하지 못했습니다.':'같은 URL로 다시 진단하면 홈페이지 후보를 확인할 수 있습니다.'}</p>}
      <div className="hp-channel"><span><ClinicIcon kind="place"/>홈페이지 연결</span>{review.link?<a href={review.link.url} target="_blank" rel="noopener noreferrer">{review.link.kind==='place'?'플레이스 링크 열기 ↗':'네이버 단축 링크 · 목적지 확인 ↗'}</a>:<span>플레이스 링크 미확인</span>}</div>
      <details className="hp-disclosure"><summary><span>등록한 키워드와 대조하기</span><small>4개 분류 · 합계 30개</small></summary>
        <div className="hp-disclosure-body"><p>스마트플레이스 ‘우리병원 검색 키워드’를 분류별로 입력하세요. 쉼표 또는 줄바꿈으로 구분합니다.</p>
          <div className="hp-input-grid">{PLACE_CATEGORIES.map(category=><label key={category}><span>{category}</span><textarea rows={2} maxLength={1800} value={entries[category]} placeholder={category+' 키워드'} onChange={e=>{const value=e.target.value;setEntries(prev=>({...prev,[category]:value}));}}/></label>)}</div>
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
    <ClinicComparisonPanel key={review.page.url} review={review} entries={entries}/>
  </>;
}
