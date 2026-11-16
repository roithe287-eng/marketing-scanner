import {budgetFetch} from './runtime/budget';
import {comparableUrl,readLighthouse,fieldValues,type MobileEvidence} from './mobileEvidence';

const cruxNames={lcp:'largest_contentful_paint',inp:'interaction_to_next_paint',cls:'cumulative_layout_shift'};
const psiNames={lcp:'LARGEST_CONTENTFUL_PAINT_MS',inp:'INTERACTION_TO_NEXT_PAINT',cls:'CUMULATIVE_LAYOUT_SHIFT_SCORE'};
function valuesFor(data:unknown,names:typeof cruxNames,method:(value:any,id:keyof typeof cruxNames)=>number|undefined){
  if(!data||typeof data!=='object')return {};
  const source=data as Record<string,unknown>;
  const keys=Object.keys(names) as (keyof typeof names)[];
  const values=Object.fromEntries(keys.map(id=>[id,method(source[names[id]],id)]));
  return fieldValues(values,value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:undefined);
}
async function requestJson(url:URL,init:RequestInit){
  try{
    const response=await budgetFetch(url,{...init,redirect:'error',cache:'no-store'});
    return {data:response.ok?await response.json():null,limited:response.status===429};
  }catch{return {data:null,limited:false};}
}

async function readCrux(target:string,key:string):Promise<MobileEvidence['field']>{
  const endpoint=new URL('https://chromeuxreport.googleapis.com/v1/records:queryRecord');
  endpoint.searchParams.set('key',key);
  const origin=new URL(target).origin;
  for(const scope of ['url','origin'] as const){
    const address=scope==='url'?target:origin;
    const {data}=await requestJson(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({[scope]:address,formFactor:'PHONE',metrics:Object.values(cruxNames)}),signal:AbortSignal.timeout(5000)});
    const record=data?.record;
    if(!record||record.key?.formFactor!=='PHONE'||comparableUrl(record.key?.[scope]||'')!==comparableUrl(address))continue;
    const values=valuesFor(record.metrics,cruxNames,input=>{
      const raw=input?.percentiles?.p75;
      return typeof raw==='string'&&/^\d+(?:\.\d+)?$/.test(raw)?Number(raw):raw;
    });
    if(!Object.keys(values).length)continue;
    const toDate=(v:any)=>Number.isInteger(v?.year)&&Number.isInteger(v?.month)&&Number.isInteger(v?.day)?[v.year,v.month,v.day].join('.'):'';
    const start=toDate(record.collectionPeriod?.firstDate),end=toDate(record.collectionPeriod?.lastDate);
    return {source:'CrUX API',scope,address,values,period:start&&end?start+'–'+end:undefined};
  }
}
export async function collectMobileEvidence(target:string):Promise<MobileEvidence>{
  const endpoint=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.search=new URLSearchParams({url:target,strategy:'mobile',category:'performance'}).toString();
  if(process.env.GOOGLE_PAGESPEED_API_KEY)endpoint.searchParams.set('key',process.env.GOOGLE_PAGESPEED_API_KEY);
  const cruxKey=process.env.GOOGLE_CRUX_API_KEY;
  const [{data,limited},crux]=await Promise.all([
    requestJson(endpoint,{signal:AbortSignal.timeout(21000)}),
    cruxKey?readCrux(target,cruxKey):Promise.resolve(undefined),
  ]);
  let field=crux;
  if(!field){
    const origin=new URL(target).origin;
    for(const [scope,observed,address] of [
      ['url',data?.loadingExperience,target],['origin',data?.originLoadingExperience,origin],
    ] as const){
      if(!observed||comparableUrl(observed.id||'')!==comparableUrl(address)||(scope==='url'&&observed.origin_fallback===true))continue;
      const values=valuesFor(observed.metrics,psiNames,(value,id)=>{
        const p=value?.percentile;
        return typeof p==='number'&&id==='cls'?p/100:p;
      });
      if(Object.keys(values).length){field={scope,source:'PageSpeed Insights',address,values};break;}
    }
  }
  const lab=readLighthouse(data?.lighthouseResult,target,'PageSpeed Insights');
  const notice=lab?undefined:(limited?'PageSpeed Insights 공식 API의 요청 한도에 도달했습니다. ':'공식 실험실 측정값을 받지 못했습니다. ')+
    'PageSpeed Insights에서 직접 확인하거나 Chrome Lighthouse의 모바일 JSON을 가져올 수 있습니다.';
  return {field,lab,notice};
}
