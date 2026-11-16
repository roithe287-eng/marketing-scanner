import {z} from 'zod';

const metricIds=['lcp','inp','cls'] as const;
type MetricId=typeof metricIds[number];
export const mobileThresholds:Record<MetricId,[number,number]>={lcp:[2500,4000],inp:[200,500],cls:[0.1,0.25]};
const numeric=z.number().finite().nonnegative();
const metrics=z.object({lcp:numeric.optional(),inp:numeric.optional(),cls:numeric.optional()});
export const MobileEvidenceSchema=z.object({
  field:z.object({source:z.enum(['CrUX API','PageSpeed Insights']),scope:z.enum(['url','origin']),address:z.string(),values:metrics,period:z.string().optional()}).optional(),
  lab:z.object({source:z.enum(['PageSpeed Insights','Lighthouse JSON']),lcp:numeric.optional(),tbt:numeric.optional(),cls:numeric.optional(),issues:z.array(z.object({id:z.string(),detail:z.string()})).max(4)}).optional(),
  notice:z.string().optional(),
});
export type MobileEvidence=z.infer<typeof MobileEvidenceSchema>;
export const mobileNames={lcp:'주요 콘텐츠 표시',inp:'클릭·입력 반응',cls:'화면 요소 이동'};
export const labActions:Record<string,{label:string;steps:string}>={
  'lcp-discovery-insight':{label:'첫 화면 주요 이미지 발견 지연',steps:'첫 화면 LCP 이미지의 URL과 로딩 속성을 확인합니다. 지연 로딩이 설정되어 있으면 이 이미지에 한해 해제한 뒤 다시 측정합니다.'},
  'image-delivery-insight':{label:'이미지 전송 개선',steps:'첫 화면과 상품 이미지의 실제 표시 크기에 맞는 파일을 준비합니다. WebP 등 지원 형식과 반응형 이미지 크기를 적용한 뒤 같은 모바일 조건에서 다시 측정합니다.'},
  'modern-image-formats':{label:'이미지 형식 개선',steps:'표시 크기를 확인해 WebP 또는 AVIF로 교체하고 모바일에서 화질과 전송량을 대조합니다.'},
  'render-blocking-insight':{label:'초기 렌더링 차단',steps:'보고서가 지목한 CSS·스크립트를 개발자에게 전달합니다. 초기 화면에 필수적인 순서를 유지하며 나머지를 지연한 뒤 버튼·폼 정상 동작을 확인합니다.'},
  'unused-javascript':{label:'초기 미사용 스크립트',steps:'개발자 도구에서 초기 미사용 번들을 확인하고 필요한 화면이나 동작에서만 로딩하도록 나눕니다.'},
  'cls-culprits-insight':{label:'화면 요소 이동',steps:'동영상·이미지·배너의 초기 공간을 예약합니다. 다시 측정해 같은 요소의 이동이 줄었는지 확인합니다.'},
  'unsized-images':{label:'이미지 영역 크기 미지정',steps:'이미지의 가로·세로 또는 aspect-ratio를 지정하고 이미지 로딩 전후의 위치를 확인합니다.'},
};
function finite(value:unknown) {
  return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:undefined;
}
const parseLab=z.object({
  requestedUrl:z.string().optional(),finalDisplayedUrl:z.string().optional(),finalUrl:z.string().optional(),runtimeError:z.unknown().optional(),
  configSettings:z.object({formFactor:z.string().optional(),emulatedFormFactor:z.string().optional()}).optional(),
  audits:z.record(z.unknown()),
});
export function comparableUrl(value:string):string{
  try{const u=new URL(value);if(!/^https?:$/.test(u.protocol)||u.username||u.password)return '';u.hash='';return u.href;}
  catch{return '';}
}
export function readLighthouse(raw:unknown,target:string,source:'PageSpeed Insights'|'Lighthouse JSON'):MobileEvidence['lab'] {
  const parsed=parseLab.safeParse(raw);if(!parsed.success||parsed.data.runtimeError)return;
  const report=parsed.data,requested=comparableUrl(report.requestedUrl||'');
  const final=comparableUrl(report.finalDisplayedUrl||report.finalUrl||'');
  const device=report.configSettings?.formFactor||report.configSettings?.emulatedFormFactor;
  if(requested!==comparableUrl(target)&&final!==comparableUrl(target))return;
  if(device!=='mobile'&&(device||source==='Lighthouse JSON'))return;
  const auditSchema=z.object({numericValue:z.number().optional(),score:z.number().nullable().optional(),displayValue:z.string().optional()});
  const audit=(id:string)=>auditSchema.safeParse(report.audits[id]).data;
  const issues=Object.keys(labActions).flatMap(id=>{
    const found=audit(id);
    return typeof found?.score==='number'&&found.score<0.9?[{id,detail:(found.displayValue||'').slice(0,120)}]:[];
  }).slice(0,4);
  const lcp=finite(audit('largest-contentful-paint')?.numericValue),tbt=finite(audit('total-blocking-time')?.numericValue),cls=finite(audit('cumulative-layout-shift')?.numericValue);
  return lcp===undefined&&tbt===undefined&&cls===undefined&&!issues.length?undefined:{source,lcp,tbt,cls,issues};
}
export function fieldValues(raw:unknown,read:(value:unknown)=>number|undefined){
  const data=raw as Record<string,unknown>|null;
  if(!data||typeof data!=='object')return {};
  return Object.fromEntries(metricIds.flatMap(id=>{const value=read(data[id]);return value===undefined?[]:[[id,value]];}));
}
