import {answerSources,buildAnswerContentPlan,type AnswerPageData} from '../../lib/answerContent';

/** Synthetic garment page. These numbers are test inputs, never live vendor facts. */
export const answerPage:AnswerPageData={
  url:'https://example.com/varsity',finalUrl:'https://example.com/varsity',
  title:'가상 의류 · 과잠바 맞춤 제작',description:'과잠바 제작과 단체 주문을 안내합니다.',ogDescription:'',
  h1:['과잠바 맞춤 제작'],h2:['주문 안내','제작 기간','견적 안내'],isJsHeavy:false,
  bodyText:'과잠바는 학과와 동아리의 단체 주문을 위한 맞춤 제작 의류입니다.\n과잠바 최소 주문 수량은 20벌이며, 같은 디자인에서 사이즈를 혼합할 수 있습니다.\n과잠바 제작은 최종 시안 확정 후 15영업일이 소요되며, 배송 기간은 별도입니다.\n성수기에는 제작 일정이 달라질 수 있으므로 주문 전 확인해 주세요.\n과잠바 견적은 주문 수량, 원단, 자수 위치와 크기에 따라 달라집니다.\n추가 주문은 별도 견적을 확인해야 합니다.',
};
export function answerSuggestion(){
  const pool=answerSources(answerPage);
  const id=(fragment:string)=>pool.find(p=>p.kind==='body'&&p.text.includes(fragment))!.id;
  return {primaryKeyword:'과잠바',secondaryKeywords:['맞춤 제작','단체 주문'],topicScope:'focused',questions:[
    {question:'과잠바 제작과 배송에는 얼마나 걸리나요?',intent:'delivery',evidenceIds:[id('최종 시안'),id('성수기')],missingFacts:['별도 배송 기간']},
    {question:'과잠바는 몇 벌부터 주문할 수 있나요?',intent:'minimum',evidenceIds:[id('20벌'),id('추가 주문')],missingFacts:[]},
    {question:'과잠바 제작 가격은 무엇에 따라 달라지나요?',intent:'price',evidenceIds:[id('원단')],missingFacts:['기본 가격 또는 견적 예시','부가세·배송비 포함 여부']},
  ]};
}
export const answerPlan=()=>buildAnswerContentPlan(answerPage,answerSuggestion());
