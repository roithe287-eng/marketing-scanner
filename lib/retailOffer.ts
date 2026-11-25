import type {OwnProductSource} from './ownProductSchema';
import {sameSite} from './siteIdentity';
import {classificationText} from './websiteIdentity';

const families:[string,RegExp][]=[
  ['의료기기·병원용품',/의료\s*기기|의료\s*장비|(?:치과|병원|진료)\s*(?:용\s*)?(?:장비|소모품|기기|의자)|멸균기/iu],
  ['반려동물 용품',/(?:반려동물|반려견|강아지|고양이|애견)\s*(?:용품|사료|간식|모래|하네스)|캣타워/iu],
  ['교재·학습용품',/교재|학습지|문제집|참고서|학습\s*키트|코딩\s*키트/iu],
  ['가구·리빙',/가구|홈데코|수납장|책상|소파|거실\s*조명/iu],
  ['화장품·뷰티용품',/화장품|스킨케어|선크림|마스카라|립스틱|네일\s*(?:제품|용품|폴리시)/iu],
  ['건강식품·영양제',/건강\s*(?:기능\s*)?식품|영양제|종합비타민|비타민|유산균|오메가\s*[36]/iu],
  ['식품·음료',/(?<![\p{L}])식품(?!의약품)|식재료|원두|커피\s*캡슐|디저트\s*(?:세트|판매)|과자|과일\s*주스/iu],
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

const formats:[string,RegExp][]=[
  ['해외직구',/해외\s*직구|해외\s*구매대행/iu],
  ['정기구독',/정기\s*(?:구독|배송|결제)|구독\s*(?:커머스|상품|배송)/iu],
];

export function retailFamilies(identity:string,products:OwnProductSource[],url:string):string[]{
  const retailText=(text:string)=>classificationText(text).replace(/건강\s*(?:기능\s*)?식품/gu,'영양제');
  const primary=retailText(identity);
  const items=products.filter(item=>sameSite(item.url,url)).map(item=>retailText([item.name,...item.categories].join(' ')));
  const catalog=families.filter(([,pattern])=>items.some(item=>pattern.test(item)));
  return (catalog.length?catalog:families.filter(([,pattern])=>pattern.test(primary))).map(([label])=>label);
}

export function retailFormats(identity:string):string[]{
  const primary=classificationText(identity);
  return formats.filter(([,pattern])=>pattern.test(primary)).map(([label])=>label);
}

export function retailSearchTerms(text:string,selected:string[]):string[]{
  return [...families,...formats].filter(([label])=>selected.includes(label))
    .flatMap(([,pattern])=>[...text.matchAll(new RegExp(pattern.source,pattern.flags+'g'))].map(match=>match[0]));
}
