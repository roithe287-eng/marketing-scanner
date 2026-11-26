import type {OwnProductSource} from './ownProductSchema';
import {sameSite} from './siteIdentity';
import type {ExtractedWebsiteData} from './extractWebsite';
import {marketingExpressions} from './marketingExpressions';
import {classificationText,purposeSchemaTypes,ownBusinessRole} from './websiteIdentity';

const families:[string,RegExp][]=[
  ['의료기기·병원용품',/의료\s*기기|의료\s*장비|(?:치과|병원|진료)\s*(?:용\s*)?(?:장비|소모품|기기|의자)|멸균기/iu],
  ['반려동물 용품',/(?:반려동물|반려견|강아지|고양이|애견)\s*(?:용품|사료|간식|모래|하네스)|캣타워/iu],
  ['교재·학습용품',/교재|학습지|문제집|참고서|학습\s*키트|코딩\s*키트/iu],
  ['가구·리빙',/가구|홈데코|수납장|책장|책상|소파|쇼파|식탁|거실\s*조명/iu],
  ['화장품·뷰티용품',/화장품|스킨케어|선크림|마스카라|립스틱|샴푸|토너|로션|네일\s*(?:제품|용품|폴리시)/iu],
  ['건강식품·영양제',/건강\s*(?:기능\s*)?식품|영양제|종합비타민|비타민|유산균|오메가\s*[36]/iu],
  ['식품·음료',/(?<![\p{L}])식품(?!의약품)|식재료|원두|커피\s*캡슐|디저트\s*(?:세트|판매)|과자|과일\s*주스|녹차|홍차|티백/iu],
  ['스포츠용품',/(?:스포츠|골프|헬스|스키|수영|테니스|캠핑)\s*(?:용품|장비)|골프채|테니스\s*라켓/iu],
  ['자동차용품',/(?:차량|자동차)\s*(?:용품|부품|액세서리)|블랙박스|차량용\s*(?:매트|거치대)/iu],
  ['패션·의류',/의류|(?:린넨|티|드레스)\s*셔츠|바지|원피스|코트|청바지|후드\s*티/iu],
  ['생활·주방용품',/생활\s*용품|주방\s*용품|프라이팬|밀폐\s*용기|조리\s*도구|청소\s*도구/iu],
  ['디지털·가전',/전자\s*제품|(?:디지털\s*)?가전|냉장고|세탁기|에어컨|노트북|태블릿|이어폰/iu],
  ['유아동 용품',/유아동\s*(?:제품|용품)|유아용\s*카시트|유모차|(?:어린이\s*)?장난감|젖병|기저귀/iu],
  ['신발·가방',/신발|운동화|러닝화|구두|백팩|핸드백|숄더백|가방/iu],
  ['주얼리·시계',/주얼리|귀금속|목걸이|귀걸이|(?:커플|웨딩)\s*반지|손목\s*시계/iu],
  ['도서·문구',/도서(?!\s*지역)|문구\s*용품|소설책|만년필|다이어리|색연필/iu],
  ['꽃·원예',/꽃다발|꽃\s*배달|화분|원예\s*(?:용품|도구)|모종|몬스테라/iu],
  ['취미·공예',/공예\s*(?:키트|재료|용품)|뜨개질|뜨개\s*키트|자수\s*키트|비즈\s*공예/iu],
  ['홈패브릭',/홈\s*패브릭|암막\s*커튼|침구|이불|베개\s*커버|러그/iu],
  ['선물·답례품',/답례품|(?:명절|기업|결혼)\s*선물\s*세트/iu],
  ['농축수산물',/농축수산물|산지\s*직송|생물\s*(?:새우|오징어)|제철\s*(?:과일|채소|수산물)|농산물|축산물|수산물/iu],
  ['밀키트·간편식',/밀키트|간편식|즉석\s*식품/iu],
  ['디지털 콘텐츠',/전자책|템플릿\s*다운로드|유료\s*(?:PDF|디지털\s*콘텐츠)|디지털\s*파일/iu],
  ['산업재·도매',/산업재|공구\s*도매|(?:산업용|공업용)\s*(?:자재|부품)|대량\s*납품/iu],
];

