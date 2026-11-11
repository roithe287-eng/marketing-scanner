import type {LogisticsBriefing} from './logisticsBriefing';
import type {ReportBlock} from './reportDocument';

export function buildLogisticsBriefingDocument(plan?:LogisticsBriefing):ReportBlock[]{
  if(!plan)return [];
  const b:ReportBlock[]=[];
  const add=(kind:ReportBlock['kind'],text:string,href?:string)=>b.push({kind,text,...(href?{href}:{})});
  const cite=(sources:LogisticsBriefing['blocks'][number]['evidence'])=>sources.forEach(s=>add('body','자사 원문 단서 · '+s.title+': '+s.text,s.url));
  add('heading','네이버 AI 브리핑 대응 설계');add('body',plan.reference);add('body',plan.scope);add('body',plan.strategy);
  for(const s of plan.blocks){add('subheading',s.label);add('body','검색 사례의 구성: '+s.example);add('body','관련 원문 단서: '+(s.observed.join(' · ')||'수집 범위에서 미확인'));add('body','추가 확인할 단서: '+(s.review.join(' · ')||'표현은 확인했으나 설명의 충분성·최신성은 검토 필요'));cite(s.evidence);add('body','보완 제안: '+s.action+'\n적용 위치: '+s.placement);add('body','작성 초안 · 대괄호는 운영 조건 확인 후 작성: '+s.draft);}
  add('subheading','5단계별 작성 설계');
  for(const s of plan.steps){add('subheading',s.title);add('body','고객 준비: '+s.customer+'\n업체 설명: '+s.operator+'\n확인 기준: '+s.verify);cite(s.evidence);}
  add('subheading','홈페이지·블로그·작업 자료의 역할');
  for(const c of plan.channels){add('subheading',c.name);add('body',c.role+'\n제작 내용: '+c.deliverable+'\n연결: '+c.connection);}
  add('subheading','블로그 콘텐츠 6편 기획');
  for(const a of plan.articles){add('subheading',a.title);add('body','검색 의도: '+a.intent);a.outline.forEach((o,i)=>add('body',`${i+1}. ${o}`));add('body','준비 자료: '+a.asset+'\n다음 행동: '+a.cta);}
  add('subheading','발행 후 관측·성과 확인');
  for(const v of plan.verification){add('subheading',v.title);add('body',v.action+'\n기록 기준: '+v.metric);}
  for(const r of plan.references)add('body',r.label+' · '+r.scope,r.url);
  return b;
}
