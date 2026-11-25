import type { BusinessProfile } from './businessContext';
import type { OwnProductSource } from './ownProductSchema';
import { sameSite } from './siteIdentity';
import { classificationText } from './websiteIdentity';

export const hairGoodsTopic = /헤어\s*피스|가발|붙임머리|\b(?:hair\s*pieces?|wigs?)\b/i;
const storeIdentity = /전문\s*몰|쇼핑몰|공식몰|자사몰|온라인\s*(?:몰|스토어|판매)|(?:가발|헤어\s*피스)\s*(?:전문\s*)?판매(?:점|합니다|하는)|\b(?:shop|store)\b/i;
const purchaseAction = /장바구니|바로\s*구매|구매하기|주문하기|add to cart|buy now/i;

export function hairGoodsProducts(sources: OwnProductSource[], url: string) {
  return sources.filter(product => sameSite(product.url, url) && hairGoodsTopic.test(product.name));
}

export function hairGoodsIdentity(url: string, headings: string, primary: string, products: OwnProductSource[], actions: string[]) {
  const headline = classificationText(headings);
  if (!hairGoodsTopic.test(primary) || /탈모\s*클리닉|모발\s*이식\s*(?:병원|센터)|미용실|헤어샵|가발\s*학원/.test(headline)) {
    return false;
  }
  try {
    if (/(?:^|\/)(?:article|board|blog|magazine|community)(?:\/|[.]|$)/i.test(new URL(url).pathname)) return false;
  } catch { return false; }
  if (hairGoodsTopic.test(headline) && storeIdentity.test(headline)) return true;
  if (hairGoodsTopic.test(headline) && /구매\s*가이드|착용\s*가이드|칼럼|비교\s*후기/.test(headline) && products.length === 0) {
    return false;
  }
  return products.length > 0 || (hairGoodsTopic.test(headline) && actions.some(text => purchaseAction.test(text)));
}

export const hairGoodsFacets: [string, RegExp][] = [
  ['헤어피스', /헤어\s*피스|붙임머리|똑딱이\s*피스|\bhair\s*pieces?\b/i],
  ['부분가발', /부분\s*가발|앞머리\s*가발|포니테일\s*가발|정수리\s*가발|탑\s*커버|\b(?:hair\s*topper|top\s*cover)\b/i],
  ['통가발·반가발', /통\s*가발|반\s*가발|패션\s*가발|\b(?:full|half)\s*wigs?\b/i],
];

