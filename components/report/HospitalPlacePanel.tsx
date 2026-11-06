'use client';
import React,{useState} from 'react';
import {
  PLACE_CATEGORIES,PLACE_TITLE,PLACE_LIMIT,PLACE_RULE,PLACE_ROLLOUT,PLACE_EXCLUSIONS,PLACE_NOTICE,
  comparePlaceEntries,type HospitalPlaceReview,type PlaceInputs
} from '@/lib/hospitalPlace';

const emptyEntries:PlaceInputs = {증상:'',질병:'',시술:'',검진:''};
const listText = (values:string[]) => values.slice(0,5).join(', ')+(values.length>5?' 외 '+(values.length-5)+'개':'');

export default function HospitalPlacePanel({review}:{review:HospitalPlaceReview}) {
  const [entries,setEntries] = useState<PlaceInputs>(emptyEntries);
  const comparison = comparePlaceEntries(review,entries);
  const count = review.groups.reduce((n,g)=>n+g.terms.length,0);
  return <section className="hospital-place" aria-labelledby="hospital-place-title">
    <header><h4 id="hospital-place-title">{PLACE_TITLE}</h4><span>등록 상태 · 관리자 확인</span></header>
    <p>{PLACE_RULE}</p>
    <p className="hospital-place-sub">{PLACE_ROLLOUT}</p>
    <strong className="hospital-place-label">홈페이지에서 찾은 진료 키워드 후보</strong>
    {review.coverage==='sample'?<dl className="hospital-place-terms">{review.groups.map(({category,terms})=>
      <div key={category}><dt>{category}</dt><dd>{terms.length?<>
        {terms.slice(0,3).map(t=><a key={t.term} href={t.url} target="_blank" rel="noopener noreferrer">{t.term}</a>)}
        {terms.length>3&&<details><summary>외 {terms.length-3}개</summary>{terms.slice(3).map(t=><a key={t.term} href={t.url} target="_blank" rel="noopener noreferrer">{t.term}</a>)}</details>}
      </>:<span>표본에서 미확인</span>}</dd></div>)}</dl>:
      <p>{review.coverage==='limited'?'홈페이지 수집이 제한되어 공개 문구를 확인하지 못했습니다.':'키워드 후보를 보려면 같은 URL로 새로 진단하세요.'}</p>}
    <p className="hospital-place-channel"><strong>홈페이지 연결</strong>{review.link?<a href={review.link.url} target="_blank" rel="noopener noreferrer">
      {review.link.kind==='place'?'플레이스 링크 열기 ↗':'네이버 단축 링크 · 목적지 확인 ↗'}</a>:<span>플레이스 링크 미확인</span>}</p>
    <details className="hospital-place-compare"><summary>등록한 키워드와 대조하기</summary>
      <p>스마트플레이스 업체정보의 ‘우리병원 검색 키워드’를 분류별로 입력하세요. 쉼표나 줄바꿈으로 구분하며 이 화면에서만 대조합니다.</p>
      <div className="hospital-place-inputs">{PLACE_CATEGORIES.map(category=><label key={category}><strong>{category}</strong>
        <textarea rows={2} maxLength={1800} value={entries[category]} placeholder={category+' 키워드'}
          onChange={e=>setEntries({...entries,[category]:e.target.value})}/></label>)}</div>
      <div className="hospital-place-result" role="status" aria-live="polite">{comparison.count?<>
        <strong>입력 {comparison.count}개 · 네 분류 합계 최대 {PLACE_LIMIT}개</strong>
        {comparison.count>PLACE_LIMIT && <p>{comparison.count-PLACE_LIMIT}개 초과 · 주력 진료 항목부터 정리하세요.</p>}
        {!!comparison.duplicates.length && <p>중복 표기 · {listText(comparison.duplicates)}</p>}
        {count>0 && <><p>같은 분류에서 일치 · {comparison.matches.length}개</p>
          {!!comparison.otherCategory.length && <p>분류 대조 · {listText(comparison.otherCategory)}</p>}
          {!!comparison.toCheck.length && <p>입력 목록에서 미확인 · {listText(comparison.toCheck)}</p>}</>}
        <p>실제 진료하는 항목인지 확인한 뒤 관리 화면에서 저장하세요.</p>
      </>:<span>등록 목록을 입력하면 개수·중복·홈페이지 후보와의 일치를 확인합니다.</span>}</div>
      <p className="hospital-place-sub">{PLACE_EXCLUSIONS}</p>
      <a href="https://new.smartplace.naver.com/" target="_blank" rel="noopener noreferrer">스마트플레이스 관리 ↗</a>
      <a href={PLACE_NOTICE} target="_blank" rel="noopener noreferrer">등록 안내 ↗</a>
    </details>
  </section>;
}
