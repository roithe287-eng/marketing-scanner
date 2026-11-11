import {z} from 'zod';
import type {NonCommercePlaybook} from './nonCommercePlaybook';
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
  const specs=[
    {title:'핵심 답변과 적용 범위',question:`${book.label}는 누구에게 어떤 판단을 도와주나요?`,placement:'주제별 상세 페이지 첫 설명 문단',fields:['대상과 목적','실제 제공·적용 범위','제외 조건'],match:/대상|위한|제공|범위|포함|주제|업무|과정/,action:'질문에 대한 직접 답변을 먼저 쓰고 적용 대상과 예외를 이어 설명하세요. 회사 연혁·홍보 문구만으로 답변을 대신하지 않습니다.',draft:`[실제 안내 주제]는 [대상과 목적]을 위한 내용입니다. [원문으로 확인한 제공·적용 범위]를 안내하며 [제외 조건]에서는 별도 확인이 필요합니다.`},
    {title:'이용·확인 절차',question:`어떤 순서로 확인하고 ${book.outcome}까지 진행하나요?`,placement:'상세 본문 중간의 번호 목록 · 다음 행동 안내 앞',fields:['실제 진행 단계','이용자 준비·담당 역할','단계별 완료 기준'],match:/절차|단계|진행|신청|접수|예약|이용|확인/,action:`${book.stages.join(' → ')}을 실제 운영과 대조할 초안으로 사용하세요. 클릭·접수·확정·이용을 서로 다른 단계로 설명합니다.`,draft:'[실제 첫 단계] → [중간 단계] → [완료 단계]로 진행합니다. 각 단계에서 [이용자 준비사항]과 [담당 주체]를 확인하고, [실제 완료 기준]으로 다음 단계 진입을 안내합니다.'},
    {title:'준비 체크리스트',question:`이용자가 미리 정리할 ${book.preparation.join('·')}은 무엇인가요?`,placement:'절차 아래 체크리스트 · 신청/이용 안내 옆',fields:book.preparation,match:/준비|대상|조건|필수|일정|자료|서류|선수|환경/,action:'공개 안내로 해결할 질문과 개별 확인이 필요한 질문을 나누세요. 필요한 자료의 종류·확인 시점을 설명하고 공개 페이지·광고 추적에 개인의 상세 정보를 넣지 않습니다.',draft:`사전에 ${book.preparation.map(x=>`${x}: [실제 확인할 내용]`).join(' / ')}를 정리해 주세요. [적용 대상·확인일] 기준이며 개별 조건은 [담당 확인 경로]에서 안내합니다.`},
    {title:'선택 기준·근거·예외',question:`무엇을 근거로 비교하고 최신 조건을 확인하나요?`,placement:'비교표·근거 링크·작성/수정일 영역',fields:['같은 조건의 비교 기준','확인 가능한 원자료','예외·변경 안내'],match:/담당|경력|원문|공고|출처|사례|조건|제외|변경|약관|수정/,action:`${book.proof}를 본문과 연결하세요. 타사의 광고 문구나 고객 후기만으로 우위를 확정하지 말고 작성자·확인일·조건을 붙입니다.`,draft:'[동일한 적용 상황]에서 [비교 기준]을 확인하세요. [원자료 링크·작성 주체·확인일]을 근거로 안내하며 [예외와 변경 시 확인 경로]를 함께 제공합니다.'},
  ];
  return NonCommerceBriefingSchema.parse({basis:'editorial-proposal',observation:'not-measured',notice:'업종과 자사 원문에 맞춘 네이버 검색·AI 답변용 콘텐츠 구성 제안입니다. 해당 업체의 AI 브리핑 노출·인용·순위나 질문별 실제 화면은 관측하지 않았습니다. 원문 근거와 작성 초안을 구분하며 대괄호는 게시 전에 운영자가 확인해 채워야 합니다.',
    blocks:specs.map(({match,...spec})=>({...spec,evidence:sources.filter(s=>match.test(s.text)).slice(0,3)})),
    channels:[
      {title:'홈페이지 원문',role:'운영 조건과 사실 확인의 기준 문서',deliverable:`${book.assets.join('·')}와 적용 조건, 담당·수정일을 연결한 상세 문서를 만듭니다. 핵심 설명은 본문 텍스트로 제공합니다.`},
      {title:'네이버 블로그·콘텐츠',role:'실제 고객 질문을 설명하고 관련 원문으로 안내',deliverable:`${book.preparation.join('·')} 중 하나를 한 글에서 다룹니다. 운영 경험과 실제 확인 자료를 더하고 같은 문서를 반복 복제하지 않습니다. 운영 채널이 있을 때 활용하세요.`},
      {title:'사진·영상·표',role:'과정과 조건을 이해하는 보조 자료',deliverable:`${book.assets.join('·')}를 권한이 있는 자료로 보여줍니다. 핵심 조건은 캡션과 본문에도 쓰고, 사진만으로 성과·자격을 주장하지 않습니다.`},
    ],
    verification:[
      {title:'원문 완성·검수',action:'담당자가 적용 대상·예외·근거·갱신일과 연결 경로를 확인합니다.',metric:'주요 질문별 검수 완료 문서 수'},
      {title:'수집·검색 표시 확인',action:'수정 URL의 공개 접근·본문 텍스트·제목·설명·색인 상태를 확인합니다. 수집 허용은 노출 보장이 아닙니다.',metric:'점검한 URL과 확인 시점·관측 상태'},
      {title:'AI 브리핑 실제 관측',action:'같은 질문을 정해 검색 시점·환경·답변·출처 URL을 기록합니다. 브리핑 미생성과 자사 미인용을 별도 상태로 남깁니다.',metric:'브리핑 생성 횟수·자사 출처 확인 횟수·관측 분모'},
      {title:'이용 행동 확인',action:`원문 방문 이후 ${book.outcome}과의 연결을 실제 운영 자료로 검토합니다. 외부 도메인의 미측정 행동은 미확인으로 남깁니다.`,metric:'유입 경로별 확인 가능한 후속 행동 · 성과 수치 미측정'},
    ],references:[{label:'네이버 콘텐츠 작성 권장 사항',url:'https://searchadvisor.naver.com/guide/content-basic'},{label:'네이버 AI 브리핑 서비스 설명',url:'https://www.navercorp.com/service/search'}],
  });
}
