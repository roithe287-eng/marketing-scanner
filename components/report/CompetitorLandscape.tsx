'use client';
import {Guidebook} from './SiteGuidebook';
import {buildSiteGuide,guideInstruction} from '@/lib/siteGuidebook';
import React,{useId,useState,type CSSProperties} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildCompetitorPositioning,POSITION_AXES,POSITION_NOTE,POSITION_CRITERIA,positioningActions,positioningBrief,positionCoordinates,positionDiameter,POSITION_SIZE_NOTE} from '@/lib/competitorPositioning';
import {COMPETITOR_API_NOTE,COMPETITOR_VOLUME_NOTE,COMPETITOR_SOURCES} from '@/lib/competitorResearch';

export default function CompetitorLandscape({report}:{report:MarketingReport}) {
  const [selected,setSelected]=useState('own'),[status,setStatus]=useState(''),[fallback,setFallback]=useState('');const id=useId();
  const model=buildCompetitorPositioning(report);if(!model)return null;
  const {analysis,rows,groups,own,known}=model,research=analysis.research;
  const active=rows.find(r=>r.id===selected)||own,actions=positioningActions(own);
  const choose=(value:string)=>{setSelected(value);setStatus('');setFallback('');};
  async function copy(){const text=positioningBrief(report,own)+'\n\n'+actions.map(a=>guideInstruction(buildSiteGuide(report,{title:a.title,proposal:a.template}))).join('\n\n');try{await navigator.clipboard.writeText(text);setStatus('자사 개선 작업을 복사했습니다.');setFallback('');}catch{setStatus('아래 내용을 직접 복사하세요.');setFallback(text);}}
  return <section className="report-card competitor-landscape" aria-label="검색 메시지 포지셔닝">
    <div className="report-card-heading"><p className="report-eyebrow">SEARCH CONTEXT → MESSAGE → ACTION</p><h3>같은 검색어에서, 고객에게 무엇을 설명하고 있나요?</h3><p className="report-note">검색에서 발견한 후보와 자사의 설명을 비교해 다음 수정 작업을 정합니다.</p></div>
    <div className="position-query"><div><span>이번 비교의 대표 키워드</span><strong>{analysis.searchKeyword||'미저장'}</strong></div><span className="position-tag">검색량 미측정</span></div>
    <p className="position-lead">{COMPETITOR_API_NOTE}</p>
    <ol className="position-selection-flow" aria-label="경쟁사 선정 과정">
      <li><span>01 · 키워드 선정</span><strong>페이지의 주제</strong><p>주력 상품·서비스 표현에서 선택</p></li>
      <li><span>02 · 검색 응답</span><strong>{research?`${research.returnedCount}건`:analysis.filtering?`${analysis.filtering.reviewedCount}건`:'기록 미저장'}</strong><p>네이버 웹문서 API 응답</p></li>
      <li><span>03 · 후보 정리</span><strong>{analysis.filtering?`${analysis.filtering.excluded.length}건 제외`:'상세 기록 미저장'}</strong><p>자사·중복·대형몰·포털 등 제외</p></li>
      <li><span>04 · 비교 후보</span><strong>{analysis.competitors.length}개</strong><p>원문으로 좌표 계산 가능 {known.length}개</p></li>
    </ol>
    <details className="position-method"><summary>이 키워드와 후보를 고른 이유</summary><div>
      <p>{research?.keywordReason||'이전 보고서에는 키워드 선정 근거와 검색 시각이 저장되지 않았습니다. 현재 저장된 키워드와 후보만 비교하며, 새 기준의 선정 기록은 재진단 시 추가됩니다.'}</p><p>{COMPETITOR_VOLUME_NOTE}</p>
      {research&&<><p>검색 시각: {new Date(research.capturedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국시간) · 요청 {research.requestedCount}건 · 시작 위치 {research.apiStart}</p><p>1차 통과 {research.eligibleCount}개 중 {analysis.filtering?.metadataCheckedCount??0}개 페이지 수집 시도 · 수집 성공 {research.successfulPages}개 · 수집 한도로 보류 {research.budgetDeferredCount}개. 성공은 HTTP 응답 기준이며 설명 필드 확보와는 다릅니다. 최종 최대 5개를 관련 표현 확인 여부, API 응답 순서로 정렬합니다.</p>
        {research.attemptedKeywords.length>1&&<p>조회한 키워드: {research.attemptedKeywords.join(' → ')}. 도표는 마지막 키워드 결과만 사용합니다.</p>}
        <h4>입력 페이지에서 확인한 근거</h4>{research.keywordEvidence.map((e,i)=><blockquote key={i}><strong>{e.field} · {e.matched.join(' · ')}</strong><p>{e.text}</p></blockquote>)}
        {!!research.alternatives.length&&<><h4>원문에 있는 다른 비교 키워드 후보</h4><ul>{research.alternatives.map(a=><li key={a.keyword}><strong>{a.keyword}</strong> · {a.fields.join(' / ')}</li>)}</ul><p>대체 후보는 아직 조회하지 않았으며 검색량·경쟁 적합성이 검증된 순위가 아닙니다.</p></>}
      </>}
      <p>대형몰 등은 알려진 도메인 목록과 페이지 역할 규칙으로 제외합니다. 모든 대형 사업자와 같은 회사의 다른 도메인을 자동 식별하는 기능은 아닙니다. 직접 경쟁 관계는 상품·서비스, 지역, 고객층, 판매 방식을 함께 대조하세요.</p>
      {analysis.filtering?.excluded.length?<><h4>제외한 페이지와 이유</h4><ul>{analysis.filtering.excluded.map((c,i)=><li key={`${c.domain}-${i}`}><strong>{c.domain}</strong> · {c.reason}<p>{c.title}</p></li>)}</ul></>:null}
      <div className="position-sources">{COMPETITOR_SOURCES.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>)}</div>
    </div></details>

    <div className="position-map-heading"><p className="report-eyebrow">MESSAGE POSITIONING</p><h4>검색어 연결도 × 선택 정보 범위</h4><p>{POSITION_NOTE}</p></div>
    <div className="position-axis-cards"><article><span>X축 · 오른쪽으로 갈수록</span><h5>검색어와 설명이 잘 연결됩니다</h5><p>대표 키워드의 구성 단어가 제목과 설명에 각각 있는지 봅니다. 모든 구성 단어가 한 곳에만 있으면 50점, 두 곳 모두에 있으면 100점입니다. 여러 단어는 포함 비율을 계산합니다.</p><strong>제목 포함 비율 × 50 + 설명 포함 비율 × 50</strong></article><article><span>Y축 · 위로 갈수록</span><h5>선택에 필요한 정보 종류가 많습니다</h5><p>가격·조건, 대상·범위, 사례·근거, 진행·지원 중 관련 표현이 있는 종류를 셉니다. 표현의 사실성은 별도 확인합니다.</p><strong>탐지한 정보 종류 수 ÷ 4 × 100</strong></article></div>
    <div className="position-size-guide"><div><span className="report-eyebrow">BUBBLE SIZE</span><h5>클수록 선택 정보 단서가 풍부합니다</h5><p>{POSITION_SIZE_NOTE}</p></div><div className="position-size-samples" aria-label="버블 크기 예시">{[0,4,8].map(n=><div key={n}><i aria-hidden="true" style={{'--bubble-size':`${positionDiameter(n)}px`,'--bubble-mobile-size':`${positionDiameter(n,true)}px`} as CSSProperties}/><span>{n}개{n===8?' 이상':''}</span></div>)}</div></div>
    <figure className="position-figure"><div className="position-y-caption"><strong>Y · {POSITION_AXES.y}</strong><span>상단: 4종류 / 하단: 0종류</span></div>
      <div className="position-chart-grid">
      <div className="position-y-scale" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
      <div className="position-plot" aria-label="검색 메시지 비교 도표">
        <div className="position-quadrants" aria-hidden="true"><div/><div/><div/><div/></div>
        <div className="position-grid-lines" aria-hidden="true"/>
        {groups.map(g=>{const point=positionCoordinates(g.x,g.y);return <button type="button" key={`${g.x}:${g.y}`} className={`position-dot ${g.rows.some(r=>r.own)?'is-own':''} ${g.rows.some(r=>r.id===active.id)?'is-active':''}`} style={{left:`${point.left}%`,top:`${point.top}%`,'--bubble-size':`${positionDiameter(g.signalCount)}px`,'--bubble-mobile-size':`${positionDiameter(g.signalCount,true)}px`} as CSSProperties} aria-pressed={g.rows.some(r=>r.id===active.id)} aria-controls={`${id}-evidence`} aria-label={`${g.rows.map(r=>r.own?'자사':r.name).join(', ')} · X ${g.x} · Y ${g.y} · 선택 정보 단서 ${g.signalCount.toFixed(1)}개${g.rows.length>1?' · 같은 위치, 아래 목록에서 개별 선택':''}`} onClick={()=>choose(g.rows[0].id)}>{g.rows.length>1?`${g.rows.length}곳`:g.rows[0].own?'자사':g.rows[0].id.split('-')[1]}</button>;})}
        {!groups.length&&<p className="position-empty">두 필드를 확보한 사이트가 없어<br/>좌표를 표시하지 않습니다.</p>}
      </div>
      <div className="position-x-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
      </div><div className="position-x-caption"><strong>X · {POSITION_AXES.x}</strong><span>오른쪽: 구성 단어가 더 많이 포함됨</span></div>
      <div className="position-quadrant-key" aria-label="도표의 영역 안내"><span>왼쪽 위 · 검색어 연결 검토</span><span>오른쪽 위 · 연결·정보 함께 탐지</span><span>왼쪽 아래 · 주제·정보 함께 검토</span><span>오른쪽 아래 · 선택 정보 보완 검토</span></div>
      <figcaption>버블 또는 업체를 선택해 위치와 크기의 근거를 확인하세요. 0·100도 도표 안쪽에 여백을 두어 배치합니다. 같은 좌표는 묶고 크기는 해당 업체들의 평균 단서 수를 사용합니다. 50은 안내선이며 합격 기준·업종 평균이 아닙니다.</figcaption>
    </figure>
    <div className="position-site-list" role="group" aria-label="포지셔닝 근거를 볼 사이트 선택">{rows.map((r,i)=><button type="button" key={r.id} aria-pressed={active.id===r.id} aria-controls={`${id}-evidence`} onClick={()=>choose(r.id)}><span className={r.own?'is-own':''}>{r.own?'자사':i}</span><strong>{r.name}</strong><small>{r.x===null?'판정 보류':`X ${r.x} · Y ${r.y} · 단서 ${r.signalCount}`}</small></button>)}</div>
    <article id={`${id}-evidence`} className="position-evidence" aria-live="polite"><div className="position-evidence-heading"><div><span>{active.own?'자사 원문 확인':'비교 후보 원문 확인'}</span><h4>{active.name}</h4></div><strong>{active.x===null?'판정 보류':`X ${active.x} / Y ${active.y}`}</strong></div>
      <p>{active.x===null?active.reason:`제목 ${active.termFields[0].matched.length}/${active.terms.length}개 · 설명 ${active.termFields[1].matched.length}/${active.terms.length}개 연결 · 선택 정보 ${active.checks.filter(c=>c.found).length}/4종류 · 버블 단서 ${active.signalCount}/8개`}</p>
      {active.searchRank&&<p>네이버 웹문서 API 응답의 {active.searchRank}번째 항목 · 비교 번호와 별개</p>}
      <div className="position-terms"><strong>X축에 사용한 구성 단어 · 제목/설명 중 한 곳 이상</strong>{active.terms.map(t=><span key={t} data-found={active.matched.includes(t)}>{active.x===null?'—':active.matched.includes(t)?'확인':'미탐지'} · {t}</span>)}</div>
      <div className="position-checks">{active.checks.map(c=><div key={c.id}><strong>{c.label}</strong><span>{active.x===null?'판정 보류':c.found?`탐지 · ${c.matched}`:'미탐지'}</span><p>{active.x!==null&&c.found?`크기 반영 ${c.signalCount}/2개 · 탐지 표현: ${c.signals.join(' · ')}`:'서비스 부재를 뜻하지 않습니다.'}</p></div>)}</div>
      <details className="position-method"><summary>계산에 사용한 원문 전체 보기</summary><div><strong>페이지 제목</strong><p>{active.title||'저장된 값 없음'}</p><strong>페이지 설명</strong><p>{active.description||'저장된 값 없음'}</p><p>{active.sourceLabel}. 구버전 후보는 메타 설명과 OG 설명의 대체 여부가 기록되지 않았습니다. 엄밀한 같은 시점 비교는 재진단하세요.</p>{active.url&&<a href={active.url} target="_blank" rel="noopener noreferrer">해당 페이지 확인</a>}</div></details>
    </article>
    <details className="position-method"><summary>좌표 해석과 측정 한계 자세히 보기</summary><div><p>X축은 제목·설명 각각의 구성 단어 포함 비율을 50:50으로 합칩니다. 공백·대소문자를 보정하며 반복 횟수는 반영하지 않습니다. 동의어, 검색 의도, 실제 순위 결정 요소를 모두 평가하지 않습니다. Y축은 다음 표현 종류를 각 25점으로 셉니다.</p><ul>{POSITION_CRITERIA.map(c=><li key={c.id}><strong>{c.label}</strong> · {c.action}</li>)}</ul><p>{POSITION_SIZE_NOTE} 서로 다른 숫자·표현도 같은 종류에서는 최대 2개까지만 반영합니다. 도형의 최소 크기는 선택 편의를 위한 것이며 단서 0개도 작은 버블로 표시합니다.</p><p>두 축의 수치는 내부 표현 탐지 지수이며 백분위나 성과 확률이 아닙니다. 오른쪽 위라고 매출·SEO 성과가 더 좋은 것은 아닙니다. 빈 공간도 시장의 미충족 수요를 뜻하지 않습니다. 실제 검색어·고객 질문·전환 데이터를 함께 확인하세요.</p><p>제목과 설명 두 필드가 모두 있어야 표시합니다. 수집 실패·정보 부족을 0점이나 중앙값으로 대체하지 않습니다. 본문·이미지·실제 가격·품질은 이 좌표의 평가 범위가 아닙니다.</p></div></details>
    <div className="position-actions"><p className="report-eyebrow">NEXT EDIT FOR YOUR PAGE</p><h4>자사에서 바로 검토할 작업</h4><p>점수를 올리기 위해 표현을 채우기보다, 고객이 선택하는 데 필요한 실제 정보를 보완하세요.</p>{actions.map((a,i)=><article key={a.title}><span className="position-step">0{i+1}</span><div><h5>{a.title}</h5><p><strong>근거</strong> {a.evidence}</p><p><strong>실행</strong> {a.action}</p><div className="position-template"><strong>TO-BE 작성 틀 · 사실 확인 후 사용</strong><p>{a.template}</p></div><Guidebook title={a.title} proposal={a.template}/><p><strong>확인할 KPI</strong> {a.metric}. 변화는 별도 측정하며 이 도표로 상승률을 추정하지 않습니다.</p></div></article>)}<button type="button" className="report-secondary-button" onClick={copy}>자사 개선 작업 복사</button><span role="status">{status}</span>{fallback&&<label className="growth-copy-fallback">직접 복사할 작업 지시서<textarea readOnly value={fallback} rows={10}/></label>}</div>
  </section>;
}
