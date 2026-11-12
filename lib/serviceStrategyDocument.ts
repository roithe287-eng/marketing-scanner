import {draftEmphasis} from './reportEmphasis';
import {serviceFindingPresentation} from './serviceFindingPresentation';
import type {ServiceStrategy} from './serviceStrategy';
import type {ReportBlock} from './reportDocument';
import {buildLogisticsBriefingDocument} from './logisticsBriefingDocument';
export function buildServiceStrategyDocument(plan?:ServiceStrategy):ReportBlock[]{
  if(!plan)return [];
  const b:ReportBlock[]=[];
  const add=(kind:ReportBlock['kind'],text:string,href?:string)=>b.push({kind,text,...(href?{href}:{})});
  add('heading',plan.industry==='noncommerce'?'목적별 고객·검색·콘텐츠·이용 전략':'서비스별 고객·검색·광고·상담 전략');add('body',`확인한 원문 ${new Set(plan.sources.map(s=>s.url)).size}개`);
  for(const f of plan.findings.map(serviceFindingPresentation)){add('subheading',f.title);add('body',f.observed);if(plan.industry!=='noncommerce'){if(f.action)add('body','수정 제안: '+f.action);}for(const url of new Set(f.evidence.map(e=>e.url)))add('body','원문 보기',url);}
  for(const s of plan.segments){
    add('subheading',s.label+' · 고객과 선택 기준');if(plan.industry!=='noncommerce')add('body','고객 가설: '+s.audience);
    s.questions.forEach(q=>add('body','고객 질문: '+q));s.evidence.forEach(e=>add('body','원문: '+e.text,e.url));
    add('body','검색어 기획 예시 · 검색량 미측정: '+s.keywords.join(' / '));
    if(s.landingUrl)add('body','랜딩 후보 · 실제 화면 확인',s.landingUrl);
    s.landingBlocks.forEach((x,i)=>add('body',`랜딩 ${i+1}. ${x}`));
    add('body','문구 초안 · 운영 조건 확인 후 사용: '+s.headline+'\n'+s.message+'\n버튼: '+s.cta);add('body','확인 지표: '+s.metric);
  }
  add('heading','채널별 광고·콘텐츠 실행안');
  for(const c of plan.channels){add('subheading',c.label+' · '+c.role);add('body','운영 구성: '+c.setup);add('body','소재·메시지: '+c.creative);add('body','전환 기준: '+c.conversion);add('body','집행 전·후 확인: '+c.review);}
  for(const c of plan.content){add('subheading',c.title);add('body',c.angle);c.outline.forEach(x=>add('body',x));add('body','연결 행동: '+c.cta);c.sourceUrls.forEach(url=>add('body','소재 검토 원문',url));}
  add('heading',plan.industry==='noncommerce'?'목적별 행동·성과 검증':'상담 전환·성과 검증');
  for(const f of plan.funnel){add('subheading',f.stage);add('body',f.definition+'\n'+f.check+'\n측정 이벤트 제안: '+f.event);}
  for(const m of plan.metrics){add('subheading',m.name);add('body','산식: '+m.formula+'\n필요 데이터: '+m.required+'\n판단: '+m.interpretation);}
  add('heading',plan.industry==='noncommerce'?'실행·검증 순서':'4주 실행·검증 순서');
  for(const e of plan.experiments){add('subheading',e.title);add('body','가설: '+e.hypothesis+'\n변경: '+e.change+'\n지표: '+e.metric+'\n채택 기준: '+e.decision);}
  if(plan.briefingPlan){const n=plan.briefingPlan;
    add('heading','업종별 네이버 AI 브리핑 대응');add('body',n.notice);
    for(const x of n.blocks){add('subheading',x.title);add('body','고객 질문: '+x.question+'\n담을 내용: '+x.fields.join(' · ')+'\n수정 위치: '+x.placement+'\n실행 제안: '+x.action+'\n작성 초안 · 확인 후 사용: '+x.draft);for(const e of x.evidence)add('body','자사 원문: '+e.text,e.url);}
    for(const c of n.channels){add('subheading',c.title);add('body',c.role+'\n'+c.deliverable);}
    for(const v of n.verification){add('subheading',v.title);add('body',v.action+'\n확인 항목: '+v.metric);}
    for(const r of n.references)add('body','공식 참고 안내 · 노출 결과 아님: '+r.label,r.url);
  }
  return [...b,...buildLogisticsBriefingDocument(plan.briefing)].map(block=>/작성 초안|문구 초안|^랜딩 \d/.test(block.text)?{...block,emphasis:[...(block.emphasis||[]),...draftEmphasis(block.text)]}:block);
}