export const hairGoodsProfile: BusinessProfile = {
  label: '가발·헤어피스 전문 쇼핑몰',
  industry: 'ecommerce',
  kind: 'commerce',
  goalKey: 'purchase',
  goalLabel: '헤어피스·가발의 옵션 선택과 구매',
  keywords: ['똑딱이 헤어피스', '인모 헤어피스', '헤어피스', '여성 패션가발', '부분가발', '앞머리가발', '포니테일가발', '반가발', '통가발', '가발'],
  caution: '숱 보충·길이 연장·앞머리·포니테일·웨딩 등 고객의 목적에 맞는 분류나 실제 상품 상세로 유입을 연결한다. 인모·고열사 소재, 길이·폭·피스 수·색상 선택, 착용과 관리, 배송·교환·A/S는 상품별 원문을 대조한다. 색상표 신청은 구매 전 행동으로, 실제 주문 완료는 구매 전환으로 분리한다. 후기 사진이나 광고 문구를 흡수해 소재 비율·내열 온도·착용 결과·반품 가능 여부·광고 성과를 전체 상품에 적용하지 않는다.',
  checks: [
    { id: 'hair-type', label: '숱·길이·볼륨별 상품 탐색', match: /숱\s*보충|길이\s*연장|볼륨업|앞머리\s*가발|포니테일\s*가발|반가발|통가발/, guide: '숱 보충, 길이 연장, 앞머리·포니테일을 고르는 링크가 각각 해당 상품군으로 이어지는지 확인하세요. 데일리·촬영·웨딩 용도의 광고는 해당하는 실제 카테고리나 상품 상세로 연결하세요.' },
    { id: 'hair-options', label: '인모·고열사와 길이·사이즈·피스 수', match: /인모|고열사|합성모|피스\s*수|\d\s*(?:cm|피스)|헤어피스.{0,24}사이즈/i, guide: '인모·고열사 등 실제 소재, 실측 길이와 폭, 피스·클립 수, 옵션별 추가금과 구성품을 상세페이지에서 나란히 보여 주세요. 한 상품의 소재나 수량을 다른 옵션에 적용하지 마세요.' },
    { id: 'hair-color', label: '컬러차트·색상 옵션과 착용 근거', match: /(?:컬러|칼라|색상)\s*(?:차트|표|샘플|옵션|비교)|내[츄추]럴\s*(?:블랙|브라운)|착용\s*(?:사진|영상|컷)|색상별\s*착용/i, guide: '해당 상품의 실제 판매 색상을 컬러차트와 착용 사진에 맞춰 주세요. 색상표를 요청할 수 있는 경우 신청 조건과 상품 옵션 선택으로 돌아오는 경로를 연결하고, 색상표 신청과 구매 완료를 구분하세요.' },
    { id: 'hair-care', label: '착용 방법·열기구 사용·세척 관리', match: /착용\s*(?:방법|법|가이드)|열기구|고데기|세척|세정|보관\s*(?:방법|법)|관리\s*가이드|클립\s*고정/, guide: '부착 위치, 클립 고정과 분리, 세척·보관 방법을 모델별로 설명하세요. 열기구 사용 가능 여부나 내열 기준을 안내할 때는 해당 제품의 공식 설명과 일치하는지 확인하세요.' },
    { id: 'hair-policy', label: '배송·교환·반품 및 A/S 조건', match: /배송\s*(?:비|기간|교환|안내)|교환|반품|개봉|택\s*제거|A\s*\/\s*S|사후\s*관리/i, guide: '개봉·착용·가공·택 제거에 따라 달라지는 실제 교환·반품 조건, 비용과 접수 방법을 상품 상세와 이용 안내에서 대조하세요. 제품마다 다른 배송과 A/S 범위를 하나의 공통 정책으로 표현하지 마세요.' },
    { id: 'hair-checkout', label: '상품 상세→옵션 선택→구매 전환', match: /장바구니|바로\s*구매|구매하기|결제하기|옵션\s*선택|판매가|상품\s*상세/, guide: '모바일에서 광고 상품과 상세페이지의 소재·색상·길이·가격이 같은지 확인하고 옵션 선택부터 구매 완료까지 검수하세요. 상세 조회·장바구니·실제 결제를 구분하되 광고 계정의 이벤트 수신이나 구매 성과는 별도로 확인하세요.' },
  ],
  questions: [
    { intent: 'choice', question: '숱 보충이나 길이 연장에는 어떤 헤어피스가 맞고, 인모와 고열사는 어떻게 다른가요?', fields: ['사용 목적별 권장 형태', '상품별 소재·길이·피스 수'], match: /숱\s*보충|길이\s*연장|인모|고열사|부분가발|피스\s*수/, placement: '고민별 상품 목록과 대표 상품의 옵션 선택 앞' },
    { intent: 'proof', question: '내 머리색에 맞는 헤어피스 색상은 컬러차트와 착용 사진에서 어떻게 비교하나요?', fields: ['실제 판매 색상과 착용 기준', '컬러차트 확인 또는 신청 방법'], match: /(?:컬러|칼라|색상)\s*(?:차트|표|비교)|착용\s*(?:사진|영상|컷)/, placement: '상품의 색상 선택 메뉴와 컬러차트 안내 옆' },
    { intent: 'care', question: '가발과 헤어피스는 어떻게 착용하고, 열기구 사용이나 세척은 어떻게 확인하나요?', fields: ['제품별 착용·분리 방법', '열기구 가능 여부와 세척·보관 기준'], match: /착용\s*(?:방법|법|가이드)|열기구|고데기|세척|보관\s*(?:방법|법)/, placement: '상품 상세의 착용 영상·관리 안내' },
    { intent: 'delivery', question: '가발·헤어피스를 개봉하거나 착용한 뒤 교환·반품할 수 있는 조건은 어디에서 확인하나요?', fields: ['상태별 교환·반품 조건', '비용·접수 방법과 A/S 범위'], match: /교환|반품|개봉|택\s*제거|A\s*\/\s*S/i, placement: '상품별 배송·교환·반품 안내와 결제 버튼 주변' },
  ],
};
