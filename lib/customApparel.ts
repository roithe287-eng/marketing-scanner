import type {BusinessProfile} from './businessContext';
import {classificationText, isSecondarySection} from './websiteIdentity';

const garment = /단체복|단체\s*티(?:셔츠)?|과잠(?:바|퍼)?|유니폼|야구\s*점퍼|작업복|맞춤\s*의류|custom\s+(?:uniform|apparel)/i;
const production = /주문\s*제작|맞춤\s*제작|제작\s*(?:업체|전문|문의|합니다)|시안\s*(?:신청|문의)|견적\s*문의|커스터마이징|customiz/i;
export function customApparelIdentity(headings:string, description:string, body=''){
  const primary=classificationText(headings), intro=classificationText(description);
  // A customer's profession or a single garment in a catalogue is insufficient.
  if(/블로그|뉴스|칼럼|채용|후기|제작\s*사례|(?:병원|의원|치과)\s*(?:공식|진료)|(?:마케팅|광고)\s*대행/.test(primary))return false;
  const evidence=[primary,intro].filter(t=>!isSecondarySection('',t));
  const hasProduct=evidence.some(t=>garment.test(t));
  const hasOrder=evidence.some(t=>production.test(t));
  if(hasProduct&&hasOrder)return true;
  const lines=body.split(/\n+/).filter(t=>!isSecondarySection('',t)).map(classificationText);
  return (hasProduct&&lines.some(t=>production.test(t))) ||
    (!hasProduct&&!hasOrder&&lines.some(t=>garment.test(t)&&production.test(t))&&lines.some(t=>/시안|자수|프린팅|샘플\s*신청/.test(t)));
}
export const apparelTerms=['단체복','과잠','유니폼','야구점퍼','바람막이','티셔츠','작업복','자수','프린팅','샘플','시안','견적'];
export const apparelFields:[string,string,string,string]=['품목·원단·색상 선택','로고 자수·프린팅과 시안 확인','수량·사이즈별 견적 조건','샘플 신청·제작 일정·수령'];
export const apparelProfile:BusinessProfile={
  label:'단체복·유니폼 주문제작',industry:'manufacturing',kind:'service',goalKey:'contact',goalLabel:'디자인 시안·제작 견적 문의',
  keywords:apparelTerms,caution:'품목별 최소 수량·단가·납기는 업체가 공개한 조건에서 확인하세요. 문의 접수와 주문 확정을 따로 측정하세요.',
  checks:[
    {id:'garments',label:'품목·원단 선택',match:/단체복|과잠|유니폼|야구점퍼|원단|안감/,guide:'품목별 상세에 원단·색상·사이즈표와 해당 품목의 견적 문의 경로를 연결하세요.'},
    {id:'artwork',label:'로고·디자인 시안',match:/자수|프린팅|시안|로고/,guide:'로고 파일 제출 방법과 시안 확인·수정 절차를 견적 문의 앞에서 안내하세요.'},
    {id:'quantity',label:'수량·옵션별 견적',match:/최소\s*수량|주문\s*수량|단가|견적|수량/,guide:'선택 품목·사이즈별 수량·가공 방식이 단가와 추가 비용에 어떻게 반영되는지 안내하세요.'},
    {id:'sample',label:'샘플·사이즈 확인',match:/샘플|사이즈|실측/,guide:'샘플 신청 가능 품목과 실측표를 연결하고 실제 대여·반납 조건을 표시하세요.'},
    {id:'delivery',label:'시안 확정부터 수령까지',match:/제작\s*일정|납기|출고|수령|배송/,guide:'시안 확정일·제작 기간·출고일을 구분하고 희망 수령일을 어디에서 전달할지 안내하세요.'},
  ],questions:[
    {intent:'choice',question:'단체복의 원단과 사이즈는 주문 전에 어떻게 확인하나요?',fields:['품목별 원단·실측표','샘플 신청 조건'],match:/원단|실측|샘플/,placement:'품목 상세의 사이즈표 옆'},
    {intent:'price',question:'주문 수량과 로고 가공 방식에 따라 견적은 어떻게 달라지나요?',fields:['최소 주문 수량','수량별 단가','자수·프린팅 추가 비용'],match:/단가|최소\s*수량|수량별|견적/,placement:'견적 문의 버튼 위'},
    {intent:'process',question:'로고 파일을 보내고 제작 시안을 확정하는 순서는 어떻게 되나요?',fields:['로고 파일 형식','시안 수정·확정 단계'],match:/시안|로고\s*파일|자수/,placement:'디자인 시안 신청 안내'},
    {intent:'delivery',question:'희망 수령일에 맞추려면 언제까지 시안과 주문 수량을 확정해야 하나요?',fields:['제작 시작 기준','출고·배송 일정'],match:/수령|납기|출고|제작\s*일정/,placement:'제작·배송 일정 안내'},
  ],
};
