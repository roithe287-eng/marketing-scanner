import {ownBusinessRole,classificationText,isContextOnlyEvidence,isSecondarySection} from './websiteIdentity';
import {publicBusinessSections} from './publicBusinessSections';
import * as cheerio from 'cheerio';
import {PLACE_DETECTION_ORDER,placeSector} from './localPlaceCatalog';
import type {LocalPlaceEvidence} from './localPlaceSchema';
import {captureSeasonalEvidence} from './seasonalPlaceEvidence';
import {seasonalIdentitySector} from './seasonalPlaceCatalog';
import {placeChannel} from './hospitalPlace';
import {sameSite,siteIdentity} from './siteIdentity';

const clean=(v:unknown,max=200)=>typeof v==='string'?v.replace(/\s+/gu,' ').trim().slice(0,max):'';
const provider=/광고\s*대행|마케팅|홈페이지\s*제작|웹\s*제작|솔루션|소프트웨어|뉴스|신문|매거진|블로그|협회|학회|채용|(?:업체|병원|맛집)\s*(?:비교|목록|검색\s*포털)/i;
const sensitive=/\/(?:reviews?|cases?|patients?|records?|consult|counsel|login|admin|예약|상담|환자)(?:[\/._-]|$)/i;
const localType=/^(?:LocalBusiness|Restaurant|Store|Pharmacy|BankOrCreditUnion|InsuranceAgency|FinancialService|.+Store|.+Salon|.+Restaurant|Hospital|MedicalClinic|Dentist|PhysiciansOffice|LegalService|Attorney|AccountingService|VeterinaryCare|PetSitting|CafeOrCoffeeShop|Bakery|FoodEstablishment|BarOrPub|Hotel|Motel|LodgingBusiness|Campground|BedAndBreakfast|TravelAgency|DaySpa|School|ExerciseGym|SportsActivityLocation|HealthClub|GolfCourse|AutoRepair|AutoDealer|AutoWash|AutomotiveBusiness|HomeAndConstructionBusiness|Plumber|Electrician|Locksmith|MovingCompany|GeneralContractor|RealEstateAgent|Optician|Florist|Museum|ArtGallery|MovieTheater|AmusementPark|TouristAttraction|EventVenue|AutoRental|SelfStorage|ChildCare|NursingHome|DryCleaningOrLaundry|FuneralHome)$/;
function addressText(value:unknown):string {
  if(typeof value==='string')return clean(value,300);
  if(!value||typeof value!=='object'||Array.isArray(value))return '';
  const v=value as Record<string,unknown>;
  return [...new Set(['addressRegion','addressLocality','streetAddress'].map(k=>clean(v[k],200)).filter(Boolean))].join(' ').slice(0,300);
}
/** Only bounded facts from the submitted public HTML; no Place scraping or API snippets sent to AI. */
export function captureLocalPlaceEvidence(html:string,url:string):LocalPlaceEvidence|undefined {
  const site=siteIdentity(url);if(!site||site.shared||/(?:^|\.)(?:naver\.com|naver\.me)$/.test(site.host)||sensitive.test(new URL(url).pathname))return;
  const $=cheerio.load(html);
  if($('meta[name="robots" i]').toArray().some(e=>/\b(?:noindex|none)\b/i.test($(e).attr('content')||'')))return;
  const title=clean($('head > title').first().text(),300),h1=clean($('h1').first().text(),200);
  const siteName=clean($('meta[property="og:site_name"]').attr('content'),120);
  const rawDescription=clean($('meta[name="description" i]').attr('content'),500);
  const description=isContextOnlyEvidence('',rawDescription)?'':rawDescription;
  const identity=[title,h1,siteName].filter(v=>v&&!isContextOnlyEvidence('',v)).join(' ').slice(0,500);
  const role=ownBusinessRole({title,h1:[h1],description});
  if(['agency','software','manufacturing'].includes(role||'')||provider.test(identity))return;
  const objects:Record<string,unknown>[]=[];
  const walk=(v:unknown,depth=0)=>{if(!v||typeof v!=='object'||depth>8||objects.length>=150)return;if(Array.isArray(v)){v.slice(0,40).forEach(x=>walk(x,depth+1));return;}const o=v as Record<string,unknown>;objects.push(o);Object.values(o).forEach(x=>walk(x,depth+1));};
  $('script[type="application/ld+json"]').slice(0,15).each((_,e)=>{const raw=$(e).text();if(raw.length<100000)try{walk(JSON.parse(raw));}catch{/* Invalid schema cannot establish identity. */}});
  const types=(o:Record<string,unknown>)=>(Array.isArray(o['@type'])?o['@type']:[o['@type']]).filter((v):v is string=>typeof v==='string').map(t=>t.replace(/^https?:\/\/schema.org\//,''));
  const entities=objects.filter(o=>types(o).some(t=>localType.test(t))&&(!o.url||typeof o.url==='string'&&sameSite(o.url,url)));
  const named=entities.filter(o=>clean(o.name)&&identity.replace(/\s/g,'').includes(clean(o.name).replace(/\s/g,'')));
  const samePage=(value:unknown)=>{try{const a=new URL(String(value),url),b=new URL(url);return a.origin===b.origin&&a.pathname.replace(/\/$/,'')===b.pathname.replace(/\/$/,'')&&a.search===b.search;}catch{return false;}};
  const entity=named.length===1?named[0]:entities.length===1&&(!clean(entities[0].name)||samePage(entities[0].url||entities[0]['@id']))?entities[0]:undefined;
  const ownTypes=entity?types(entity):[];
  const links:LocalPlaceEvidence['links']=[];
  $('a[href]').slice(0,500).each((_,e)=>{const a=$(e);const link=placeChannel(a.attr('href')||'',clean(a.text())+' '+clean(a.attr('aria-label')),true);if(link&&!links.some(l=>l.url===link.url)&&links.length<8)links.push(link);});
  const industryText=(value:string)=>value.replace(/(?:반려동물|반려견|애견|강아지|고양이)\s*동반/gu,'');
  const semantic=classificationText(industryText([identity,clean(entity?.name),ownTypes.join(' ')].join(' ')));
  let sector=role==='home'?placeSector('home_service'):role==='education'?placeSector('education'):PLACE_DETECTION_ORDER.map(placeSector).find(s=>s.identity.test(semantic)||s.types.some(t=>ownTypes.includes(t)));
  // Branded homepages often have only a brand in the title. Their own description may identify the offering.
  if(!sector&&!provider.test(description))sector=PLACE_DETECTION_ORDER.map(placeSector).find(s=>s.id!=='local'&&s.identity.test(classificationText(industryText(description))));
  const seasonalSector=seasonalIdentitySector(semantic+' '+(!provider.test(description)?description:''));
  if((!sector||sector.id==='local')&&seasonalSector)sector=placeSector(seasonalSector);
  if(!sector&&!links.length&&!entity&&!($('address,[itemprop="address"]').length&&/영업시간|운영시간|방문\s*(?:예약|상담)|오시는\s*길/.test($('body').text())))return;
  sector=sector||placeSector('local');
  const root=$('body').clone();root.find('script,style,noscript,form,input,textarea,[hidden],[aria-hidden="true"],.reviews,.testimonials,[data-private]').remove();
  root.find('h1,h2,h3,h4').each((_,e)=>{
    const heading=$(e);if(!isSecondarySection(clean(heading.text()),''))return;
    const section=heading.closest('section,article');
    if(section.length&&section.find('h1,h2,h3,h4').first()[0]===e)section.remove();
    else {heading.nextUntil('h1,h2,h3,h4').remove();heading.remove();}
  });
  const detailed=publicBusinessSections($.html(root)).filter(s=>!isSecondarySection(s.heading,s.text)).map(s=>s.text);
  root.find('br').replaceWith('\n');root.find('p,li,h1,h2,h3,h4,div,section,address').append('\n');
  const lines=root.text().slice(0,30000).split(/\n+/u).map(v=>clean(v,700)).filter(Boolean);
  const text=lines.join(' ');
  const positive=lines.filter(v=>!/(?:불가|미제공|하지\s*않|취급하지|시행하지|운영하지|서비스\s*종료)/u.test(v)).join(' ');
  const address=addressText(entity?.address)||clean(root.find('address,[itemprop="address"]').first().text(),300)||clean(lines.join('\n').match(/(?:서울(?:특별시)?|부산(?:광역시)?|대구(?:광역시)?|인천(?:광역시)?|광주(?:광역시)?|대전(?:광역시)?|울산(?:광역시)?|세종(?:특별자치시)?|경기(?:도)?|강원(?:특별자치도)?|충청[남북]도|전[라북남특별자치]+도|경상[남북]도|제주(?:특별자치도)?)\s+[가-힣]+(?:시|군|구)\s+[^|\n]{3,65}/u)?.[0],150);
  const physical=!!address||!!links.length||!!entity||/오시는\s*길|매장\s*(?:안내|찾기)|방문\s*상담|주차|찾아오시는/.test(text);
  if(!physical&&/쇼핑몰|온라인\s*(?:전용|전문)|인터넷\s*쇼핑/.test(identity+' '+description))return;
  const name=clean(entity?.name,120)||siteName||clean(title.split(/[|｜–—]|\s-\s|::/)[0],120)||clean(h1,120);
  if(!name)return;
  const branch=clean((name+' '+h1).split(/\s+/u).find(v=>/^[가-힣A-Za-z0-9]+(?:본점|지점|점)$/u.test(v)&&!/(?:음식점|제과점|소매점|판매점|대리점|전문점|가맹점)$/.test(v)),80);
  const franchise=/프랜차이즈|가맹\s*(?:점|문의|창업)|전국\s*매장|매장\s*찾기/.test(text);
  const terms:LocalPlaceEvidence['terms']=[];
  const add=(group:LocalPlaceEvidence['terms'][number]['group'],term:string)=>{if(term&&!terms.some(t=>t.group===group&&t.term===term)&&terms.length<32)terms.push({group,term:term.slice(0,80)});};
  for(const term of sector.services)if(positive.includes(term)||(!/(?:불가|미제공|하지\s*않|서비스\s*종료)/u.test(description)&&description.includes(term)))add('상품·서비스',term);
  for(const term of ['주차','예약','영업시간','휴무','브레이크타임','라스트오더','포장','배달','픽업','야간','주말','반려동물 동반','휠체어'])if(positive.includes(term))add('방문·이용 조건',term);
  for(const term of ['어린이','가족','단체','직장인','초보','입문','소형견','대형견','고양이','강아지','기업'])if(positive.includes(term))add('고객·목적',term);
  if(branch)add('지역·지점',branch);
  const region=address.match(/^[가-힣]+\s+[가-힣]+(?:시|군|구)/u)?.[0];if(region)add('지역·지점',region);
  const specs:[string,string,RegExp][]=[['offer','상품·서비스 설명',new RegExp(sector.services.join('|'),'i')],['hours','운영시간 안내',/영업시간|진료시간|운영시간|휴무|브레이크타임|라스트오더/],['price','가격·비용 안내',/가격|요금|비용|비급여|진료비|금액\s*\(원\)|상담료|수강료|[\d,]+\s*원/],['visit','방문·주차 안내',/주차|오시는\s*길|찾아오시는|휠체어/],['booking','예약·문의 안내',/예약|방문\s*상담|문의|연락처/],['conditions','이용·취소 조건',/취소|환불|준비\s*(?:서류|사항|물)|이용\s*조건|포함|불포함/]];
  const signals=specs.flatMap(([key,label,re])=>{const line=[...detailed,...lines].filter(v=>re.test(v)).sort((a,b)=>Number(b.length>=15)-Number(a.length>=15)||Number(/\d/.test(b))-Number(/\d/.test(a)))[0];if(!line)return [];const at=line.search(re);return [{key,label,excerpt:line.slice(Math.max(0,at-35),at+110).trim()}];});
  const images=root.find('img').slice(0,200).toArray();
  const seasonal=captureSeasonalEvidence({sector:sector.id,identity,description,headings:root.find('h2,h3').slice(0,20).toArray().map(e=>clean($(e).text(),160)),lines});
  return {...(seasonal?{seasonal}:{}),sector:sector.id,name,identity,address,branch,franchise,links,terms,signals,media:{images:images.length,described:images.filter(e=>!!clean($(e).attr('alt'))).length,videos:Math.min(100,root.find('video,iframe[src*="youtube"],iframe[src*="vimeo"]').length)}};
}