// These are merchandise names, not brands, sales channels or merchant-wide rankings.
const itemGroups=[
  ['셔츠','바지|청바지','원피스','후드티'], ['선크림|선블록','립스틱','샴푸','토너','로션'],
  ['원두','드립백','커피캡슐','녹차','홍차','주스'],['비타민','유산균','오메가3'],
  ['프라이팬|후라이팬','밀폐용기','조리도구'],['책장','책상','소파|쇼파','소파커버|쇼파커버','식탁','수납장'],
  ['냉장고','세탁기','노트북','이어폰','에어컨','냉장고자석','냉장고필터','세탁기커버','노트북파우치'],['유모차','카시트','젖병','기저귀','장난감'],
  ['사료','고양이모래','하네스','캣타워'],['테니스라켓','골프채','캠핑텐트'],
  ['러닝화|런닝화','백팩','핸드백','구두'],['목걸이','귀걸이','반지','손목시계'],
  ['블랙박스','차량용매트','차량용거치대'],['소설책','만년필','색연필','다이어리'],
  ['꽃다발','화분','모종'],['뜨개질키트|뜨개키트','자수키트'],['커튼','이불','러그'],
  ['결혼답례품','돌잔치답례품'],['사과','새우','오징어'],['밀키트','간편식'],
  ['전자책','디지털템플릿|템플릿다운로드'],['공구','산업용부품'],['교재','문제집'],['멸균기','치과용의자'],
] as const;
const primaryEquipment=new Set(['냉장고','세탁기','에어컨','이어폰','노트북','소파','쇼파','카시트','유모차']);
const merchandise=itemGroups.flat().map(group=>{
  const names=group.split('|');
  const pattern=new RegExp(names.map(name=>primaryEquipment.has(name)?name+'(?!(?:전용|호환|용)?(?:커버|필터|자석|케이스|파우치|정리함|받침대))':name).join('|'),'iu');
  return {label:names[0],names,pattern};
});

export function retailItems(identity:string,products:OwnProductSource[],url:string):string[]{
  const source=productEvidence(products,url).map(p=>p.name);
  const values=(source.length?source:[identity]).map(v=>classificationText(v).replace(/\s/gu,''));
  return merchandise.filter(item=>values.some(value=>item.pattern.test(value))).map(item=>item.label).slice(0,24);
}

function productEvidence(products:OwnProductSource[],url:string){
  const same=products.filter(item=>sameSite(item.url,url));
  const current=same.filter(item=>item.url===url&&item.kind!=='catalog_product');
  return current.length?current:same;
}

export function verifiedRetailCollection(data:Partial<ExtractedWebsiteData>&{url:string}){
  const url=data.finalUrl||data.url;
  if(!purposeSchemaTypes(data).includes('CollectionPage'))return false;
  const headings=[...(data.h1||[]),data.title||''].join(' ');
  const role=ownBusinessRole({title:headings});
  if(role&&role!=='retail')return false;
  const products=(data.productDiscovery?.sources||[]).filter(p=>p.kind==='structured_product'&&p.url!==url&&sameSite(p.url,url));
  if(new Set(products.map(p=>p.url)).size<2)return false;
  const headingItems=retailItems(headings,[],url);
  return retailItems('',products,url).some(item=>headingItems.includes(item));
}

export function retailSubscriptionAction(text:string){
  return !/뉴스레터|소식|알림|재입고|이메일|메일링|newsletter|해지|취소|변경|관리|해제/iu.test(text)
    && /구독|정기\s*(?:배송|결제)\s*(?:신청|시작)|subscribe/iu.test(text)
    && !/불가|준비\s*중|예정|마감/u.test(text);
}

const formats:[string,RegExp][]=[
  ['해외직구',/해외\s*직구|해외\s*구매대행/iu],
  ['정기구독',/정기\s*(?:구독|배송|결제)|구독\s*(?:커머스|상품|배송)/iu],
];

export function retailFamilies(identity:string,products:OwnProductSource[],url:string):string[]{
  const retailText=(text:string)=>classificationText(text).replace(/건강\s*(?:기능\s*)?식품/gu,'영양제');
  const primary=retailText(identity);
  const items=productEvidence(products,url).map(item=>retailText([item.name,...item.categories].join(' ')));
  const catalog=families.filter(([,pattern])=>items.some(item=>pattern.test(item)));
  return (catalog.length?catalog:families.filter(([,pattern])=>pattern.test(primary))).map(([label])=>label);
}

export function retailFormats(identity:string):string[]{
  const primary=classificationText(identity);
  const merchandiseOnly=primary.replace(/(?:뉴스레터|메일링|이메일|소식지)\s*(?:정기\s*)?구독|정기\s*구독\s*(?:뉴스레터|메일링|소식지)/giu,' ');
  return formats.filter(([label,pattern])=>marketingExpressions(label==='정기구독'?merchandiseOnly:primary,pattern).matches.length>0).map(([label])=>label);
}

export function retailSearchTerms(text:string,selected:string[]):string[]{
  const compact=text.replace(/\s/gu,'');
  const items=merchandise.filter(item=>selected.includes(item.label)).flatMap(item=>item.names.filter(name=>compact.includes(name)));
  const general=[...families,...formats].filter(([label])=>selected.includes(label))
    .flatMap(([,pattern])=>[...text.matchAll(new RegExp(pattern.source,pattern.flags+'g'))].map(match=>match[0]));
  return [...new Set([...items,...general])];
}
