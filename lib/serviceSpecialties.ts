import {classificationText,offeringClauses} from './websiteIdentity';

const insurance:[string,RegExp][]=[
  ['자동차·운전자보험',/(?:자동차|운전자|차량)\s*보험/u],
  ['건강·실손보험',/(?:암|실손|실비|건강|치아|간병)\s*보험/u],
  ['종신·정기보험',/(?:종신|정기|생명)\s*보험/u],
  ['여행자보험',/여행자\s*보험|여행\s*보험/u],
  ['기업·배상책임보험',/(?:기업|사업장|배상\s*책임)\s*보험/u],
];
const travel:[string,RegExp][]=[
  ['국내 여행',/국내\s*(?:패키지|여행|투어)|제주\s*(?:단체\s*)?(?:패키지|여행|투어)/u],
  ['해외 여행',/해외\s*(?:패키지|여행|투어)|(?:일본|유럽|동남아|미주)\s*(?:패키지|가이드\s*투어)/u],
  ['항공권 발권',/항공권\s*(?:예약|발권|예매|판매)|(?:국내선|국제선)\s*발권/u],
  ['숙박 예약 중개',/숙박\s*(?:예약\s*(?:중개|대행|플랫폼)|중개)|호텔\s*예약\s*(?:플랫폼|대행|중개)/u],
];
const law:[string,RegExp][]=[
  ['이혼·가사',/이혼|가사\s*(?:분쟁|소송|사건)|친권|양육권/u],
  ['상속·유언',/상속|유언|유류분/u],
  ['형사 사건',/형사\s*(?:변호|사건|소송|전문|상담)|수사\s*대응/u],
  ['기업 자문·계약',/기업\s*(?:법무|자문)|계약서\s*(?:검토|작성)|기업\s*인수합병/u],
  ['개인회생·파산',/개인\s*(?:회생|파산)|채무\s*조정/u],
  ['부동산·임대차 분쟁',/(?:임대차|부동산)\s*(?:분쟁|소송)|명도\s*소송/u],
];
const rules:Record<string,[string,RegExp][]>= {
  insurance,travel,travel_booking:travel,legal:law,rehabilitation:law,
  international_logistics:[
    ['해외·귀국 이사',/해외\s*이사|귀국\s*이사|국제\s*이삿짐|international\s*(?:moving|relocation)/iu],
    ['기업 화물·포워딩',/포워딩|기업\s*화물|해상\s*화물|항공\s*화물|freight\s*forwarding/iu],
  ],
  software:[
    ['업무·회계 ERP',/\bERP\b|회계\s*(?:프로그램|시스템|소프트웨어|솔루션)|전사\s*자원\s*관리/iu],
    ['예약·접수 시스템',/예약\s*(?:관리|시스템|프로그램|솔루션)|환자\s*관리|진료\s*접수\s*(?:시스템|프로그램)/iu],
    ['교육 운영 LMS',/\bLMS\b|학습\s*관리\s*(?:시스템|솔루션)|학원\s*관리\s*(?:프로그램|시스템)/iu],
    ['쇼핑몰·주문 관리',/쇼핑몰\s*관리|주문\s*(?:통합\s*)?관리\s*(?:시스템|솔루션)|쇼핑몰\s*CRM/iu],
    ['마케팅 자동화',/마케팅\s*자동화|캠페인\s*자동화|광고\s*운영\s*자동화/u],
  ],
};

export function serviceSpecialties(profile:string,identity:string,body=''):string[]{
  const options=rules[profile];
  if(!options)return [];
  const statement=offeringClauses(body).filter(line=>!/(?:사례|후기|비교|타사|제휴|고객사|연동|호환|유의사항|보장\s*제외)/u.test(line)&&/(?:운영|판매|수행|설계|발권|대행|진행|제공|개발|취급|중개|상담|지원|전문)(?:합니다|하고\s*있습니다|해\s*드립니다|합니다만|하는\s*(?:업체|회사|서비스))|주요\s*(?:업무|서비스)\s*[:：]/u.test(line)).join('\n');
  const text=classificationText([identity,statement].join('\n'));
  return options.filter(([,pattern])=>pattern.test(text)).map(([name])=>name);
}
