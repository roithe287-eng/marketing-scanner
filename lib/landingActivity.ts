export type LandingActivity = {
  requested: number;
  completed: number;
};

export type LandingCard = {
  id: string;
  kind: 'example' | 'review';
  title: string;
  text: string;
  industry?: string;
  byline?: string;
  sourceUrl?: string;
};

const reviewExamples = [
  {id:'beauty', industry:'뷰티 쇼핑몰', quotes:[
    ['경쟁몰과 첫 화면을 바로 비교해서 좋았어요.', '피부 타입과 사용법 중 무엇을 먼저 보여줄지 정했어요.'],
    ['제품 설명에서 비어 있는 부분이 바로 보였어요.', '성분 설명 옆에 사용 순서와 사용량을 넣기로 했어요.'],
  ]},
  {id:'clinic', industry:'병의원', quotes:[
    ['첫 방문 환자가 어디서 헤맬지 보였어요.', '진료 안내와 예약 버튼을 한 흐름으로 점검했어요.'],
    ['예약 전에 필요한 안내부터 정리할 수 있었어요.', '진료 시간, 주차, 준비물을 찾기 쉬운 위치에 모았어요.'],
  ]},
  {id:'property', industry:'아파트 분양', quotes:[
    ['상담 신청 전에 빠진 정보가 보여서 좋았어요.', '교통과 입지 설명을 상담 버튼 앞에 배치하기로 했어요.'],
    ['분양 페이지에서 뭘 먼저 보여줄지 선명해졌어요.', '타입별 평면과 방문 예약 안내의 순서를 잡았어요.'],
  ]},
  {id:'education', industry:'교육 서비스', quotes:[
    ['수강생이 궁금해할 질문이 구체적이라 좋았어요.', '수강 대상과 일정을 신청 전에 확인할 수 있게 했어요.'],
    ['과정 소개에서 바꿀 문장이 바로 잡혔어요.', '선수 지식과 수업 결과물을 첫 화면에 써 넣었어요.'],
  ]},
  {id:'b2b', industry:'B2B 서비스', quotes:[
    ['회사 소개에서 어떤 문장부터 바꿀지 잡혔어요.', '고객 업종과 제공 범위를 첫 문장에 드러냈어요.'],
    ['견적 문의까지 어디서 막히는지 확인했어요.', '미팅 전에 필요한 자료를 문의 양식 앞에 정리했어요.'],
  ]},
  {id:'law', industry:'법률 서비스', quotes:[
    ['상담 절차를 어디에 넣을지 정하기 쉬웠어요.', '담당 업무와 상담 준비 자료를 같은 흐름으로 묶었어요.'],
    ['분야별 소개가 첫 화면에서 잘 구분됐어요.', '방문자가 자신의 상담 분야를 찾는 경로를 정리했어요.'],
  ]},
  {id:'food', industry:'외식 매장', quotes:[
    ['방문 전에 손님이 찾는 정보가 한눈에 보였어요.', '메뉴와 영업시간, 주차 안내의 위치를 정리했어요.'],
    ['예약과 길 찾기 버튼을 비교한 게 좋았어요.', '모바일 첫 화면에서 예약과 위치를 바로 찾게 했어요.'],
  ]},
  {id:'franchise', industry:'프랜차이즈', quotes:[
    ['창업 문의 전에 보여줄 내용이 정리됐어요.', '초기 비용의 포함 항목과 지원 범위를 구분했어요.'],
    ['가맹 절차 설명에서 막히는 구간이 보였어요.', '문의, 상담, 입지 검토의 순서를 단계별로 안내했어요.'],
  ]},
  {id:'travel', industry:'여행·숙박', quotes:[
    ['객실을 고르기 전에 필요한 정보가 보였어요.', '객실 인원, 요금 조건, 체크인 시간을 먼저 정리했어요.'],
    ['예약 전에 확인할 조건이 명확해졌어요.', '취소 규정과 요금에 포함된 내용을 예약 앞에 뒀어요.'],
  ]},
  {id:'pet', industry:'반려동물', quotes:[
    ['반려동물 조건별로 안내할 내용이 잡혔어요.', '이용 가능한 체중과 돌봄 범위를 첫 화면에 적었어요.'],
    ['첫 이용 전에 자주 묻는 질문을 짚어줘서 좋았어요.', '준비물과 맡길 수 있는 시간을 예약 앞에 모았어요.'],
  ]},
  {id:'rental', industry:'스키 렌탈', quotes:[
    ['장비 요금과 대여 조건을 바로 비교할 수 있었어요.', '장비와 의류 가격을 구분해 시즌 페이지에 넣었어요.'],
    ['현장 방문 전에 확인할 정보가 정리됐어요.', '픽업 위치와 장비 반납 시간을 예약 안내에 뒀어요.'],
  ]},
  {id:'groupwear', industry:'단체복·맞춤제작', quotes:[
    ['단체 주문에서 견적이 늦어지는 이유가 보였어요.', '수량과 인쇄 위치, 희망 납기를 폼에서 바로 받게 했어요.'],
    ['디자인 확정부터 배송까지 설명하기 쉬워졌어요.', '시안 확인과 제작 기간을 주문 전 안내에 넣었어요.'],
  ]},
] as const;

export function landingCards(reviews: LandingCard[]): LandingCard[] {
  const industries = new Set<string>(reviewExamples.map(group => group.industry));
  const pairs = reviewExamples.map(group => {
    const approved = reviews.filter(review => review.industry === group.industry);
    return group.quotes.map(([title, text], index): LandingCard => approved[index] ?? {
      id: index === 0 ? `example-${group.id}` : `example-${group.id}-2`,
      kind:'example', industry:group.industry, title, text,
    });
  });
  const otherReviews = reviews.filter(review => !industries.has(review.industry ?? ''));
  return [...pairs.map(pair => pair[0]), ...pairs.map(pair => pair[1]), ...otherReviews];
}

export function firstLandingCard(cards: LandingCard[], previousId: string | null, random = Math.random) {
  const choices = cards.filter(card => card.id !== previousId);
  return (choices[Math.floor(random() * choices.length)] ?? cards[0]).id;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** 08:00 in Korea is 23:00 UTC on the previous calendar day. */
export function landingCheckWindow(now = Date.now()) {
  const start = Math.floor((now + HOUR_MS) / DAY_MS) * DAY_MS - HOUR_MS;
  return {start, next: start + DAY_MS};
}
