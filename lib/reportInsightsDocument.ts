import {buildKeywordRewrites,KEYWORD_REWRITE_NOTE} from './keywordRewrite';
import {diagnosisScores} from './diagnosisVisuals';
import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {buildReportInsights,contentBrief,insightNotes} from './reportInsights';
export function buildInsightsDocument(report:MarketingReport):ReportBlock[] {
  const d=buildReportInsights(report),blocks:ReportBlock[]=[];
  const add=(kind:ReportBlock['kind'],text:string,href?:string)=>blocks.push({kind,text,...(href?{href}:{})});
  add('heading','8개 영역별 검토 가이드');
  diagnosisScores(report.diagnosis).forEach(s=>{add('subheading',`${s.label} · ${s.score}점`);add('body',s.action);add('body',`완료 확인: ${s.check}`);});
  add('heading','추가 진단 · 확인 범위와 전환 준비도');
  d.coverage.forEach(c=>add('body',`${c.label}: ${c.value} · ${c.state} · ${c.detail}`));add('body',insightNotes.stages);
  d.stages.forEach((s,i)=>add('body',`${i+1}. ${s.label}: ${s.score}/100 · ${s.action}`));
  add('heading','질문과 답변 페이지 지도');add('body',insightNotes.questions);
  if(!d.questions.length)add('body','새 형식의 질문 관측이 없어 페이지 연결을 판정하지 않았습니다.');
  d.questions.forEach(q=>{add('subheading',q.question);add('body',`${q.kind} · 정상 관측 ${q.observations}건 · ${q.evidence}`);if(q.target)add('body',q.target,q.target);add('body',contentBrief(q.question,q.target));});
  add('heading','브랜드 답변 검토함');add('body',insightNotes.reviews);add('body',`규칙에 해당하는 대조 대상: ${d.obs?d.reviews.length+'건':'미확인'}`);
  d.reviews.forEach(r=>{add('subheading',`${r.engine} · ${r.question}`);add('body','업체명 → 서비스 내용 → 출처 업체를 대조하세요. 답변 전문은 뒤의 GEO 상세에 보존됩니다.');r.sources.forEach(s=>add('body',s.title||s.url,s.url));});
  add('heading','AI 출처 검토함');add('body',insightNotes.sources);
  if(!d.sources.length)add('body','확인 가능한 출처 URL이 없습니다.');
  d.sources.forEach(s=>{add('subheading',s.title);add('body',s.url,s.url);add('body',`${s.ownership==='own'?'자사':s.ownership==='external'?'외부':'도메인 미확인'} · ${s.observations.length}건의 관측 · ${s.questions.length}개 질문`);s.questions.forEach(q=>add('body',q));});
  add('heading','경쟁사 메시지 비교 지도');add('body',insightNotes.messages);
  d.messageRows.forEach(r=>{add('subheading',r.name);add('body',r.available?`수집된 필드 ${r.fieldCount}/2 · ${r.evidence}`:'제목·메타 설명 수집 미확인');if(r.url)add('body',r.url,r.url);add('body',r.cells.map(c=>`${c.label}: ${c.match===undefined?'미확인':c.match||'미탐지'}`).join(' · '));});
  if(d.messageOpportunities.length)add('body','자사 문구 검토 후보: '+d.messageOpportunities.map(o=>`${o.label} (${o.total}개 수집 후보 중 ${o.count}개 탐지)`).join(' · '));
  const rewrites=buildKeywordRewrites(report.keywordFrequency,report.meta);
  add('heading','반복 표현 TO-BE 제안');add('body',KEYWORD_REWRITE_NOTE);
  for(const [label,plans] of [['단어',rewrites.singles],['연속어구',rewrites.phrases]] as const){
    add('subheading',`${label} · ${plans.length}개 제안`);
    plans.forEach(p=>{add('subheading',`${p.item.keyword} · ${p.kind} · ${p.item.count}회`);add('body',`AS-IS: ${p.reason}`);add('body',`${p.sourceLabel}: ${p.source||'실제 문장 원문이 없어 작성 틀을 제안합니다.'}`);add('body',`TO-BE: ${p.action}`);add('body',`작성 틀 (사실 확인 후 사용): ${p.template}`);add('body',`권장 위치: ${p.placement}`);add('body',`완료 확인: ${p.check}`);});
  }
  add('heading','키워드 연결 기회');add('body','제목·설명·헤딩·본문을 합친 빈도 상위 20개 표현에서 제목·설명에 없는 최대 8개 후보입니다. 검색량이 아니며, 사업과 무관한 일반어는 제외하고 검토하세요.');
  if(!d.gaps.length)add('body','연결 후보가 없거나 빈도 데이터가 없습니다.');
  d.gaps.forEach(k=>add('body',`${k.keyword} · ${k.count}회 · ${k.density}% · 제목 ${k.inTitle?'포함':'미포함'} · 설명 ${k.inMetaDescription?'포함':'미포함'}`));
  add('heading',`통합 보완 목록 · ${d.tasks.length}개`);add('body',insightNotes.tasks);
  d.tasks.forEach((t,i)=>{add('subheading',`${i+1}. ${t.title}`);add('body',`${t.status==='fail'?'우선 보완':t.status==='warning'?'보완':'내용 검토'} · ${t.group} · 근거: ${t.source}`);add('body',`현재: ${t.evidence}`);add('body',`실행: ${t.action}`);});
  return blocks;
}
