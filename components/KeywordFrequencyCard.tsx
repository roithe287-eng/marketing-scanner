"use client";
import {useId,useState} from 'react';
import type {KeywordFrequency,KeywordFreqItem} from '@/lib/reportSchema';
import {keywordDensityNote,keywordFrequencyScope} from '@/lib/keywordFrequencyPresentation';

function Included({on}:{on:boolean}) {
  return <span className="keyword-included" data-included={on}><b aria-hidden="true">{on?'✓':'−'}</b>{on?'포함':'미포함'}</span>;
}
function FrequencyTable({items,caption}:{items:KeywordFreqItem[];caption:string}) {
  if(!items.length)return <p className="report-empty">집계 범위에서 두 번 이상 반복된 표현이 없습니다. 전체 사이트에 반복이 없다는 뜻은 아닙니다.</p>;
  return <table className="keyword-table">
    <caption>{caption} · 최대 30개 표시 · 막대 전체 길이 = 비중 100%</caption>
    <thead><tr><th scope="col">순서</th><th scope="col">표현 · 비중</th><th scope="col">등장</th><th scope="col">검색 제목</th><th scope="col">메타 설명</th></tr></thead>
    <tbody>{items.map((item,i)=><tr key={item.keyword}>
      <td className="keyword-rank">{i+1}</td>
      <th scope="row" className="keyword-expression"><strong>{item.keyword}</strong><div className="keyword-density"><span className="keyword-meter" aria-hidden="true"><i style={{width:`${Math.max(0,Math.min(100,item.density))}%`}}/></span><span>{item.density.toFixed(2)}%</span></div></th>
      <td className="keyword-count"><span className="keyword-cell-label" aria-hidden="true">등장 횟수</span><strong>{item.count.toLocaleString()}회</strong></td>
      <td><span className="keyword-cell-label" aria-hidden="true">검색 제목</span><Included on={item.inTitle}/></td>
      <td><span className="keyword-cell-label" aria-hidden="true">메타 설명</span><Included on={item.inMetaDescription}/></td>
    </tr>)}</tbody>
  </table>;
}
export default function KeywordFrequencyCard({frequency}:{frequency?:KeywordFrequency|null}) {
  const [tab,setTab]=useState<'singles'|'phrases'>('singles'),id=useId();
  if(!frequency)return null;
  const phrase=tab==='phrases';
  return <section className="jm-card keyword-frequency" aria-labelledby={`${id}-title`}>
    <header><p className="report-eyebrow">CONTENT SIGNALS</p><h3 id={`${id}-title`}>키워드 분포 리포트</h3><p>{keywordFrequencyScope(frequency)}</p></header>
    <dl className="keyword-stats">{[[frequency.totalTokens,'집계한 단어 수'],[frequency.uniqueSingles,'서로 다른 단어'],[frequency.uniquePhrases,'서로 다른 연속어구']].map(([value,label])=><div key={label}><dt>{label}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl>
    <div className="keyword-controls" role="group" aria-label="빈도 집계 단위"><button type="button" aria-pressed={!phrase} aria-controls={`${id}-results`} onClick={()=>setTab('singles')}>단어 단위</button><button type="button" aria-pressed={phrase} aria-controls={`${id}-results`} onClick={()=>setTab('phrases')}>연속어구 단위</button></div>
    <p className="keyword-method">{keywordDensityNote(frequency,phrase)}</p>
    <div id={`${id}-results`}><FrequencyTable items={phrase?frequency.phrases:frequency.singles} caption={`${phrase?'연속어구':'단어'} · 서로 다른 표현 ${phrase?frequency.uniquePhrases:frequency.uniqueSingles}종 중 2회 이상 반복된 표현`}/></div>
    <p className="keyword-footnote">검색 제목·메타 설명의 포함 여부는 같은 단어 형태를 기준으로 확인합니다. 조사·띄어쓰기·동의어 차이를 직접 확인하세요. 비중만으로 과잉 반복이나 검색 성과를 판단하지 않으며, 수정 방향은 ‘반복 표현, 어떻게 바꿀까요?’에서 확인할 수 있습니다.</p>
  </section>;
}
