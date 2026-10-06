import {buildSiteGuide,guideInstruction,guideTopic} from './siteGuidebook';
import type {MarketingReport} from './reportSchema';
import {buildReportInsights, type ReportInsights} from './reportInsights';
import {growthPageEvidence} from './growthPlan';

export const workOwners=[{id:'direct',label:'직접 수정',note:'콘텐츠·운영 담당이 먼저 검토할 작업'},{id:'developer',label:'개발자 전달',note:'HTML·설정·동작 확인이 필요한 작업'},{id:'verify',label:'추가 확인',note:'근거·계정·사실 확인 후 결정할 작업'}] as const;
export const workZones=[
 {id:'settings',label:'검색·기술 설정',hint:'SEO 입력란 · HTML head · 서버 설정',metric:'수집·색인 상태와 같은 URL·검색어의 노출·CTR',check:'관리 화면과 최종 HTML·응답에서 수정 사항을 확인'},
 {id:'hero',label:'첫 화면',hint:'대표 제목 · 소개 문구',metric:'첫 화면 CTA 클릭 세션 비율 · 문의 완료 세션 비율',check:'대표 제목·실제 제공 범위·다음 행동이 서로 일치하는지 확인'},
 {id:'body',label:'서비스 소개',hint:'제공 범위 · 진행 방식 · FAQ',metric:'해당 콘텐츠 유입 · 다음 행동 클릭 · 유효한 AI 출처 관측',check:'고객 질문에 답하고 조건·범위가 원문과 일치하는지 확인'},
 {id:'proof',label:'후기·근거',hint:'사례 · 담당자 · 확인 가능한 출처',metric:'근거 링크 클릭 · 상담에서 반복되는 확인 질문',check:'성과·후기·자격의 사실과 공개 사용 가능 여부를 담당자가 확인'},
 {id:'action',label:'문의·다음 행동',hint:'CTA 버튼 · 문의 폼 · 완료 화면',metric:'CTA 클릭 세션 비율 → 문의 완료 세션 비율',check:'모바일·PC에서 클릭부터 제출 완료 및 이벤트 수신까지 테스트'},
] as const;
export type WorkZone=typeof workZones[number]['id'];
export type WorkOwner=typeof workOwners[number]['id'];
function zoneFor(title:string):WorkZone {
 if(/\bH1\b|첫 화면|첫인상|헤드라인|대표 제목/i.test(title))return 'hero';
 if(/robots|색인|수집|canonical|구조화|schema|메타|SEO|title|사이트맵|성능|모바일|속도|이미지|alt|스크립트/i.test(title))return 'settings';
 if(/CTA|버튼|전환|문의|폼|구매|신청/i.test(title))return 'action';
 if(/신뢰|후기|사례|근거|출처|자격|인증/i.test(title))return 'proof';
 return 'body';
}
export function buildExecutionPlan(report:MarketingReport,data:ReportInsights=buildReportInsights(report)) {
 const tasks=data.tasks.map((task,index)=>{
   const zone=workZones.find(z=>z.id===zoneFor(task.title))!;
   const h1=/\bH1\b/i.test(task.title);
   const owner:WorkOwner=task.status==='review'||task.group==='AI 답변'?'verify':zone.id==='settings'||h1?'developer':'direct';
   const location=h1?'첫 화면 대표 제목 · 해당 제목의 H1 태그':/모바일|성능|속도/.test(task.title)?'모바일 레이아웃 · 리소스 · 클릭·입력 동작':/이미지|\balt\b/i.test(task.title)?'해당 이미지의 대체 텍스트·파일·로딩 설정':zone.hint;
   const completion=h1?'수집 HTML과 렌더링 결과에서 의도한 대표 제목·H1 반영을 확인':zone.check;
   return {...task,anchor:`execution-task-${index+1}`,zone:zone.id,location,kpi:zone.metric,completion,owner};
 });
 // Only the starting list is deduplicated. Every original evidence row remains in the board and backlog.
 const seen=new Set<string>();
 const first=tasks.filter(t=>{const topic=guideTopic(t.title);const key=t.guideScope==='account'?t.id:topic==='ai'?'answer-content':/\bH1\b/i.test(t.title)?'heading-h1':t.title.replace(/\s+/g,'').toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3);
 return {tasks,first};
}
export type ExecutionPlan=ReturnType<typeof buildExecutionPlan>;
export function groupExecutionTasks(tasks:ExecutionPlan['tasks']){
 const groups=new Map<string,ExecutionPlan['tasks']>();
 for(const task of tasks){
  const key=task.guideScope==='account'?task.id:guideTopic(task.title)==='ai'?`${task.owner}:ai-content`:`${task.owner}:${task.title.replace(/\s+/g,'').toLowerCase()}`;
  const group=groups.get(key)||[];group.push(task);groups.set(key,group);
 }
 return [...groups.values()].map(members=>({primary:members[0],related:members.slice(1),members}));
}
export function executionBrief(report:MarketingReport,tasks:ExecutionPlan['tasks'],owner?:string) {
 return [`마케팅스캐너 · ${owner||'전체'} 작업 지시서`,`대상 URL: ${report.url}`,'담당 구분과 수정 위치는 추천입니다. 원문·실제 설정을 확인한 뒤 적용하세요.',...tasks.map((t,i)=>`\n${i+1}. ${t.title}\n담당: ${workOwners.find(o=>o.id===t.owner)!.label}\n진단 출처: ${t.source}\n위치: ${t.location}\n확인 근거: ${t.evidence}\n실행: ${t.action}\n완료 확인: ${t.completion}\n관찰 KPI: ${t.kpi}\n\n${guideInstruction(buildSiteGuide(report,{title:t.title,scope:t.guideScope,instructions:t.instructions,completion:t.completion,current:t.current,evidence:t.evidence,proposal:t.action}))}`),'\n완료 후 같은 URL을 재진단하고, 실제 사업 성과는 같은 기간·채널·기기 조건으로 별도 비교하세요.'].join('\n');
}
export function buildPageEdits(report:MarketingReport) {
 const p=growthPageEvidence(report),site=report.meta?.siteName||report.meta?.domain||'[브랜드명]';
 return [
   {id:'hero',label:'대표 제목',location:'첫 화면의 대표 제목',before:p?.h1.join('\n')||'',after:report.exampleCopy.heroHeadline,source:p?'수집 HTML의 H1':'H1 원문 미저장',missing:p?'정적 HTML에서 H1을 확인하지 못했습니다. 실제 화면과 렌더링 결과도 확인하세요.':'현재 대표 제목의 수집 원문이 없습니다.',check:'제공 대상·가치가 실제 서비스와 일치하는지 확인하고 대표 제목에 적용하세요.'},
   {id:'title',label:'검색 제목',location:'CMS의 SEO 제목 · HTML title',before:p?.title||'',after:`[실제 서비스·주제] | ${site}`,source:p?'수집 HTML의 title':'title 원문 미저장',missing:'검색 제목 원문을 확인한 후 작성 틀과 대조하세요.',check:'대괄호를 실제 페이지 주제로 채우고 본문과 일치하는지 확인하세요. 검색엔진이 표시 제목을 다시 작성할 수 있습니다.'},
   {id:'description',label:'검색 설명',location:'CMS의 SEO 설명 · meta description',before:p?.description||'',after:'[대상 고객]에게 [실제 제공 범위]를 제공합니다. [확인 가능한 차별점]과 [다음 행동]을 확인하세요.',source:p?'수집 HTML의 meta description':'메타 설명 원문 미저장',missing:'메타 설명 원문이 없습니다. 본문에서 확인한 사실로 작성하세요.',check:'대괄호를 사실로 채우고 가격·기간·성과 등 확인하지 않은 약속은 제거하세요.'},
   {id:'cta',label:'CTA 버튼',location:'핵심 행동 버튼 · 연결된 화면',before:p?.ctaButtons.join('\n')||'',after:report.exampleCopy.ctaText,source:p?'수집된 버튼 문구 · 모든 버튼이 아닐 수 있음':'버튼 문구 원문 미저장',missing:'수집한 버튼 문구가 없습니다. 실제 화면의 주요 버튼을 먼저 확인하세요.',check:'이전 문구가 여러 개면 실제 바꿀 버튼 하나를 정하고, 제안 문구와 클릭 후 행동이 일치하는지 확인하세요.'},
 ];
}
// Word-level LCS; retain every character and bound work for unusually long snapshots.
export function changedText(before:string,after:string):{text:string;changed:boolean}[] {
 if(!after)return [];
 const a=before.match(/\s+|[^\s]+/gu)||[],b=after.match(/\s+|[^\s]+/gu)||[];
 if(a.length*b.length>160_000)return [{text:after,changed:before!==after}];
 const table=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i][j]=a[i]===b[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
 const unchanged=new Set<number>();let i=0,j=0;
 while(i<a.length&&j<b.length){if(a[i]===b[j]){unchanged.add(j);i++;j++;}else if(table[i+1][j]>=table[i][j+1])i++;else j++;}
 return b.map((text,index)=>({text,changed:!unchanged.has(index)&&!!text.trim()}));
}
