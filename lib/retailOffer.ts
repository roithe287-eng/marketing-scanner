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
  ['식품·음료',/(?<!건강)(?<!기능)식품|식재료|밀키트|냉동식품|원두|커피\s*캡슐|디저트\s*(?:세트|판매)/iu],
  ['스포츠용품',/(?:스포츠|골프|헬스|스키|수영|테니스|캠핑)\s*(?:용품|장비)|골프채|테니스\s*라켓/iu],
  ['자동차용품',/(?:차량|자동차)\s*(?:용품|부품|액세서리)|블랙박스|차량용\s*(?:매트|거치대)/iu],
];

export function retailFamilies(identity:string,products:OwnProductSource[],url:string):string[]{
  const primary=classificationText(identity);
  const items=products.filter(item=>sameSite(item.url,url)).map(item=>classificationText([item.name,...item.categories].join(' ')));
  const catalog=families.filter(([,pattern])=>items.some(item=>pattern.test(item)));
  return (catalog.length?catalog:families.filter(([,pattern])=>pattern.test(primary))).map(([label])=>label);
}
