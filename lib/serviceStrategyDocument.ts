import type {ServiceStrategy} from './serviceStrategy';
import type {ReportBlock} from './reportDocument';
import {buildLogisticsBriefingDocument} from './logisticsBriefingDocument';
export function buildServiceStrategyDocument(plan?:ServiceStrategy):ReportBlock[]{
  if(!plan)return [];
  const b:ReportBlock[]=[];
  const add=(kind:ReportBlock['kind'],text:string,href?:string)=>b.push({kind,text,...(href?{href}:{})});
  add('heading','서비스별 고객·검색·광고·상담 전략');add('body',plan.summary);add('body',plan.notice);
  for(const f of plan.findings){add('subheading',f.title);add('body','현재 관측: '+f.observed+'\n해석: '+f.interpretation+'\n실행: '+f.action);f.evidence.forEach(e=>add('body','원문: '+e.text,e.url));}
  for(const s of plan.segments){
    add('subheading',s.label+' · 고객과 선택 기준');add('body','고객 가설: '+s.audience);add('body',s.diagnosis);
    s.questions.forEach(q=>add('body','고객 질문: '+q));s.evidence.forEach(e=>add('body','원문: '+e.text,e.url));
    add('body','검색어 기획 예시 · 검색량 미측정: '+s.keywords.join(' / '));
    if(s.landingUrl)add('body','랜딩 후보 · 실제 화면 확인',s.landingUrl);
    s.landingBlocks.forEach((x,i)=>add('body',`랜딩 ${i+1}. ${x}`));
    add('body','문구 초안 · 운영 조건 확인 후 사용: '+s.headline+'\n'+s.message+'\n버튼: '+s.cta);add('body','확인 지표: '+s.metric);
  }
  add('heading','채널별 광고·콘텐츠 실행안');
  for(const c of plan.channels){add('subheading',c.label+' · '+c.role);add('body','운영 구성: '+c.setup);add('body','소재·메시지: '+c.creative);add('body','전환 기준: '+c.conversion);add('body','집행 전·후 확인: '+c.review);}
  for(const c of plan.content){add('subheading',c.title);add('body',c.angle);c.outline.forEach(x=>add('body',x));add('body','연결 행동: '+c.cta);c.sourceUrls.forEach(url=>add('body','소재 검토 원문',url));}
  add('heading','상담 전환·성과 검증');
  for(const f of plan.funnel){add('subheading',f.stage);add('body',f.definition+'\n'+f.check+'\n측정 이벤트 제안: '+f.event);}
  for(const m of plan.metrics){add('subheading',m.name);add('body','산식: '+m.formula+'\n필요 데이터: '+m.required+'\n판단: '+m.interpretation);}
  add('heading','4주 실행·검증 순서');
  for(const e of plan.experiments){add('subheading',e.title);add('body','가설: '+e.hypothesis+'\n변경: '+e.change+'\n지표: '+e.metric+'\n채택 기준: '+e.decision);}
  return [...b,...buildLogisticsBriefingDocument(plan.briefing)];
}
