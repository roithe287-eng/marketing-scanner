import type {Discoverability, LlmCitationQuestionResult as Row, LlmCitationTest} from './reportSchema';
export const engines=['chatgpt','gemini'] as const;
export const engineNames={chatgpt:'OpenAI',gemini:'Gemini'};
export const observationStates={
  cited:{label:'자사 인용',color:'#06695f',background:'#e5f5f0',symbol:'●'},
  uncited:{label:'미인용',color:'#3564a7',background:'#edf3fc',symbol:'○'},
  unverified:{label:'판정 불가',color:'#986100',background:'#fff5da',symbol:'?'},
  failed:{label:'호출 실패',color:'#9d3446',background:'#fceef1',symbol:'!'},
  unavailable:{label:'미설정',color:'#52627b',background:'#edf0f5',symbol:'—'},
  missing:{label:'관측 없음',color:'#667085',background:'#f2f4f7',symbol:'—'},
  duplicate:{label:'중복 관측',color:'#667085',background:'#f2f4f7',symbol:'≠'},
} as const;
export type ObservationState=keyof typeof observationStates;
export function observationState(row?:Row):ObservationState {
  if (!row) return 'missing';
  if (row.status==='unavailable') return 'unavailable';
  if (row.status==='error'||row.status==='timeout') return 'failed';
  if (row.status!=='ok'||row.searchUsed!==true||row.citationVerified!==true) return 'unverified';
  return row.cited?'cited':'uncited';
}
export function observationCell(rows:Row[]) {
  const state:ObservationState=rows.length>1?'duplicate':observationState(rows[0]);
  const r=rows[0];
  const mentioned=rows.length===1 && (r.status==='ok'||r.status==='unverified') && typeof r.brandMentioned==='boolean' ? r.brandMentioned : null;
  return {state,mentioned,rows};
}
export function buildObservationVisual(citation?:LlmCitationTest|null) {
  if(citation?.measurementVersion!==2)return null;
  const questions=[...new Set(citation.results.map(r=>r.question.trim()))].map((question,i)=>{
    const rows=citation.results.filter(r=>r.question.trim()===question);
    return {id:i+1,question,journey:rows[0].journey||'고객 질문',cells:{chatgpt:observationCell(rows.filter(r=>r.engine==='chatgpt')),gemini:observationCell(rows.filter(r=>r.engine==='gemini'))}};
  });
  const countByPair=new Map<string,number>();
  const pairKey=(r:Row)=>JSON.stringify([r.engine,r.question.trim()]);
  for(const row of citation.results)countByPair.set(pairKey(row),(countByPair.get(pairKey(row))||0)+1);
  const unique=(r:Row)=>countByPair.get(pairKey(r))===1;
  const distributions=engines.map(engine=>{
    const rows=citation.results.filter(r=>r.engine===engine);
    const counts={cited:0,uncited:0,unverified:0,unavailable:0,failed:0};
    for (const r of rows) {const state=unique(r)?observationState(r):'unverified';if(state in counts)counts[state as keyof typeof counts]++;}
    return {engine,total:rows.length,counts};
  });
  const sourceRows=citation.results.filter(r=>unique(r)&&['cited','uncited'].includes(observationState(r)));
  const mentionRows=citation.results.filter(r=>unique(r)&&(r.status==='ok'||r.status==='unverified')&&typeof r.brandMentioned==='boolean');
  const sourceCount=sourceRows.filter(r=>r.cited).length,mentionCount=mentionRows.filter(r=>r.brandMentioned).length;
  return {questions,distributions,total:citation.results.length,sourceTotal:sourceRows.length,sourceCount,mentionTotal:mentionRows.length,mentionCount,
    citationRate:sourceRows.length?Math.round(100*sourceCount/sourceRows.length):null,
    mentionRate:mentionRows.length?Math.round(100*mentionCount/mentionRows.length):null};
}
export const readinessKeys=['seoFoundation','contentStructure','redundancy','geo','structuredData','eeat','localBrand','aiAnswerability'] as const;
export const readinessLabels={pass:'양호',warning:'보완',fail:'취약'};
export const readinessColors={pass:'#087f72',warning:'#986100',fail:'#ad3548'};
export function readinessItems(value?:Discoverability|null) {return value?readinessKeys.map(key=>({key,...value[key]})):[];}
export function percentageChange(before:number|null,after:number|null) {return before===null||after===null?'비교 불가':before===after?'변화 없음':`${after-before>0?'+':''}${after-before}%p`;}
