export type LandingActivity = {
  requested: number;
  completed: number;
  recent: string[];
  checkedAt: number;
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

const reviewExamples: LandingCard[] = [
  {
    id:'example-beauty',
    kind:'example',
    industry:'뷰티 쇼핑몰',
    title:'경쟁몰과 첫 화면을 바로 비교할 수 있어서 좋았어요.',
    text:'사용법과 피부 타입 안내를 고객이 어디서 처음 보는지 비교하니, 상세페이지에서 어떤 정보를 먼저 보여줄지 정하기 쉬웠어요.',
  },
  {
    id:'example-clinic',
    kind:'example',
    industry:'병의원',
    title:'처음 방문하는 환자가 어디서 헤맬지 보였어요.',
    text:'진료 안내와 예약 버튼을 한 흐름으로 확인하니까, 첫 화면에 어떤 안내를 먼저 넣어야 할지 팀과 얘기하기 편했어요.',
  },
  {
    id:'example-property',
    kind:'example',
    industry:'아파트 분양',
    title:'상담 신청 전에 빠진 정보가 보여서 좋았어요.',
    text:'입지와 교통 안내를 어디에 두고, 상담 신청 버튼 앞에 어떤 내용을 보여줄지 정리하는 데 도움이 됐어요.',
  },
  {
    id:'example-education',
    kind:'example',
    industry:'교육 서비스',
    title:'수강생이 궁금해할 질문이 구체적이라 좋았어요.',
    text:'수강 대상, 일정, 신청 절차를 처음 보는 사람 기준으로 확인하니까 자주 받는 문의부터 안내 페이지에 반영하기 쉬웠어요.',
  },
  {
    id:'example-b2b',
    kind:'example',
    industry:'B2B 서비스',
    title:'회사 소개에서 어떤 문장부터 바꿀지 잡혔어요.',
    text:'누구에게 어떤 서비스를 제공하는지 첫 문장에서 드러나는지 점검한 게 좋았어요. 보고서의 수정 문장 예시로 팀에서 바로 논의할 수 있었어요.',
  },
];

export function landingCards(reviews: LandingCard[]) {
  return reviews.length >= 2 ? reviews : [...reviews, ...reviewExamples];
}

export function firstLandingCard(cards: LandingCard[], previousId: string | null, random = Math.random) {
  const choices = cards.filter(card => card.id !== previousId);
  return (choices[Math.floor(random() * choices.length)] ?? cards[0]).id;
}
