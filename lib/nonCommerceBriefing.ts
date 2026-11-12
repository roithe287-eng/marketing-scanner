import {koreanParticle} from './koreanParticle';
import {z} from 'zod';
import type {NonCommercePlaybook} from './nonCommercePlaybook';
import {editorialFocus,allocateSources,editorialFieldMatcher} from './nonCommerceEditorial';
const text=z.string().min(1).max(1500);
const evidence=z.object({url:z.string().url(),title:z.string().max(300),text:z.string().max(600)});
export type StrategySource=z.infer<typeof evidence>;
export const NonCommerceBriefingSchema=z.object({
  basis:z.literal('editorial-proposal'),observation:z.literal('not-measured'),notice:text,
  blocks:z.array(z.object({title:text,question:text,placement:text,fields:z.array(text).min(2).max(4),evidence:z.array(evidence).max(3),action:text,draft:text})).length(4),
  channels:z.array(z.object({title:text,role:text,deliverable:text})).length(3),
  verification:z.array(z.object({title:text,action:text,metric:text})).length(4),
  references:z.array(z.object({label:text,url:z.string().url()})).max(3),
});
export type NonCommerceBriefing=z.infer<typeof NonCommerceBriefingSchema>;
export function buildNonCommerceBriefing(book:NonCommercePlaybook,sources:StrategySource[]):NonCommerceBriefing{
  const {fields,information}=editorialFocus(book),[scope,proof,terms,operation]=fields;
  const specs=[
    {title:scope,question:`${koreanParticle(scope,'topic')} 어떻게 구분하나요?`,placement:'서비스 상세 제목 아래 첫 설명 문단',fields:[scope,'실제 제공 항목','제외 대상'],match:/대상|제공|범위|주제|업무|메뉴|품목/,action:`첫 문장은 ${scope}에 직접 답해야 합니다. 제공 항목마다 대상과 제외 조건을 붙여야 합니다.`,draft:`[실제 제공 항목]은 [적용 대상]에게 제공합니다. [제외 대상]은 이 안내에 포함되지 않습니다.`},
    {title:terms,question:`${koreanParticle(terms,'topic')} 어디에서 확인하나요?`,placement:'상세 설명 뒤의 조건 비교표',fields:[terms,information?'적용 예외':'포함·별도 항목','확인일'],match:/조건|비교|비용|요금|약관|공고|규격|예외/,action:`${koreanParticle(terms,'object')} 선택안별로 나란히 써야 합니다. 다른 조건이 적용되는 칸은 별도 표시해야 합니다.`,draft:`[선택안 A]: [실제 적용 조건] / [선택안 B]: [다른 적용 조건]. 기준일은 [확인일]이며 상세 내용은 [원자료 URL]에서 확인하세요.`},
    {title:`${book.cta} 전 준비`,question:`${book.preparation.join('·')} 항목은 어떻게 준비하나요?`,placement:`「${book.cta}」 버튼 바로 위`,fields:book.preparation,match:/준비|필수|일정|서류|선수|환경|방문/,action:`준비 항목마다 확인 방법과 필요한 시점을 써야 합니다. 버튼에는 실제 ${information?'이용':'접수'} 경로를 연결해야 합니다.`,draft:book.preparation.map(x=>`${x}: [실제 확인할 내용]`).join(' / ')},
    {title:proof,question:`${proof}의 근거와 변경 내용은 어떻게 확인하나요?`,placement:'주장·사례 바로 옆의 출처 영역',fields:[proof,operation,'작성 주체·갱신일'],match:/담당|경력|원문|출처|인증|의료진|강사|수정|정정/,action:`${koreanParticle(proof,'object')} 뒷받침하는 원문을 주장 옆에 연결해야 합니다. 변경된 조건은 적용일과 함께 표시해야 합니다.`,draft:`[원자료 제목·URL] / [작성 주체·확인일]. 변경 내용: [기존 조건 → 현재 조건·적용일].`},
  ];
  const evidenceByBlock=allocateSources(sources,specs.map((s,i)=>book.local?editorialFieldMatcher(i===2?book.preparation.join('·'):s.fields[0],s.match):s.match));
  return NonCommerceBriefingSchema.parse({basis:'editorial-proposal',observation:'not-measured',notice:'작성 제안 · 대괄호는 실제 운영 자료로 채워야 합니다. 검색·AI 노출은 게시 후 실제 화면에서 별도로 확인합니다.',
    blocks:specs.map(({match,...spec},i)=>({...spec,evidence:evidenceByBlock[i]})),
    channels:[
      {title:'홈페이지 원문',role:'운영 조건과 사실 확인의 기준 문서',deliverable:`${koreanParticle(scope,'object')} 설명하는 기준 문서를 게시하고 각 조건의 원자료를 연결해야 합니다.`},
      {title:'네이버 블로그·콘텐츠',role:'실제 고객 질문을 설명하고 관련 원문으로 안내',deliverable:`${terms} 관련 질문 한 가지를 실제 예시로 설명하고 홈페이지의 조건표로 연결해야 합니다.`},
      {title:'사진·영상·표',role:'과정과 조건을 이해하는 보조 자료',deliverable:`${koreanParticle(proof,'object')} 설명하는 사진·표를 골라 원문 해당 문단 옆에 배치하고 캡션을 써야 합니다.`},
    ],
    verification:[
      {title:'원문 완성·검수',action:'담당자가 적용 대상·예외·근거·갱신일과 연결 경로를 확인합니다.',metric:'주요 질문별 검수 완료 문서 수'},
      {title:'수집·검색 표시 확인',action:'수정 URL의 공개 접근·본문 텍스트·제목·설명·색인 상태를 확인합니다. 수집 허용은 노출 보장이 아닙니다.',metric:'점검한 URL과 확인 시점·관측 상태'},
      {title:'AI 브리핑 실제 관측',action:'같은 질문을 정해 검색 시점·환경·답변·출처 URL을 기록합니다. 브리핑 미생성과 자사 미인용을 별도 상태로 남깁니다.',metric:'브리핑 생성 횟수·자사 출처 확인 횟수·관측 분모'},
      {title:'이용 행동 확인',action:`원문 방문 이후 ${book.outcome} 단계와의 연결을 실제 운영 자료로 검토합니다. 외부 도메인의 미측정 행동은 미확인으로 남깁니다.`,metric:'유입 경로별 확인 가능한 후속 행동 · 성과 수치 미측정'},
    ],references:[{label:'네이버 콘텐츠 작성 권장 사항',url:'https://searchadvisor.naver.com/guide/content-basic'},{label:'네이버 AI 브리핑 서비스 설명',url:'https://www.navercorp.com/service/search'}],
  });
}
