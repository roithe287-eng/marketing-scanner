import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {APPLICATION_PLATFORMS,APPLICATION_REVIEWED_AT,applicationHtml,applicationRoute,applicationTextReady,buildPlatformApplication,initialApplicationValues} from './platformApplication';

/** Keep default report/share/PDF proposals in sync; transient browser edits are copied separately. */
export function buildPlatformApplicationDocument(report:MarketingReport):ReportBlock[]{
 const model=buildPlatformApplication(report),values=initialApplicationValues(model),body=applicationHtml(values,model.faqs,model.ctaUrl);
 const blocks:ReportBlock[]=[{kind:'heading',text:'플랫폼별 적용 패키지 · 문구·위치·확인'},
 {kind:'body',text:`대상 URL: ${model.url} · ${model.detected.label}`},
 {kind:'body',text:'진단 당시의 수정 초안입니다. 사실·현재 조건을 확인하고 해당 URL에만 적용하세요. 관리자·스킨 버전에 따라 편집 메뉴가 다를 수 있습니다. 원본 파일 전체 교체나 자동 설치 완료를 의미하지 않습니다.'}];
 for(const field of model.fields){
  blocks.push({kind:'subheading',text:`${field.label} · ${applicationTextReady(field.value)?'사실 확인 후 적용':'내용 입력 필요'}`},
   {kind:'body',text:`현재: ${field.before||'수집 원문 미확인'}`},
   {kind:'body',text:`적용 문구: ${field.value||'입력 필요'} · ${field.basis}`},
   {kind:'body',text:field.check});
 }
 blocks.push({kind:'body',text:`행동 버튼 연결 주소: ${model.ctaUrl||'미확인 · HTML에서 버튼 제외'}`});
 for(const q of model.faqs)blocks.push({kind:'subheading',text:`FAQ · ${q.included?'HTML 포함':'확인 대기 · HTML 제외'}`},{kind:'body',text:`Q. ${q.question}\nA. ${q.answer}`},{kind:'body',text:`게시 전 확인: ${q.missingFacts.join(' / ')||'원문·현재 조건과 일치 여부'}`});
 for(const platform of APPLICATION_PLATFORMS){
  const route=applicationRoute(model,platform.id);
  blocks.push({kind:'subheading',text:`${platform.label} 적용 가이드`},{kind:'body',text:route.scope});
  for(const [label,r] of [['검색 제목·설명',route.seo],['첫 화면',route.hero],['행동 버튼',route.cta],['본문 추가용 HTML',route.code]] as const)blocks.push({kind:'body',text:`${label}: ${r.path.join(' → ')}\n${r.instruction}`});
  for(const source of route.sources)blocks.push({kind:'body',text:source.title,href:source.url});
 }
 blocks.push({kind:'subheading',text:`추가 구역 HTML · 확인 대기 FAQ ${body.omittedFaqs}개 제외`},
  {kind:'body',text:'기존 첫 화면을 고칠 때는 문구를 각각 복사하세요. 아래는 새 구역 추가용 예시이며 소제목(H2)을 사용합니다. 검색 제목·설명 입력란에 이 HTML을 넣지 않습니다.'},
  {kind:'body',text:body.hasContent?body.html:'사용할 문구 입력 필요'},
  {kind:'subheading',text:'게시 전·후 확인'});
 for(const check of applicationRoute(model,model.initialPlatform).checks)blocks.push({kind:'body',text:check});
 blocks.push({kind:'body',text:`플랫폼 가이드 확인일: ${APPLICATION_REVIEWED_AT}`});
 return blocks;
}
