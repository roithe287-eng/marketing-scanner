import type {ExtractedWebsiteData} from './extractWebsite';

export type StorefrontObservation={ids:string[];label:string;match:RegExp;observation:string;guide:string};

/** Supplemental products and incomplete dynamic HTML cannot establish rendered feature absence. */
export function storefrontObservations(data:ExtractedWebsiteData):StorefrontObservation[]{
  if(!data.productContext||!(data.productContext.sources.length||data.isJsHeavy||data.productDiscovery?.commerce||data.productDiscovery?.sparse))return [];
  const checks=[
    {ids:['product_info','product_description'],label:'상품·서비스 정보 수집 범위',match:/(?:상품|제품|판매.?품목).{0,10}(?:부재|없|불명확|정보.{0,4}부족|확인.{0,3}불가)/,
      present:false,observation:data.productContext.sources.length?`공개 원문에서 상품 표본 ${data.productContext.sources.length}개를 확인했습니다. 전체 상품·상세 설명을 수집한 결과는 아닙니다.`:'수집 자료에서 상품·서비스 상세의 전체 내용을 확인하지 못했습니다.',
      guide:'실제 상품·서비스 상세에서 설명의 유무와 내용을 대조하세요. 판매 품목이 없거나 사이트 전체의 정보가 부족하다고 단정하지 말고, 누락이 확인된 경우에만 해당 내용을 보완하세요.'},
    {ids:['h1'],label:'대표 제목',match:/H1|대표.?제목|헤드라인/i,present:data.h1.length>0,
      observation:'수집한 HTML에서 H1 텍스트를 확인하지 못했습니다.',guide:'실제 화면의 대표 제목과 렌더링 후 H1 구조를 확인하세요. 대표 제목이 없거나 페이지 주제가 불명확한 경우에만 제목을 보완하세요.'},
    {ids:['cta_clarity','cta_repeat'],label:'구매·신청 버튼',match:/CTA|구매.?버튼|구매하기|행동.?유도|전환.?유도/i,present:data.ctaButtons.length>0,
      observation:'수집한 HTML에서 주요 구매·신청 버튼을 확인하지 못했습니다.',guide:'실제 페이지에서 구매·신청 버튼의 문구·위치·클릭 후 이동을 확인하세요. 버튼이 없거나 다음 행동이 불명확한 경우에만 보완하세요.'},
    {ids:['trust_review'],label:'후기·리뷰',match:/후기|리뷰|별점/,present:data.hasReviewKeyword,
      observation:'수집한 HTML에서 후기·리뷰 문구를 확인하지 못했습니다.',guide:'실제 상세 페이지의 후기·사례 영역을 확인하세요. 후기가 없거나 이용자가 찾기 어려운 경우에만 공개 가능한 실제 후기를 보완하세요.'},
    {ids:['trust_certification'],label:'인증·검증 정보',match:/인증|검증.?자료/,present:data.hasTrustKeyword,
      observation:'수집한 HTML에서 인증·검증 문구를 확인하지 못했습니다.',guide:'실제 상세 페이지에서 적용되는 인증과 확인 자료를 대조하세요. 필요한 근거가 누락된 경우에만 보완하며 인증이나 효능을 추측해 넣지 마세요.'},
    {ids:['price_info'],label:'가격·구매 조건',match:/가격|견적|금액|비용/,present:data.hasPriceKeyword,
      observation:'수집한 HTML만으로 실제 가격 표시 여부를 확인하지 못했습니다.',guide:'실제 상세 페이지에서 가격·옵션·배송비·추가 비용을 확인하세요. 이용 조건이 표시되지 않거나 불명확한 경우에만 보완하세요.'},
    {ids:['contact_info'],label:'문의·연락처',match:/연락처|고객센터|문의.?정보/,present:data.hasContactInfo,
      observation:'수집한 HTML에서 문의·연락처 정보를 확인하지 못했습니다.',guide:'실제 화면의 고객센터·문의 경로를 확인하세요. 이용 가능한 문의 경로가 없거나 찾기 어려운 경우에만 보완하세요.'},
  ];
  return checks.filter(c=>!c.present).map(({present,...check})=>check);
}

export const STOREFRONT_SCOPE_NOTE='상품 표본은 공개 원문에서 확인했습니다. 가격·후기·구매 버튼 등 동적으로 표시되는 항목은 자동 수집되지 않을 수 있어, 미확인을 실제 부재로 판정하지 않습니다. 점수는 수집 자료에 대한 AI 평가이며 실제 구매 화면의 사용성을 실측한 결과가 아닙니다.';

export function storefrontScopeNote(data:ExtractedWebsiteData):string{
  return data.productContext?.sources.length?STOREFRONT_SCOPE_NOTE:'수집한 HTML에서 동적으로 표시되는 항목을 확인하지 못할 수 있습니다. 미확인을 실제 부재나 사이트 전체의 정보 부족으로 판정하지 않습니다. 실제 페이지·상품·서비스 상세를 대조한 뒤 보완 여부를 판단해야 합니다.';
}
