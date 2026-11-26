'use client';
import React,{useId,useState} from 'react';
import {calculateSimpleGoal,describeGoal,formatGoalRate,type SimpleGoalInputs} from '@/lib/growthKpi';
import {GROWTH_MEASUREMENT,GROWTH_SOURCES} from '@/lib/growthKnowledge';
import {CopyWork} from './CopyWork';
import type {reportGoal} from '@/lib/reportGoal';
type Mode='conversion'|'search';
type Props={targetUrl:string;platform?:'naver-store';goal?:ReturnType<typeof reportGoal>};
type Draft={inputs:SimpleGoalInputs;demo:boolean;period:string};
const empty=():SimpleGoalInputs=>({opportunities:'',completed:'',targetCompleted:''});
const newDraft=():Draft=>({inputs:empty(),demo:false,period:'최근 28일'});
const count=(n:number|null)=>n===null?'미입력':n.toLocaleString('ko-KR')+'회';

export default function GrowthKpiPanel(props:Props) {
 return <GoalCalculator key={JSON.stringify([props.targetUrl,props.platform,props.goal?.label])} {...props}/>;
}
function GoalCalculator({targetUrl,platform,goal}:Props) {
 const store=platform==='naver-store',initialChannel=store?'직접 확인한 스토어 유입':'Google 자연 검색';
 const id=useId();
 const [mode,setMode]=useState<Mode>('conversion');
 const [channels,setChannels]=useState({conversion:initialChannel,search:initialChannel});
 const [drafts,setDrafts]=useState<Record<string,Draft>>({});
 const channel=channels[mode],scope=mode+'|'+channel;
 const {inputs,demo,period}=drafts[scope]||newDraft();
 function edit(change:(draft:Draft)=>Draft){
   setDrafts(previous=>({...previous,[scope]:change(previous[scope]||newDraft())}));
 }
 const result=calculateSimpleGoal(inputs),search=mode==='search',unit=search?'검색 노출':'방문',done=search?'검색 클릭':goal?.label||'문의·구매 완료';
 const rateLabel=formatGoalRate(result.rate),detail=describeGoal(result,unit,done);
 const hasInputs=Object.values(inputs).some(value=>value.trim());
 const hasErrors=Object.keys(result.errors).length>0;
 const requiredLabel=result.required===null?'미산출':count(result.required);
 const labels={opportunities:search?'현재 검색 노출수':'현재 방문 횟수',completed:search?'현재 검색 클릭수':goal?`‘${goal.label}’까지 이어진 방문 횟수`:'문의·구매가 완료된 방문 횟수',targetCompleted:search?'원하는 검색 클릭수':goal?`목표 ‘${goal.label}’ 방문 횟수`:'목표로 하는 완료 방문 횟수'};
 const helps={opportunities:search?'검색 결과에 페이지가 표시된 횟수':store?'같은 집계 기준의 방문 횟수를 직접 입력하세요.':'GA4의 세션 수를 입력하세요.',completed:search?'위 노출과 같은 기간의 클릭수':'같은 방문에서 같은 행동이 여러 번 완료되어도 1회로 셉니다.',targetCompleted:'같은 길이의 기간에 달성하고 싶은 목표'};
 function update(key:keyof SimpleGoalInputs,value:string){edit(draft=>({...draft,inputs:{...draft.inputs,[key]:value}}));}
 const copyText=[(demo?'가상 예시':'직접 입력')+' · '+done+' 목표 계산',targetUrl,channel+' · '+(period.trim()||'기간 미입력'),
   '현재 '+unit+' '+count(result.values.opportunities)+' 중 '+done+' '+count(result.values.completed),
   '현재 비율 '+rateLabel,'목표 '+done+' '+count(result.values.targetCompleted),'필요 '+unit+' '+requiredLabel,detail,
   '입력한 기간과 같은 길이의 기간에 현재 비율이 유지된다고 가정합니다.'].join('\n');
 return <section id={store?undefined:"report-simple-kpi"} className="report-card report-growth-kpi" aria-label="간단 목표 계산기">
  <div className="report-card-heading"><p className="report-eyebrow">목표 계산</p><h3>목표를 이루려면 방문이 얼마나 필요할까요?</h3><p className="report-note">현재 수치 2개와 목표 1개만 입력하세요. 지금의 완료 비율이 그대로 유지된다는 가정으로 계산합니다.</p></div>
  <div className="work-tabs simple-kpi-tabs" role="group" aria-label="계산할 목표 선택">{[['conversion',goal?`${goal.label} 목표`:'문의·구매 목표'],['search','검색 클릭 목표']].map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>setMode(key as Mode)}>{label}</button>)}</div>
  <div className="simple-kpi-help"><strong>처음이라면 예시부터 눌러 보세요.</strong><div className="report-example-equation" aria-label="가상 예시 · 현재 비율 유지 가정"><div><small>현재 {search?'클릭률':'완료율'}</small><strong>{search?'3%':'2%'}</strong><small>{search?'10,000 노출 → 300 클릭':'1,000 방문 → 20 완료'}</small></div><div><small>목표 {search?'클릭':'완료'}</small><strong>{search?'450':'30'}회</strong><small>같은 기간 기준</small></div><div><small>필요 {search?'노출':'방문'}</small><strong>{search?'15,000':'1,500'}회</strong><small>현재 비율 유지 시</small></div></div><p className="report-visual-caution">가상 예시 · 사이트 수정의 효과 예측은 아닙니다.</p><button type="button" className="report-secondary-button" onClick={()=>edit(draft=>({...draft,demo:true,inputs:search?{opportunities:'10000',completed:'300',targetCompleted:'450'}:{opportunities:'1000',completed:'20',targetCompleted:'30'}}))}>예시 숫자로 계산해 보기</button></div>
  <div className="growth-kpi-context"><label>어느 유입을 비교하나요?<select value={channel} onChange={e=>{const value=e.target.value;setChannels(previous=>({...previous,[mode]:value}));}}>{store?<><option>직접 확인한 스토어 유입</option><option>직접 확인한 검색 유입</option><option>직접 확인한 광고 유입</option></>:<><option>Google 자연 검색</option><option>네이버 웹 자연 검색</option>{!search&&<><option>전체 유입</option><option>AI 서비스 유입</option></>}</>}</select></label><label>집계 기간<input value={period} maxLength={100} onChange={e=>{const value=e.target.value;edit(draft=>({...draft,period:value}));}} placeholder="예: 수정 전 28일"/></label></div>
  {demo&&<p className="simple-kpi-demo" role="status">예시에서 시작한 계산입니다. 실제 사이트 실적이 아닙니다. 내 수치를 넣으려면 ‘내 수치 입력’을 누르세요.</p>}
  <div className="simple-kpi-fields">{(Object.keys(labels) as (keyof SimpleGoalInputs)[]).map((key,i)=><label htmlFor={`${id}-${key}`} key={key}><span><b>{i+1}</b>{labels[key]}</span><input id={`${id}-${key}`} type="number" inputMode="numeric" min="0" max="1000000000000" step="1" value={inputs[key]} placeholder="숫자 입력" aria-invalid={!!result.errors[key]} aria-describedby={`${id}-${key}-help`} onChange={e=>update(key,e.target.value)}/><small id={`${id}-${key}-help`}>{result.errors[key]||helps[key]}</small></label>)}</div>
  <div className="simple-kpi-result" aria-live="polite" aria-atomic="true">
   {hasInputs?<><h4>{demo?'가상 예시':'입력한 실적'} · {channel}</h4>
    <dl className="goal-summary">
     <div><dt>현재 {search?'클릭률':'완료율'}</dt><dd>{rateLabel}<small>{unit} {count(result.values.opportunities)} 중 {done} {count(result.values.completed)}</small></dd></div>
     <div><dt>목표 {done}</dt><dd>{count(result.values.targetCompleted)}<small>{period.trim()||'기간 미입력'}</small></dd></div>
     <div><dt>필요 {unit}</dt><dd>{requiredLabel}<small>현재 비율 유지 가정</small></dd></div>
    </dl></>:<h4>위의 숫자 3개를 입력하면 결과가 나옵니다.</h4>}
   <p>{detail}</p>
  </div>
  <p className="report-note">같은 기간·채널·완료 기준의 수치를 사용하세요. 입력값은 이 화면에서 목표와 유입별로 보관됩니다.</p>
  <div className="growth-kpi-controls"><button type="button" className="report-secondary-button" onClick={()=>edit(draft=>({...draft,inputs:empty(),demo:false}))}>내 수치 입력 · 비우기</button>
   <CopyWork key={JSON.stringify([scope,period,inputs,demo])} text={copyText} label="계산 내용 복사" disabled={hasErrors||result.values.targetCompleted===null||(result.required===null&&(result.values.opportunities===null||result.values.completed===null))}/>
  </div>
  {store?<div className="smartstore-empty"><strong>판매자센터·광고 보고서에서 직접 확인한 수치를 입력하세요.</strong><p>이 계산기는 스토어 통계와 연동하지 않습니다. 동일한 기간·유입·집계 단위의 수치가 있을 때만 사용하세요. 방문 횟수와 주문 건수처럼 기준이 다른 수치는 섞지 마세요. 해당 수치를 확인할 수 없으면 계산하지 않습니다.</p></div>:<details open className="growth-measurement"><summary>숫자는 어디서 확인하나요?</summary><div>{GROWTH_MEASUREMENT.filter(m=>search?/Search Console|서치어드바이저|검색/.test(m.where):/GA4|애널리틱스/.test(m.where)).map(m=><article key={m.title}><h4>{!search&&goal?goal.label:m.title}</h4><strong>{m.where}</strong><p>{m.metric}</p><p>{!search&&goal?`${goal.check} 집계 기간과 채널을 맞추고, 실제 완료와 연결된 방문만 입력하세요.`:m.note}</p><a href={GROWTH_SOURCES[m.source].url} target="_blank" rel="noopener noreferrer">공식 측정 가이드 ↗</a></article>)}</div></details>}
 </section>;
}
