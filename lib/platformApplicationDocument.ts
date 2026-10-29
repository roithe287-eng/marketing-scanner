import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {APPLICATION_PLATFORMS,applicationRoute,buildPlatformApplication} from './platformApplication';

export function buildPlatformApplicationDocument(report:MarketingReport):ReportBlock[]{
 const model=buildPlatformApplication(report);
 const blocks:ReportBlock[]=[{kind:'heading',text:'호스팅별 설정·설치 방법'},{kind:'body',text:`대상 URL: ${model.url} · ${model.detected.label}`}];
 for(const field of model.fields)blocks.push({kind:'subheading',text:field.label},{kind:'body',text:`현재: ${field.before||'실제 화면에서 확인'}`},{kind:'body',text:`입력할 값: ${field.value||'실제 내용으로 작성'}`});
 blocks.push({kind:'body',text:`버튼 연결: ${model.ctaUrl||'현재 버튼의 링크·전화·예약창 동작에서 확인'}`});
 for(const platform of APPLICATION_PLATFORMS){
  const route=applicationRoute(model,platform.id);
  blocks.push({kind:'subheading',text:`${platform.label} 설정·설치 방법`},{kind:'body',text:route.scope});
  for(const guide of route.guides){
   blocks.push({kind:'subheading',text:guide.title},{kind:'body',text:`입력 위치: ${guide.path.join(' → ')}`});
   for(const [index,step] of guide.steps.entries())blocks.push({kind:'body',text:`${index+1}. ${step}`});
   blocks.push({kind:'body',text:`완료 확인: ${guide.check}`});
  }
  for(const source of route.sources)blocks.push({kind:'body',text:source.title,href:source.url});
 }
 return blocks;
}
