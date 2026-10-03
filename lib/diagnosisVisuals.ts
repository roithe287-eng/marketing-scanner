import type { MarketingReport } from './reportSchema';
export const diagnosisAxes = [
  {key:'firstView',label:'첫 화면 설득력',short:'첫인상',color:'#d32235',action:'첫 화면에 고객·제공 가치·다음 행동이 함께 보이는지 확인하세요.',check:'서비스를 처음 보는 사람이 무엇을 제공하는지 설명할 수 있는가'},
  {key:'cta',label:'CTA 명확도',short:'CTA',color:'#b87910',action:'주요 버튼의 행동을 하나로 정하고 클릭 뒤 화면과 문구를 맞추세요.',check:'버튼 문구와 실제 다음 단계가 일치하는가'},
  {key:'copywriting',label:'카피라이팅',short:'카피',color:'#7955b5',action:'반복되는 추상 표현을 고객의 상황·제공 범위·확인 가능한 근거로 구체화하세요.',check:'같은 주장을 반복하는 문장이 서로 다른 정보를 제공하는가'},
  {key:'trust',label:'신뢰 요소',short:'신뢰',color:'#218267',action:'실제 확인한 사례·담당자 정보·서비스 조건을 주장 가까이에 배치하세요.',check:'핵심 주장 옆에서 해당 근거를 확인할 수 있는가'},
  {key:'conversionFlow',label:'전환 흐름',short:'전환',color:'#3564a7',action:'문의·신청 과정에서 불필요한 입력과 이동을 줄일 수 있는지 점검하세요.',check:'고객이 완료까지 필요한 단계와 정보를 알 수 있는가'},
  {key:'adLanding',label:'광고 랜딩',short:'광고',color:'#b74478',action:'광고의 약속과 도착 페이지의 제목·혜택·조건이 이어지는지 대조하세요.',check:'광고에서 기대한 정보를 랜딩 첫 화면에서 찾을 수 있는가'},
  {key:'mobileUx',label:'모바일 UX',short:'모바일',color:'#237e91',action:'좁은 화면에서 글자·버튼·폼을 확대나 가로 이동 없이 읽고 조작해 보세요.',check:'작은 화면에서도 주요 버튼과 입력란이 잘리지 않는가'},
  {key:'seo',label:'SEO 기본',short:'SEO',color:'#6c8536',action:'대표 제목·설명·H1이 같은 주제를 설명하는지 확인하고 연결 오류를 정리하세요.',check:'페이지 주제와 제목·설명·본문의 핵심 표현이 일치하는가'},
] as const;
export function diagnosisScores(diagnosis:MarketingReport['diagnosis']) {
  return diagnosisAxes.map(a=>({...a,score:Math.max(0,Math.min(100,diagnosis[a.key]))}));
}
export function radarPoint(index:number,value:number,cx=250,cy=250,radius=148){const angle=index*Math.PI/4-Math.PI/2;return {x:cx+Math.cos(angle)*radius*value/100,y:cy+Math.sin(angle)*radius*value/100};}
export function scoreGrade(score:number){return score>=80?'우수':score>=60?'양호':score>=40?'보통':'취약';}
