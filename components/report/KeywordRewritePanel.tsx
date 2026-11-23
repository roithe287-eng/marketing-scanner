"use client";

import React, {useMemo, useState} from 'react';
import {keywordFrequencyScope} from '@/lib/keywordFrequencyPresentation';
import {buildExecutableRewrites, rewriteInstruction, type ExecutableRewrite, type RewriteValues} from '@/lib/keywordExecution';
import {rewriteKinds, type RewriteKind} from '@/lib/keywordRewrite';
import type {MarketingReport} from '@/lib/reportSchema';
import {Guidebook} from './SiteGuidebook';
import {RoleLabel} from './ReportRole';
import RewriteExecutionGuide from './RewriteExecutionGuide';

const kindLabels: Record<RewriteKind, string> = {
  유지: '그대로 유지',
  구체화: '설명 구체화',
  정리: '중복 문장 정리',
  배치: '제목·설명 검토',
  '문맥 검토': '문맥 확인',
};

function RewriteDetails({plan, values, onChange}: {
  plan: ExecutableRewrite;
  values: RewriteValues;
  onChange: (token: string, value: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState('');
  const [fallback, setFallback] = useState(false);
  const {guide, item, reviewOnly} = plan;

  async function copyRewrite() {
    try {
      await navigator.clipboard.writeText(rewriteInstruction(plan, values));
      setFallback(false);
      setMessage('안내를 복사했습니다.');
    } catch {
      setFallback(true);
      setMessage('아래 내용을 선택해 복사하세요.');
    }
  }

  return <details className="keyword-rewrite-details" onToggle={event => {
    if (event.currentTarget.open) setMounted(true);
  }}>
    <summary><span className="sr-only">{item.keyword} </span>{reviewOnly ? '원문 근거' : '원문·작성 예시'}</summary>
    <div className="keyword-rewrite-detail-body">
      {reviewOnly ? <div>
        <p className="report-note">{guide.coverage}</p>
        {guide.evidence.length ? guide.evidence.map(evidence => <div key={evidence.label}>
          <strong>{evidence.label}</strong>
          <blockquote className="report-answer">{evidence.text}</blockquote>
        </div>) : <p className="report-empty">저장된 발췌에서 이 표현을 찾지 못했습니다. 원문에서 어떤 뜻으로 쓰였는지 확인하세요.</p>}
      </div> : <>
        <div className="report-rewrite-template">
          <RoleLabel role="proposal" label="작성 예시 · 대괄호에 실제 정보 입력"/>
          <p>{plan.template.split(/(\[[^\]\n]+\])/g).map((part, index) =>
            part.startsWith('[') && part.endsWith(']') ? <mark key={index}>{part}</mark> : part
          )}</p>
          <p className="report-rewrite-placement"><strong>수정 위치</strong> {plan.placement}</p>
        </div>
        {mounted && <>
          <RewriteExecutionGuide plan={plan} values={values} onChange={onChange}/>
          <Guidebook compact title={`반복 표현 · ${item.keyword}`} keyword={item.keyword} topic={plan.kind === '배치' ? 'title' : 'content'}/>
        </>}
      </>}
      <div className="report-copy">
        <button type="button" className="report-secondary-button" onClick={copyRewrite} aria-label={`${item.keyword} ${reviewOnly ? '안내' : '수정안'} 복사`}>{reviewOnly ? '안내 복사' : '수정안 복사'}</button>
        <span role="status">{message}</span>
      </div>
      {fallback && <div className="report-copy-fallback">
        <textarea readOnly rows={8} aria-label={`${item.keyword} 복사용 안내`} value={rewriteInstruction(plan, values)} onFocus={event => event.currentTarget.select()}/>
      </div>}
    </div>
  </details>;
}

function RewriteRow({plan, values, onChange}: {
  plan: ExecutableRewrite;
  values: RewriteValues;
  onChange: (token: string, value: string) => void;
}) {
  const {item, kind, reviewOnly} = plan;
  const checkPlacement = kind === '배치';
  const target = item.inTitle ? '검색 설명' : item.inMetaDescription ? '페이지 제목' : '페이지 제목이나 검색 설명';
  const evidence = checkPlacement
    ? `수집한 제목에 ${item.inTitle ? '있음' : '없음'} · 검색 설명에 ${item.inMetaDescription ? '있음' : '없음'}`
    : plan.reason;
  const action = checkPlacement
    ? `“${item.keyword}”가 대표 상품이나 서비스를 가리킨다면 ${target}에 자연스럽게 넣으세요. 같은 뜻의 문구가 있다면 유지하세요.`
    : plan.action;

  return <li className="keyword-rewrite-row">
    <div className="keyword-rewrite-cells">
      <div>
        <h5 className="keyword-rewrite-term">{item.keyword}</h5>
        <p className="keyword-rewrite-frequency">
          <strong>{item.count.toLocaleString('ko-KR')}회</strong><span> · {item.density}%</span>
        </p>
      </div>
      <div>
        <strong className="keyword-rewrite-cell-label">확인된 내용</strong>
        <p>{evidence}</p>
      </div>
      <div>
        <strong className="keyword-rewrite-direction">{reviewOnly ? '의미 확인' : kindLabels[kind]}</strong>
        <p>{action}</p>
      </div>
    </div>
    <RewriteDetails plan={plan} values={values} onChange={onChange}/>
  </li>;
}

export default function KeywordRewritePanel({report, compact = false}: {report: MarketingReport; compact?: boolean}) {
  const plans = useMemo(() => buildExecutableRewrites(report), [report]);
  const [drafts, setDrafts] = useState<Record<string, RewriteValues>>({});
  const [query, setQuery] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [tab, setTab] = useState<'singles' | 'phrases'>('singles');
  const [filter, setFilter] = useState<RewriteKind | ''>('');
  const all = plans[tab];
  const search = query.trim().toLowerCase();
  const shown = all
    .filter(plan => (!filter || plan.kind === filter) && plan.item.keyword.toLowerCase().includes(search))
    .sort((first, second) => second.item.count - first.item.count);

  function clearFilters() {
    setQuery('');
    setFilter('');
    setCopyMessage('');
  }

  async function copyList() {
    try {
      await navigator.clipboard.writeText(shown.map(plan => rewriteInstruction(plan, drafts[plan.id])).join('\n\n────────\n\n'));
      setCopyMessage(`안내 ${shown.length}개를 복사했습니다.`);
    } catch {
      setCopyMessage('복사하지 못했습니다. 각 항목에서 다시 시도해 주세요.');
    }
  }

  return <section className={compact ? 'report-rewrite keyword-panel-content' : 'report-card report-rewrite'} aria-label="반복 표현 수정 제안">
    <div className={compact ? 'keyword-panel-heading' : 'report-card-heading'}>
      {compact ? <h4>표현별 문장 수정안</h4> : <h3>표현별 문장 수정안</h3>}
      <p className="report-note">등장 횟수가 많은 표현부터 확인할 수 있습니다. 수정 여부는 원문의 뜻과 페이지의 주제를 보고 판단하세요.</p>
      {report.keywordFrequency && <p className="report-note keyword-scope-note">{keywordFrequencyScope(report.keywordFrequency)}</p>}
    </div>

    <div className="report-filter-row keyword-rewrite-tabs" role="group" aria-label="표현 종류">
      <button type="button" aria-pressed={tab === 'singles'} onClick={() => { setTab('singles'); clearFilters(); }}>단어 <span>{plans.singles.length}개</span></button>
      <button type="button" aria-pressed={tab === 'phrases'} onClick={() => { setTab('phrases'); clearFilters(); }}>연속 어구 <span>{plans.phrases.length}개</span></button>
    </div>
    <div className="keyword-rewrite-tools">
      <label>
        <span>표현 찾기</span>
        <input type="search" value={query} onChange={event => { setQuery(event.target.value); setCopyMessage(''); }} placeholder="예: 패키지"/>
      </label>
      <label>
        <span>수정 방향</span>
        <select value={filter} onChange={event => { setFilter(event.target.value as RewriteKind | ''); setCopyMessage(''); }}>
          <option value="">전체</option>
          {rewriteKinds.map(kind => <option key={kind} value={kind}>{kindLabels[kind]} ({all.filter(plan => plan.kind === kind).length})</option>)}
        </select>
      </label>
    </div>

    <div className="keyword-rewrite-list-bar">
      <div>
        <p role="status"><strong>{shown.length}개</strong> 표시 · 등장 횟수순</p>
        {(search || filter) && <button type="button" onClick={clearFilters}>필터 초기화</button>}
      </div>
      <button type="button" className="report-secondary-button" onClick={copyList} disabled={!shown.length}>표시된 안내 복사</button>
    </div>
    <p role="status" className="report-note keyword-rewrite-copy-status">{copyMessage}</p>

    {shown.length ? <div className="keyword-rewrite-list">
      <div className="keyword-rewrite-columns" aria-hidden="true">
        <span>{tab === 'singles' ? '단어' : '연속 어구'}</span>
        <span>확인된 내용</span>
        <span>수정 방향</span>
      </div>
      <ul role="list" aria-label={tab === 'singles' ? '단어별 수정 안내' : '연속 어구별 수정 안내'}>
        {shown.map(plan => <RewriteRow key={plan.id} plan={plan} values={drafts[plan.id] || {}} onChange={(token, value) =>
          setDrafts(previous => ({...previous, [plan.id]: {...previous[plan.id], [token]: value}}))
        }/>)}
      </ul>
    </div> : <p className="report-empty">
      {all.length ? '검색어나 수정 방향에 해당하는 표현이 없습니다.' : '이 보고서에는 검토할 반복 표현이 없습니다.'}
    </p>}
  </section>;
}
