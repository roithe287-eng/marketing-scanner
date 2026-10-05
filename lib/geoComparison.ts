import type {GeoBaseline, LlmCitationQuestionResult as Row, MarketingReport} from './reportSchema';

export const GEO_COMPARISON_TITLE = 'GEO 이전·현재 비교';
export const GEO_COMPARISON_NOTE = '같은 질문·엔진·요청 설정에서 양쪽 모두 출처를 판정한 관측만 비교합니다. 사이트 수정이 없어도 AI 답변과 검색 결과는 달라질 수 있으며, 모델 이름이 같아도 제공사 내부 버전은 바뀔 수 있습니다. 변화가 수정의 효과임을 뜻하지 않습니다.';
export const comparisonReasons = {
  missing:'한쪽 관측 없음', duplicate:'동일 질문·엔진 중복', failed:'실패 또는 검색·출처 미확인',
  legacy:'이전 측정 조건 기록 없음', target:'타겟 페이지 또는 브랜드 기준 변경',
  model:'요청 모델 변경', request:'요청 설정 변경', cached:'새 측정이 아닌 저장 결과', time:'새로운 측정 시각 확인 불가',
} as const;
type Reason = keyof typeof comparisonReasons;
export type GeoPair = {key:string;question:string;engine:Row['engine'];before?:Row;after?:Row;reason?:Reason;change?:'gained'|'lost'|'kept'|'absent'};
export const changeLabels = {gained:'새로 인용',lost:'이번에 미확인',kept:'인용 유지',absent:'양쪽 모두 미인용'} as const;
export function canonicalPage(value:string):string|null {
  try {const u=new URL(value);if (!/^https?:$/.test(u.protocol)||u.username||u.password) return null;u.hash='';return u.href;} catch {return null;}
}
export function parseReportReference(value:string, origin?:string):string|null {
  const raw=value.trim();if (/^[A-Za-z0-9]{4,12}$/.test(raw)) return raw;
  try {
    const u=new URL(raw);
    if (u.username||u.password||!['https://www.mktscanner.com','https://mktscanner.com',origin].includes(u.origin)) return null;
    return u.pathname.match(/^\/r\/([A-Za-z0-9]{4,12})\/?$/)?.[1] || null;
  } catch {return null;}
}
export function baselineQuestions(baseline:GeoBaseline) {
  if (baseline.citation.measurementVersion!==2) throw new Error('이 보고서에는 재측정할 GEO 관측이 없습니다. 새 진단 결과를 먼저 공유해 주세요.');
  const questions=[...new Map(baseline.citation.results.map(row => [row.question.trim(), {question:row.question.trim(),type:row.questionType,journey:row.journey || '기존 질문'}])).values()];
  if (!questions.length || questions.length>5 || questions.some(q=>q.question.length<5||q.question.length>250||q.journey.length>40)) throw new Error('기준 보고서의 질문 형식을 확인할 수 없습니다. 새 진단 결과를 기준으로 사용해 주세요.');
  return questions;
}
function valid(row:Row) {return row.status==='ok'&&row.searchUsed===true&&row.citationVerified===true;}
export function observationLabel(row?:Row) {
  if (!row) return '관측 없음';
  if (!valid(row)) return row.status==='error'?'측정 실패':row.status==='timeout'?'시간 초과':row.status==='unavailable'?'미설정':'검색·출처 미확인';
  return row.cited?'자사 출처 확인':'자사 출처 미인용';
}
export function comparisonTime(value?:string) {return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' KST' : '시각 기록 없음';}
export function buildGeoComparison(report:MarketingReport) {
  const baseline=report.geoBaseline;if (!baseline) return null;
  const before=baseline.citation,after=report.llmCitationTest;
  const index=(rows:Row[])=>{const map=new Map<string,Row[]>();for (const row of rows) {const key=JSON.stringify([row.engine,row.question.trim()]);map.set(key,[...(map.get(key)||[]),row]);}return map;};
  const oldRows=index(before.results),newRows=index(after?.results||[]);
  const pairs:GeoPair[]=[...new Set([...oldRows.keys(),...newRows.keys()])].map(key=>{
    const a=oldRows.get(key)||[],b=newRows.get(key)||[];
    const row=a[0]||b[0];const pair:GeoPair={key,question:row.question.trim(),engine:row.engine,before:a[0],after:b[0]};
    let reason:Reason|undefined;
    if (a.length>1||b.length>1) reason='duplicate';
    else if (!a[0]||!b[0]||!after) reason='missing';
    else if (!valid(a[0])||!valid(b[0])) reason='failed';
    else if (!['geo-compare-v1','geo-compare-v2'].includes(before.measurementProtocol||'')||before.measurementProtocol!==after.measurementProtocol||!before.targetUrl||!after.targetUrl||!before.brandName||!after.brandName||!a[0].model||!b[0].model||!a[0].requestFingerprint||!b[0].requestFingerprint) reason='legacy';
    else if (!canonicalPage(before.targetUrl)||canonicalPage(before.targetUrl)!==canonicalPage(after.targetUrl)||canonicalPage(baseline.url)!==canonicalPage(report.url)||before.brandName!==after.brandName) reason='target';
    else if (a[0].model!==b[0].model) reason='model';
    else if (a[0].requestFingerprint!==b[0].requestFingerprint) reason='request';
    else if (after.cacheHit!==false) reason='cached';
    else if (!a[0].measuredAt||!b[0].measuredAt||!(Date.parse(b[0].measuredAt)>Date.parse(a[0].measuredAt))) reason='time';
    if (reason) return {...pair,reason};
    return {...pair,change:b[0].cited?(a[0].cited?'kept':'gained'):(a[0].cited?'lost':'absent')};
  });
  const matched=pairs.filter(pair=>!pair.reason);
  const rate=(rows:GeoPair[],side:'before'|'after',key:'cited'|'brandMentioned')=>rows.length?Math.round(100*rows.filter(p=>p[side]?.[key]).length/rows.length):null;
  const mentions=matched.filter(pair=>typeof pair.before?.brandMentioned==='boolean'&&typeof pair.after?.brandMentioned==='boolean');
  return {baseline,current:after,pairs,matched:matched.length,excluded:pairs.length-matched.length,
    beforeRate:rate(matched,'before','cited'),afterRate:rate(matched,'after','cited'),mentionCount:mentions.length,
    beforeMention:rate(mentions,'before','brandMentioned'),afterMention:rate(mentions,'after','brandMentioned'),
    gained:matched.filter(p=>p.change==='gained').length,lost:matched.filter(p=>p.change==='lost').length,kept:matched.filter(p=>p.change==='kept').length};
}
export const comparisonRate = (value:number|null) => value===null?'비교 불가':`${value}%`;
