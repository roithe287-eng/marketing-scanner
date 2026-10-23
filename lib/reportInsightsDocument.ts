import {buildExecutableRewrites,rewriteInstruction} from './keywordExecution';
import {KEYWORD_REWRITE_NOTE} from './keywordRewrite';
import {diagnosisScores} from './diagnosisVisuals';
import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {buildReportInsights,contentBrief,insightNotes,sourceReferenceGuide} from './reportInsights';
export function buildInsightsDocument(report:MarketingReport):ReportBlock[] {
  const d=buildReportInsights(report),blocks:ReportBlock[]=[];
  const add=(kind:ReportBlock['kind'],text:string,href?:string)=>blocks.push({kind,text,...(href?{href}:{})});
  add('heading','8개 영역별 검토 가이드');
  if(report.evidenceReview)report.evidenceReview.axes.forEach(a=>{add('subheading',`${a.label} · ${a.status==='unmeasured'?'미측정':'원문 관측·검토'}`);add('body',a.evidence);add('body',a.nextStep);});
  else diagnosisScores(report.diagnosis).forEach(s=>{add('subheading',`${s.label} · ${s.score}점`);add('body',s.action);add('body',`완료 확인: ${s.check}`);});
  add('heading','추가 진단 · 확인 범위와 전환 준비도');
  d.coverage.forEach(c=>add('body',`${c.label}: ${c.value} · ${c.state} · ${c.detail}`));add('body',insightNotes.stages);
  if(!report.evidenceReview)d.stages.forEach((s,i)=>add('body',`${i+1}. ${s.label}: ${s.score}/100 · ${s.action}`));
  add('heading','질문과 답변 페이지 지도');add('body',insightNotes.questions);
  if(!d.questions.length)add('body','새 형식의 질문 관측이 없어 페이지 연결을 판정하지 않았습니다.');
  d.questions.forEach(q=>{add('subheading',q.question);add('body',`${q.kind} · 정상 관측 ${q.observations}건 · ${q.evidence}`);if(q.target)add('body',q.target,q.target);add('body',contentBrief(q.question,q.target));});
  add('heading','브랜드 답변 검토함');add('body',insightNotes.reviews);add('body',`규칙에 해당하는 대조 대상: ${d.reviewSummary.verified?d.reviews.length+'건':'미확인'}`);
  add('body',d.reviewExplanation);
  add('body',`저장 답변 ${d.reviewSummary.total}건 · 출처 확인 완료 ${d.reviewSummary.verified}건 · 검색·출처 확인 미완료 ${d.reviewSummary.unavailable}건`);
  d.reviews.forEach(r=>{add('subheading',`${r.engine} · ${r.question}`);add('body','업체명 → 서비스 내용 → 출처 업체를 대조하세요. 답변 전문은 뒤의 GEO 상세에 보존됩니다.');r.sources.forEach(s=>add('body',s.title||s.url,s.url));});
  add('heading','AI 출처 검토함');add('body',insightNotes.sources);
  if(d.eligibleSources.length){add('subheading',sourceReferenceGuide.title);add('body',sourceReferenceGuide.purpose);add('body',sourceReferenceGuide.examples);add('body',sourceReferenceGuide.check);}
  if(!d.eligibleSources.length)add('body','자사몰·대형몰 등을 제외한 검토 대상 출처가 없습니다.');
  d.eligibleSources.forEach(s=>{add('subheading',s.title);add('body',s.url,s.url);add('body',`${s.ownership==='own'?'자사':s.ownership==='external'?'외부':'도메인 미확인'} · ${s.observations.length}건의 관측 · ${s.questions.length}개 질문`);s.questions.forEach(q=>add('body',q));});
  if(d.excludedSources.length){add('subheading',`목록에서 제외한 출처 · ${d.excludedSources.length}개`);d.excludedSources.forEach(s=>{add('body',`${s.domain} · ${s.reason} · ${s.observations.length}건의 관측`,s.url);s.questions.forEach(q=>add('body',q));});}
  add('heading','경쟁사 메시지 비교 지도');add('body',insightNotes.messages);
  d.messageRows.forEach(r=>{add('subheading',r.name);add('body',r.available?`수집된 필드 ${r.fieldCount}/2 · ${r.evidence}`:'제목·메타 설명 수집 미확인');if(r.url)add('body',r.url,r.url);add('body',r.cells.map(c=>`${c.label}: ${c.match===undefined?'미확인':c.match||'미탐지'}`).join(' · '));});
  if(d.messageOpportunities.length)add('body','자사 문구 검토 후보: '+d.messageOpportunities.map(o=>`${o.label} (${o.total}개 수집 후보 중 ${o.count}개 탐지)`).join(' · '));
  const rewrites=buildExecutableRewrites(report);
  add('heading','반복 표현 TO-BE 제안');add('body',KEYWORD_REWRITE_NOTE);
  for(const [label,plans] of [['단어',rewrites.singles],['연속어구',rewrites.phrases]] as const){
    add('subheading',`${label} · ${plans.length}개 제안`);
    plans.forEach(p=>{add('subheading',`${p.item.keyword} · ${p.kind} · ${p.item.count}회`);add('body',`현재: ${p.reason}`);add('body',`원문: ${p.source||'해당 표현의 문장 원문 미확인'}`);add('body',`검토 위치: ${p.guide.location}`);add('body',`제안: ${p.action}`);add('body',`작성 틀: ${p.template}`);add('body',`완료 확인: ${p.check}`);if(!report.evidenceReview){if(p.guide.url)add('body',p.guide.url,p.guide.url);add('body',rewriteInstruction(p));}});
  }
  add('subheading','반복 표현 공통 실행 순서');add('body','표현이 있는 원문 위치 확인 → 실제 의미·업무 범위 확인 → 작성 틀의 대괄호를 사실로 채우기 → PC·모바일 미리보기 → 같은 URL에서 반영 확인. 표현별 전체 작업 지시서는 보고서 화면의 작성 도우미에서 확인·복사할 수 있습니다.');
  add('heading','키워드 연결 기회');add('body','저장된 빈도 표현 중 일반어·확인되지 않은 영문 표기·상품 코드를 제외한 최대 8개 검토 후보입니다. 집계 범위는 빈도 상세에 표시하며, 횟수는 검색량이 아닙니다. 대표 상품·서비스인지 확인한 뒤 제목·설명을 검토하세요.');
  if(!d.gaps.length)add('body','연결 후보가 없거나 빈도 데이터가 없습니다.');
  d.gaps.forEach(k=>add('body',`${k.keyword} · ${k.count}회 · ${k.density}% · 제목 ${k.inTitle?'포함':'미포함'} · 설명 ${k.inMetaDescription?'포함':'미포함'}`));
  d.heldKeywords.forEach(k=>add('body',`제목 보강 보류: ${k.keyword} · ${k.count}회 · ${k.reason}`));
  add('heading',`통합 보완 목록 · ${d.tasks.length}개`);add('body',insightNotes.tasks);
  d.tasks.forEach((t,i)=>{add('subheading',`${i+1}. ${t.title}`);add('body',`${t.status==='fail'?'우선 보완':t.status==='warning'?'보완':'내용 검토'} · ${t.group} · 근거: ${t.source}`);add('body',`현재: ${t.evidence}`);add('body',`실행: ${t.action}`);});
  return blocks;
}
