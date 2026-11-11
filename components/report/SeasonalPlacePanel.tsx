import React from 'react';
import {SEASONAL_TITLE,type SeasonalPlaceReview} from '@/lib/seasonalPlaceReview';
export default function SeasonalPlacePanel({review:r}:{review:SeasonalPlaceReview}){
  return <details className="lp-fold lp-seasonal"><summary><span>{SEASONAL_TITLE}</span><small>{r.profiles.map(p=>p.label).join(' · ')}</small></summary><div className="lp-fold-body">
    <p className="lp-note">{r.scope}</p>
    <div className="lp-season-summary"><div><small>관측한 계절 서비스</small><strong>{r.profiles.map(p=>p.label).join(' · ')}</strong></div><div><small>준비 주제</small><strong>{r.seasons.join(' · ')}</strong><span>실제 영업기간은 별도 확인</span></div></div>
    <h4>지역·목적지 근거</h4>
    {r.destinations.map(d=><div className="lp-evidence" key={d.id}><b>{d.label}</b><p>홈페이지 표현: {d.matchedAs} · 목적지 위치 참고: {d.area}</p><p>{d.excerpt}</p><a href={d.source} target="_blank" rel="noopener noreferrer">목적지 공식 위치 안내 ↗</a></div>)}
    <p>{r.regions.length?'홈페이지에서 확인한 지역·목적지: '+r.regions.map(x=>x.label).join(' · '):'주소·목적지 근거가 부족해 지역 조합을 만들지 않았습니다. 실제 매장 주소와 서비스 지역을 먼저 확인하세요.'}</p>
    <p className="lp-note">리조트의 위치·운영시간·셔틀 정보는 외부 매장의 주소·영업시간·무료 픽업 여부와 다릅니다. 실제 영업 범위 밖의 지역을 업체명이나 대표키워드에 나열하지 마세요.</p>
    <h4>지역과 서비스를 연결한 콘텐츠 표현</h4>
    <div className="lp-term-grid">{r.keywordIdeas.length?r.keywordIdeas.map(k=><article key={k.text}><small>{k.kind}</small><h4>{k.text}</h4><p className="lp-note">{k.basis}</p></article>):<p>지역 또는 실제 서비스 표현이 더 필요합니다. 확인되지 않은 조합은 제안하지 않습니다.</p>}</div>
    <p>고객 질문·페이지 제목·상품 설명에 실제 제공 범위에 맞는 조합만 자연스럽게 활용하세요. 검색량이 높은 키워드나 등록 완료된 키워드라는 뜻은 아닙니다.</p>
    <h4>시즌 연도 확인</h4><p>{r.seasonLabels.length?'홈페이지 표기: '+r.seasonLabels.join(' · '):'시즌 연도 표기를 수집 표본에서 확인하지 못했습니다. 해당 시즌의 기간과 상품을 구분해 안내하세요.'}</p>
    {!!r.oldLabels.length&&<p className="lp-evidence">이전 연도 표기 확인: {r.oldLabels.join(' · ')}. 과거 안내인지 현재 예약 상품인지 원문에서 대조하세요. 이 표기만으로 폐업·시즌 종료를 판단하지 않습니다.</p>}
    {r.profiles.map(p=><article key={p.id} className="lp-season-profile"><h4>{p.label}에서 먼저 채울 내용</h4><p className="lp-evidence">관측 문구: {p.observation.excerpt}</p><div className="lp-field-grid">{p.fields.map((f,i)=><article key={f}><b>{String(i+1).padStart(2,'0')}</b><h4>{f}</h4></article>)}</div><p><b>사진·설명</b> {p.photo}</p>{p.questions.map(q=><p key={q}><b>고객 질문</b> {q}</p>)}</article>)}
    <details className="lp-fold"><summary><span>시즌 운영 정보 대조</span><small>{r.checks.length}개 점검</small></summary><div className="lp-fold-body lp-checks">{r.checks.map(c=><article key={c.key}><header><h4>{c.label}</h4><span>{c.status}</span></header><p className="lp-evidence">{c.excerpt}</p><p>{c.action}</p></article>)}<a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">홈페이지 관측 원문 ↗</a></div></details>
    <ol className="lp-steps">{r.stages.map((s,i)=><li key={s.title}><span>{i+1}</span><div><h4>{s.title}</h4><p>{s.text}</p></div></li>)}</ol>
    <p className="lp-note">아래 ‘네이버 공식 공지 → 우리 업체 실행’에서 영업시간·예약 유형·휴무·재고·새소식의 적용 조건과 관리 방법을 확인하세요.</p>
  </div></details>;
}
