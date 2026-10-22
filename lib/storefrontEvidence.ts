import type {ExtractedWebsiteData} from './extractWebsite';

export type StorefrontObservation={ids:string[];label:string;match:RegExp;observation:string;guide:string};

/** A public catalog establishes products, not the rendered checkout, reviews or prices. */
export function storefrontObservations(data:ExtractedWebsiteData):StorefrontObservation[]{
  if(data.productContext?.status!=='observed'||!data.productContext.sources.length||
    !(data.productContext.discovery==='public_catalog'||data.isJsHeavy))return [];
  const checks=[
    {ids:['h1'],label:'대표 제목',match:/H1|대표.?제목|헤드라인/i,present:data.h1.length>0,
      observation:'수집한 HTML에서 H1 텍스트를 확인하지 못했습니다.',guide:'실제 화면의 대표 제목과 렌더링 후 H1 구조를 확인하세요. 대표 제목이 없거나 페이지 주제가 불명확한 경우에만 제목을 보완하세요.'},
    {ids:['cta_clarity','cta_repeat'],label:'구매·신청 버튼',match:/CTA|구매.?버튼|구매하기|행동.?유도|전환.?유도/i,present:data.ctaButtons.length>0,
      observation:'수집한 HTML에서 주요 구매·신청 버튼을 확인하지 못했습니다.',guide:'실제 상품 화면에서 구매 버튼의 문구·위치·클릭 후 이동을 확인하세요. 버튼이 없거나 다음 행동이 불명확한 경우에만 보완하세요.'},
    {ids:['trust_review'],label:'후기·리뷰',match:/후기|리뷰|별점/,present:data.hasReviewKeyword,
      observation:'수집한 HTML에서 후기·리뷰 문구를 확인하지 못했습니다.',guide:'실제 상품 상세의 후기·별점 영역을 확인하세요. 후기가 없거나 구매자가 찾기 어려운 경우에만 공개 가능한 실제 후기를 보완하세요.'},
    {ids:['trust_certification'],label:'인증·검증 정보',match:/인증|검증.?자료/,present:data.hasTrustKeyword,
      observation:'수집한 HTML에서 인증·검증 문구를 확인하지 못했습니다.',guide:'실제 상품 상세에서 적용되는 인증과 확인 자료를 대조하세요. 해당 상품에 필요한 근거가 누락된 경우에만 보완하며 인증이나 효능을 추측해 넣지 마세요.'},
    {ids:['price_info'],label:'가격·구매 조건',match:/가격|견적|금액|비용/,present:data.hasPriceKeyword,
      observation:'수집한 HTML과 상품명 표본으로 가격 표시 여부를 확인하지 못했습니다.',guide:'실제 상품 상세에서 판매가·옵션·배송비·추가 비용을 확인하세요. 구매 조건이 표시되지 않거나 불명확한 경우에만 보완하세요.'},
    {ids:['contact_info'],label:'문의·연락처',match:/연락처|고객센터|문의.?정보/,present:data.hasContactInfo,
      observation:'수집한 HTML에서 문의·연락처 정보를 확인하지 못했습니다.',guide:'실제 화면의 고객센터·문의 경로를 확인하세요. 이용 가능한 문의 경로가 없거나 찾기 어려운 경우에만 보완하세요.'},
  ];
  return checks.filter(c=>!c.present).map(({present,...check})=>check);
}

export const STOREFRONT_SCOPE_NOTE='판매 상품은 공개 목록에서 확인했습니다. 가격·후기·구매 버튼 등 동적으로 표시되는 항목은 자동 수집되지 않을 수 있어, 미확인을 실제 부재로 판정하지 않습니다. 점수는 수집 자료에 대한 AI 평가이며 실제 구매 화면의 사용성을 실측한 결과가 아닙니다.';
