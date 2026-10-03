"use client";
import React,{useState} from 'react';

const zones=[
  {label:'첫 화면',title:'누구에게, 어떤 가치를 제공하나요?',note:'고객 상황과 제공 가치를 한 문장으로 연결하고, 대표 행동 하나를 안내하세요.',template:'[대상 고객]을 위한 [핵심 서비스] · [다음 행동]',shape:'hero'},
  {label:'서비스 본문',title:'실제로 받는 내용이 보여야 합니다.',note:'같은 서비스명을 반복하는 대신 업무 범위·진행 방식·전달물을 나눠 설명하세요.',template:'제공 범위 → 진행 단계 → 완료 시 전달물',shape:'service'},
  {label:'근거 영역',title:'주장 가까이에 확인할 근거를 놓으세요.',note:'실제 확인한 사례·조건·출처를 연결하세요. 검증하지 않은 성과 수치는 넣지 마세요.',template:'핵심 주장 + 확인한 사례·조건 + 출처',shape:'evidence'},
  {label:'FAQ·문의',title:'남은 질문에서 다음 행동으로 이어집니다.',note:'고객이 묻는 비용·범위·절차를 답하고, 문의 후 무엇이 진행되는지 알려 주세요.',template:'고객 질문 → 구체적인 답변 → 문의 후 절차',shape:'faq'},
] as const;
export default function PlacementMap() {
  const [selected,setSelected]=useState(0),zone=zones[selected];
  return <div className="report-placement-map">
    <div className="report-placement-heading"><h4>위치마다 다른 정보를 채워 보세요</h4><p className="report-note">페이지 구성 예시입니다. 영역을 누르면 문구를 배치하는 방법을 볼 수 있습니다.</p></div>
    <div className="report-placement-layout">
      <div className="report-wirepage" role="group" aria-label="문구 적용 위치 선택">
        <div className="report-wirepage-bar" aria-hidden="true"><i/><i/><i/><span/></div>
        {zones.map((item,i)=><button key={item.shape} type="button" className={`report-wirezone report-wirezone-${item.shape}`} aria-pressed={selected===i} onClick={()=>setSelected(i)}><span><b>0{i+1}</b>{item.label}</span><span className="report-wire-lines" aria-hidden="true"><i/><i/><i/></span></button>)}
      </div>
      <div className="report-placement-copy" aria-live="polite"><div key={selected} className="report-guide-enter"><span className="report-pill">0{selected+1} · {zone.label}</span><h5>{zone.title}</h5><p>{zone.note}</p><div className="report-placement-example"><span>구성 예시</span><strong>{zone.template}</strong></div></div></div>
    </div>
  </div>;
}
