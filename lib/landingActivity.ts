export type LandingActivity = {
  requested: number;
  completed: number;
  recent: string[];
  checkedAt: number;
};

export type LandingCard = {
  id: string;
  kind: 'tip' | 'review';
  title: string;
  text: string;
  byline?: string;
  sourceUrl?: string;
};

export const landingTips: LandingCard[] = [
  {id:'tip-search',kind:'tip',title:'검색 결과에서 첫인상이 어떻게 보이는지 확인하세요',text:'페이지 제목과 설명에 실제 서비스와 대상 고객이 드러나는지 살펴보세요. 검색 결과에서 이해하기 어려운 문장부터 손볼 수 있습니다.'},
  {id:'tip-compare',kind:'tip',title:'같은 고객을 두고 경쟁하는 사이트부터 비교하세요',text:'경쟁사와 내 사이트의 첫 화면을 나란히 보세요. 가격, 상담 조건, 배송 정보처럼 고객이 결정하기 전에 찾는 정보가 어디에 있는지 확인할 수 있습니다.'},
  {id:'tip-rewrite',kind:'tip',title:'보고서에서 먼저 바꿀 문장 하나를 고르세요',text:'첫 화면에 서비스 범위가 드러나지 않는다면 대표 문장부터 바꿔보세요. 모바일에서 문장과 문의 버튼이 한눈에 들어오는지도 함께 확인하세요.'},
  {id:'tip-evidence',kind:'tip',title:'AI가 답할 수 있도록 질문과 근거를 붙여보세요',text:'고객이 자주 묻는 질문을 골라 답변 바로 아래에 확인할 수 있는 서비스 조건이나 근거 페이지를 연결해 보세요.'},
];

export function firstLandingCard(cards: LandingCard[], previousId: string | null, random = Math.random) {
  const choices = cards.filter(card => card.id !== previousId);
  return (choices[Math.floor(random() * choices.length)] ?? cards[0]).id;
}
