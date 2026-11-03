'use client';
import {useState} from 'react';
import type {SiteDiagnostics} from '@/lib/siteDiagnosticsSchema';
import ReportItemPanels from './ReportItemPanels';
import EvidenceFlow from './EvidenceFlow';
import {RoleBox} from './ReportRole';

const status={observed:'관측 확인',review:'직접 확인',action:'보완 필요'};
const resourceStatus={observed:'응답 관측',missing:'해당 경로 없음',blocked:'수집 제한',unavailable:'확인 불가',unsupported:'형식·범위 확인'};
export default function SiteDiagnosticsPanel({audit}:{audit?:SiteDiagnostics}){
  const [filter,setFilter]=useState('all');
  if(!audit)return <section className="report-card"><h3>페이지·기술 정밀 점검</h3><p className="report-note">이 보고서는 추가 점검 이전에 생성되었습니다. URL을 다시 진단하면 페이지 중복·의료기관 정보·AI 봇 정책을 확인할 수 있습니다.</p></section>;
  const rows=audit.findings.filter(f=>filter==='all'||filter==='medical'&&f.id.startsWith('medical-')||filter==='metadata'&&/^(?:duplicate|missing|clipped|streamed|canonical|noindex|twitter)/.test(f.id)||filter==='signals'&&/^(?:jquery|analytics|background|sitemap)/.test(f.id));
  return <section className="report-card official-seo site-diagnostics" aria-labelledby="site-diagnostics-title">
    <div className="report-card-heading"><div><p className="report-eyebrow">PAGE · ENTITY · CRAWLER</p><h3 id="site-diagnostics-title">페이지·기술 정밀 점검</h3></div><div className="naver-reviewed"><span>관측 시각</span><time dateTime={audit.observedAt}>{audit.observedAt.replace('T',' ').slice(0,19)} UTC</time></div></div>
    <p className="report-note">{audit.scopeNote}</p>
    <div className="naver-counts"><div data-state="observed"><span>수집한 HTML</span><strong>{audit.pages.length}<small>페이지</small></strong></div><div data-state="action"><span>보완 필요</span><strong>{audit.findings.filter(f=>f.status==='action').length}<small>항목</small></strong></div><div data-state="manual"><span>직접 확인</span><strong>{audit.findings.filter(f=>f.status==='review').length}<small>항목</small></strong></div></div>
    <details className="naver-check" open><summary><strong>수집한 페이지와 검사 범위</strong><span aria-hidden="true">+</span></summary><div className="naver-check-body">
      {audit.pages.length?<div className="site-diagnostics-pages">{audit.pages.map(p=><div key={p.url}><a href={p.url} target="_blank" rel="noopener noreferrer">{p.title||'제목 미감지'} ↗</a><small>{p.url}</small><p>{p.description||'메타 설명 미감지'}</p><small>대표 URL: {p.canonicals.join(' · ')||'미감지'}{p.noindex?' · noindex 선언':''}</small></div>)}</div>:<p>비교 가능한 원문 페이지를 수집하지 못했습니다.</p>}
      {audit.attempts.length>0&&<details><summary>추가 요청 결과 {audit.attempts.length}건</summary>{audit.attempts.map((a,i)=><p className="report-note" key={i}>{resourceStatus[a.status]} · {a.url}<br/>{a.note}</p>)}</details>}
    </div></details>
    <details className="naver-check"><summary><strong>사이트맵·선택 파일</strong><span aria-hidden="true">+</span></summary><div className="naver-check-body">
      <EvidenceFlow items={[{label:'사이트맵',role:'current',content:`${resourceStatus[audit.sitemap.status]} · ${audit.sitemap.url}\nrobots.txt에 동일 URL 선언: ${audit.sitemap.declared?'감지':'미감지'} · URL 표본 ${audit.sitemap.entries}개 · lastmod ${audit.sitemap.lastmod}개 · 날짜 이상 ${audit.sitemap.invalidDates}개 · 미래 날짜 ${audit.sitemap.futureDates}개\n${audit.sitemap.note}${audit.sitemap.sampled?' · 일부 표본만 검사':''}`},{label:'llms.txt · 선택 파일',role:'review',content:`${resourceStatus[audit.llms.status]} · ${audit.llms.url}\n${audit.llms.note}`}]} />
      <p className="report-note">사이트맵이 없어도 작은 사이트는 검색될 수 있습니다. lastmod는 실제 콘텐츠 변경일이며 오래된 날짜 자체를 결함으로 보지 않습니다. llms.txt는 Google 검색의 필수 조건이 아니며 존재 여부를 점수에 반영하지 않습니다.</p>
      <div className="naver-sources"><a href="https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap" target="_blank" rel="noopener noreferrer">Google 사이트맵 기준 ↗</a><a href="https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" target="_blank" rel="noopener noreferrer">Google AI 검색 기준 ↗</a></div>
    </div></details>
    <details className="naver-check"><summary><strong>AI 검색·학습·사용자 요청 정책</strong><span aria-hidden="true">+</span></summary><div className="naver-check-body">
      <p className="report-note">입력 경로에 적용되는 robots.txt 선언입니다. 실제 봇 방문·WAF 통과·색인·인용 성공을 뜻하지 않습니다. 학습 허용은 운영자 선택이며 차단에 감점하지 않습니다. 사용자 요청 봇은 규칙 적용 방식이 다릅니다.</p>
      <div className="site-diagnostics-scroll"><table><caption className="sr-only">봇별 역할과 입력 URL의 robots.txt 정책</caption><thead><tr><th scope="col">봇·역할</th><th scope="col">규칙 선언</th><th scope="col">해석</th></tr></thead><tbody>{audit.crawlers.map(c=><tr key={c.agent}><th scope="row"><a href={c.source} target="_blank" rel="noopener noreferrer">{c.agent} ↗</a><small>{c.role}</small></th><td><strong>{c.status==='allowed'?'차단 규칙 없음':c.status==='blocked'?'차단 규칙 감지':'미확인'}</strong><small>{c.rule}</small></td><td>{c.note}</td></tr>)}</tbody></table></div>
    </div></details>
    <div className="official-seo-controls"><label>점검 분야<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체 항목</option><option value="metadata">제목·설명·대표 URL</option><option value="medical">의료기관·의료진</option><option value="signals">태그·이미지·기술 신호</option></select></label><span aria-live="polite">{rows.length}개 항목</span></div>
    {rows.length?<ReportItemPanels id="site-diagnostic-checks" label="정밀 점검 결과" items={rows.map(f=>({id:f.id,label:f.title,children:<details className="naver-check" data-state={f.status==='review'?'manual':f.status} open><summary><strong>{f.title}</strong><span className="naver-badge">{status[f.status]}</span><span aria-hidden="true">+</span></summary><div className="naver-check-body"><EvidenceFlow items={[{label:'확인 근거',role:'current',content:f.evidence}]}/><RoleBox role="proposal" label="실행·확인 방법"><p>{f.action}</p></RoleBox><div className="naver-sources">{f.urls.map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">관측 페이지 ↗</a>)}{f.id.startsWith('medical-')&&<a href="https://schema.org/MedicalClinic" target="_blank" rel="noopener noreferrer">Schema.org 의료기관 명세 ↗</a>}</div></div></details>}))}/>:<p className="report-empty">이 분야의 관측 항목이 없습니다. 의료기관 유형은 해당 사이트에서 관련 표현·구조화 데이터를 감지했을 때만 점검합니다.</p>}
  </section>;
}
