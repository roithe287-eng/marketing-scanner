import * as cheerio from 'cheerio';
import {websiteHttp} from './security/safeFetch';
import {observeRobots} from './observeRobots';
import {evaluateRobots} from './robotsRules';
import {withBudget} from './runtime/budget';
import {getScannerContactUrl} from './siteConfig';
import {parseSmartstoreUrl,type SmartstoreReport} from './smartstore';

/** No browser impersonation, cookies, private APIs, alternate hosts, or retry loops. */
export async function analyzeSmartstore(input:string):Promise<SmartstoreReport> {
  const target=parseSmartstoreUrl(input);
  if(!target)throw new Error('스마트스토어·브랜드스토어 주소가 아닙니다.');
  const base:SmartstoreReport={kind:'smartstore',version:1,url:target.url,storeUrl:target.storeUrl,storeId:target.storeId,productId:target.productId,observedAt:new Date().toISOString(),status:'limited',reason:'',observations:[]};
  const limited=(reason:string,httpStatus?:number):SmartstoreReport=>({...base,reason,httpStatus});
  const ua=`JinjjaScanner/1.0 (+${getScannerContactUrl()})`;
  try {return await withBudget(14000,async()=>{
    const robots=await observeRobots(target.url,ua);
    if(robots.status==='ok') {
      const rule=evaluateRobots(robots.text||'','JinjjaScanner',new URL(target.url).pathname);
      if(rule.allowed!==true)return limited('네이버의 수집 정책에 따라 이 경로의 자동 수집을 진행하지 않았습니다. 주소 구조만 확인했으며 스토어 품질이나 검색 노출 문제를 의미하지 않습니다.');
    } else if(!(robots.status==='missing'&&[404,410].includes(robots.httpStatus||0))) {
      return limited('수집 정책을 확인할 수 없어 페이지 수집을 중단했습니다. 스토어 존재 여부와 콘텐츠 상태는 아직 확인하지 못했습니다.');
    }
    const current=target.url;
    const response=await websiteHttp.fetch(current,{headers:{'User-Agent':ua,Accept:'text/html,application/xhtml+xml'},cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(6000)});
    if(response.status>=300&&response.status<400) {
      const location=response.headers.get('location');
      // A changed path needs its own robots decision. Ask for the final URL instead.
      const next=location?new URL(location,current):null;
      if(!next||next.href!==new URL(current).href)return limited('페이지가 다른 주소로 이동해 수집을 중단했습니다. 브라우저에서 최종 스토어·상품 주소를 확인해 입력해 주세요.',response.status);
      return limited('페이지 이동이 반복되어 수집을 중단했습니다.',response.status);
    }
    if(!response.ok)return limited(response.status===404?'해당 주소에서 페이지를 찾지 못했습니다. 업체 식별자와 상품 주소를 확인해 주세요.':`네이버가 페이지 수집 요청에 HTTP ${response.status}로 응답했습니다. 접근 제한을 우회하지 않으며, 이를 SEO 문제로 평가하지 않습니다.`,response.status);
    if(!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')||''))return limited('공개 HTML 페이지를 받지 못해 콘텐츠 분석을 제공할 수 없습니다.',response.status);
    return inspectSmartstoreHtml(base,await response.text(),response.status);
  });}catch{return limited('응답 시간 초과 또는 네트워크 문제로 페이지 내용을 확인하지 못했습니다. 주소만으로 콘텐츠나 SEO 상태를 추정하지 않습니다.');}
}

export function inspectSmartstoreHtml(base:SmartstoreReport,html:string,httpStatus=200):SmartstoreReport {
  const $=cheerio.load(html),clean=(v:unknown,max=600)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
  const title=clean($('title').first().text());
  $('script:not([type="application/ld+json"]),style,noscript').remove();
  const body=clean($('body').text(),3000);
  const challenge=/접근.{0,8}제한|비정상.{0,12}(접근|활동)|서비스.{0,8}(오류|점검)|페이지를 찾을 수|access denied|captcha|robot check|로그인이 필요|잠시 후 다시/i;
  if(challenge.test(title)||challenge.test(body.slice(0,1200))||$('input[type="password"],iframe[src*="captcha"],[id*="captcha"]').length)return {...base,httpStatus,reason:'접근 확인·로그인·오류 안내 화면이 반환되어 스토어 콘텐츠로 분석하지 않았습니다.',observations:[]};
  const declared=$('meta[property="og:url"]').attr('content')||$('link[rel="canonical"]').attr('href');
  if(declared){try{const identity=parseSmartstoreUrl(new URL(declared,base.url).href);const own=parseSmartstoreUrl(base.url);if(!identity||identity.storeId!==own?.storeId||identity.host!==own.host||identity.productId!==own.productId)return {...base,httpStatus,reason:'반환된 페이지가 입력한 스토어와 일치하는지 확인하지 못했습니다.',observations:[]};}catch{return {...base,httpStatus,reason:'반환된 페이지의 대표 주소를 확인하지 못했습니다.',observations:[]};}}
  const observations:SmartstoreReport['observations']=[];
  const add=(id:string,label:string,raw:unknown,note:string)=>{const value=clean(raw);if(value&&!/^(네이버\s*)?(스마트스토어|브랜드스토어|NAVER|Smart\s*Store)$/i.test(value))observations.push({id,label,value,note});};
  add('title','페이지 제목',title,'공개 HTML에서 확인한 제목입니다. 실제 검색 노출 제목이나 순위를 의미하지 않습니다.');
  add('description','페이지 설명',$('meta[name="description"]').attr('content'),'상품·스토어의 설명과 일치하는지 판매자센터의 등록 내용과 대조하세요.');
  add('ogTitle','공유 제목',$('meta[property="og:title"]').attr('content'),'공유용 메타 정보입니다. 검색 노출을 보장하지 않습니다.');
  add('ogDescription','공유 설명',$('meta[property="og:description"]').attr('content'),'핵심 상품과 차별점이 사실에 맞게 표현되어 있는지 검토하세요.');
  if(base.productId){
    let product:Record<string,unknown>|undefined;
    const visit=(v:unknown,depth=0)=>{if(depth>5||product||!v||typeof v!=='object')return;if(Array.isArray(v)){v.slice(0,50).forEach(x=>visit(x,depth+1));return;}const item=v as Record<string,unknown>;if(item['@type']==='Product'||Array.isArray(item['@type'])&&item['@type'].includes('Product'))product=item;else if(item['@graph'])visit(item['@graph'],depth+1);};
    $('script[type="application/ld+json"]').slice(0,10).each((_,el)=>{const value=$(el).text();if(value.length<=100000)try{visit(JSON.parse(value));}catch{/* Invalid structured data is not a seller penalty. */}});
    if(product){add('productName','상품명',product.name,'입력한 상품 페이지의 공개 구조화 데이터에서 확인했습니다.');add('productDescription','상품 설명',product.description,'확인된 텍스트만 표시합니다. 상세 이미지 안의 문구는 분석하지 않았습니다.');}
  }
  return {...base,httpStatus,observations,status:observations.length?'observed':'limited',reason:observations.length?'입력한 페이지의 공개 HTML에서 확인한 항목만 표시합니다. 표시되지 않은 정보가 실제 페이지에 없다는 뜻은 아닙니다.':'페이지 응답은 받았지만 분석할 공개 콘텐츠를 확인하지 못했습니다. 동적 로딩 또는 플랫폼 제공 범위의 영향일 수 있으며 품질 점수를 계산하지 않습니다.'};
}
