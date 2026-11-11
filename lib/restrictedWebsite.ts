import {z} from 'zod';

const publicLink=z.string().max(2048).url().refine(value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}});
export const RestrictedWebsiteReportSchema=z.object({
  kind:z.literal('restricted_website'),version:z.literal(1),url:publicLink,observedAt:z.string().datetime(),
  reason:z.enum(['forbidden','rate_limited','robots','not_acceptable']),httpStatus:z.number().int().optional(),
  searchStatus:z.enum(['observed','empty','unavailable']),
  sources:z.array(z.object({url:publicLink,title:z.string().max(300),description:z.string().max(600)})).max(5),
  communityCandidate:z.boolean(),
});
export type RestrictedWebsiteReport=z.infer<typeof RestrictedWebsiteReportSchema>;
export class WebsiteCollectionError extends Error{
  constructor(public reason:RestrictedWebsiteReport['reason'],public httpStatus?:number){super(reason==='robots'?'robots.txt에서 공개 페이지 수집을 제한하고 있습니다.':`사이트가 수집 요청을 제한했습니다. HTTP ${httpStatus||403}`);this.name='WebsiteCollectionError';}
}
export const COMMUNITY_REVIEW_AREAS=[
  {title:'게시판 탐색·질문답변',detail:'주제별 게시판, 검색 결과, 글 상세와 관련 글 사이의 이동을 확인합니다.'},
  {title:'회원가입·첫 참여·구독',detail:'가입 완료, 첫 질문·댓글, 뉴스레터 구독을 각각의 행동으로 점검합니다.'},
  {title:'작성자·작성일·원출처',detail:'회원 게시글과 운영사 콘텐츠를 구분하고, 작성 정보와 답변 근거를 확인합니다.'},
  {title:'교육·광고·대행 의뢰',detail:'커뮤니티 이용과 부가 서비스의 신청·문의 경로를 나누어 확인합니다.'},
];
