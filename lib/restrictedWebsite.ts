import {z} from 'zod';

const publicLink=z.string().max(2048).url().refine(value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}});
export const RestrictedWebsiteReportSchema=z.object({
  kind:z.literal('restricted_website'),version:z.literal(1),url:publicLink,observedAt:z.string().datetime(),
  reason:z.enum(['forbidden','rate_limited','robots','not_acceptable','browser_check']),httpStatus:z.number().int().optional(),
  searchStatus:z.enum(['observed','empty','unavailable']),
  sources:z.array(z.object({url:publicLink,title:z.string().max(300),description:z.string().max(600)})).max(5),
  communityCandidate:z.boolean(),
});
export type RestrictedWebsiteReport=z.infer<typeof RestrictedWebsiteReportSchema>;
export const COLLECTION_REASONS = {
  forbidden: '사이트 서버의 접근 제한',
  rate_limited: '사이트의 요청 빈도 제한',
  robots: '사이트의 robots.txt 수집 규칙',
  not_acceptable: '사이트가 수집 요청 형식을 허용하지 않는 응답',
  browser_check: '사이트의 브라우저 확인 절차',
} satisfies Record<RestrictedWebsiteReport['reason'], string>;

export class WebsiteCollectionError extends Error{
  constructor(public reason:RestrictedWebsiteReport['reason'],public httpStatus?:number){
    super(`원문 수집 제한 · ${COLLECTION_REASONS[reason]}${httpStatus ? ` (HTTP ${httpStatus})` : ''}`);
    this.name='WebsiteCollectionError';
  }
}
export const COMMUNITY_REVIEW_AREAS=[
  {title:'게시판 탐색·질문답변',detail:'주제별 게시판, 검색 결과, 글 상세와 관련 글 사이의 이동을 확인합니다.'},
  {title:'회원가입·첫 참여·구독',detail:'가입 완료, 첫 질문·댓글, 뉴스레터 구독을 각각의 행동으로 점검합니다.'},
  {title:'작성자·작성일·원출처',detail:'회원 게시글과 운영사 콘텐츠를 구분하고, 작성 정보와 답변 근거를 확인합니다.'},
  {title:'교육·광고·대행 의뢰',detail:'커뮤니티 이용과 부가 서비스의 신청·문의 경로를 나누어 확인합니다.'},
];
