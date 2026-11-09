import React from 'react';
import type {CommunityContext} from '@/lib/communityContext';

export default function CommunitySamples({context}:{context:CommunityContext}){
  const labels={home:'입력 메인',board:'게시판 목록',discussion:'글 상세'};
  const missed=context.attempts.filter(a=>a.status!=='observed');
  return <div className="mt-5 rounded-2xl border border-slate-200 p-5" aria-label="커뮤니티 공개 페이지 표본">
    <p className="report-eyebrow">PUBLIC PAGES</p>
    <h4 className="font-bold">공개 페이지 {context.pages.length}개를 구분해 확인했습니다</h4>
    <p className="report-note mt-2">입력 페이지와 보완 표본의 관측값을 각각 보관합니다. 로그인 이후 기능과 사이트 전체 상태는 별도 확인이 필요합니다.</p>
    <ul className="mt-4 space-y-3">{context.pages.map(page=><li key={page.url} className="min-w-0 border-t border-slate-100 pt-3">
      <span className="report-pill">{labels[page.pageType]}</span>
      <a href={page.url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-words text-sm font-semibold underline underline-offset-4">{page.title||page.url} ↗</a>
    </li>)}</ul>
    {missed.length>0&&<p className="report-note mt-4">추가 표본 {missed.length}개는 접근·응답 제한으로 확인하지 못했습니다. 미수집을 기능 부재나 감점으로 처리하지 않습니다.</p>}
    <details className="report-inline-details mt-4"><summary>게시글 구조화 데이터 적용 기준</summary>
      <p className="text-sm leading-7">회원이 작성한 일반 토론 글은 DiscussionForumPosting, 하나의 질문에 사용자가 답변을 추가할 수 있는 상세 페이지는 QAPage를 검토합니다. 운영사 칼럼·교육 안내와 게시판 목록에 같은 유형을 일괄 적용하지 않습니다.</p>
      <a className="text-sm underline" href="https://developers.google.com/search/docs/appearance/structured-data/discussion-forum" target="_blank" rel="noopener noreferrer">Google 토론 게시글 가이드 ↗</a>{' · '}
      <a className="text-sm underline" href="https://developers.google.com/search/docs/appearance/structured-data/qapage" target="_blank" rel="noopener noreferrer">Google 질문답변 가이드 ↗</a>
    </details>
  </div>;
}
