import {retailSubscriptionAction} from './retailOffer';
import {isNonCommerce,type WebsitePurpose} from './websitePurpose';

type Completion = {label:string;start:string;check:string};
const goals:Partial<Record<WebsitePurpose['goal']['key'],Completion>>={
  booking:{label:'예약 확정',start:'예약 방법과 준비사항을 확인한 뒤 예약 화면을 열어 보세요.',check:'버튼 클릭, 예약 요청, 실제 확정을 구분하세요.'},
  contact:{label:'문의 접수',start:'문의 대상과 필요한 항목이 안내된 경로를 열어 보세요.',check:'버튼 클릭과 담당자가 받은 문의를 구분하세요.'},
  application:{label:'신청 접수',start:'대상과 신청 조건을 확인한 뒤 신청 화면을 열어 보세요.',check:'신청 화면 진입, 접수 완료, 선정·승인을 구분하세요.'},
  download:{label:'자료 다운로드 완료',start:'자료의 제목과 형식을 확인하고 다운로드 링크를 열어 보세요.',check:'링크 클릭과 실제 파일 열림을 구분하세요.'},
  subscribe:{label:'구독 완료',start:'구독 안내와 확인 절차가 있는 화면을 열어 보세요.',check:'구독 요청과 실제 신청 완료 안내를 구분하세요.'},
  read:{label:'본문·자료 열람',start:'본문과 출처 또는 관련 자료를 열어 보세요.',check:'어떤 화면까지 읽으면 열람으로 셀지 먼저 정하세요.'},
};
const medical:Completion={label:'진료 예약 확정',start:'진료과·의료진 안내에서 초진·재진에 맞는 예약 경로를 열어 보세요.',check:'예약 버튼 클릭, 예약 요청, 실제 예약 확정을 구분하세요.'};
const fortuneConsultation:Completion={label:'상담 예약 확정',start:'실제 상담 방식과 가능 시간을 확인한 뒤 예약 경로를 열어 보세요.',check:'상담 문의, 예약 확정, 실제 상담 완료를 구분하세요.'};
const fortuneDigital:Completion={label:'풀이 결과 열람',start:'풀이 주제를 골라 시작 화면과 입력 안내가 연결되는지 보세요.',check:'풀이 시작, 입력 완료, 결과 열람을 구분하세요. 유료 결제가 있다면 따로 집계하세요.'};
const fortuneOverview:Completion={label:'운세 안내 열람',start:'관심 주제의 안내를 읽을 수 있는지 확인하세요.',check:'운세 안내 열람, 풀이 도구 시작, 실제 결과 열람을 구분하세요.'};

export function reportGoal(purpose:WebsitePurpose|undefined):Completion|undefined {
  if(!purpose)return;
  if(purpose.kind==='commerce'||purpose.kind==='mixed'){
    const {goal}=purpose;
    if(goal.observed){
      if(goal.key==='purchase')return {label:'구매 완료',start:'상품 옵션 선택에서 주문서와 결제 화면까지 연결되는지 확인하세요.',check:'장바구니 추가, 결제 시도, 결제 완료를 각각 기록하세요.'};
      if(goal.key==='subscribe'&&goal.evidence.some(e=>retailSubscriptionAction(e.text)))return {label:'상품 구독 신청 완료',start:'구독 상품의 주기와 금액을 확인하고 신청 경로를 열어 보세요.',check:'구독 신청 완료와 첫 결제, 이후 자동 갱신을 별도로 집계하세요.'};
      if(goal.key==='contact')return {label:goal.evidence.some(e=>/견적|대량|도매|납품/.test(e.text))?'견적 문의 접수':'상품 문의 접수',start:'상품·수량을 지정해 문의를 보낼 수 있는 경로를 확인하세요.',check:'문의 버튼 클릭, 실제 접수, 후속 주문을 따로 집계하세요.'};
      if(goal.key==='booking')return goals.booking;
    }
    return {label:'목표 행동 완료',start:'공개 원문에서 거래 동선을 확정하기 어렵습니다. 실제 화면에서 주문·문의 경로를 먼저 확인하세요.',check:'거래 동선과 완료 기록을 확인한 뒤 측정할 목표를 정하세요.'};
  }
  if(!isNonCommerce(purpose))return;
  if(purpose.business?.id==='fortune_digital')return fortuneDigital;
  if(purpose.business?.id==='fortune_consultation')return fortuneConsultation;
  if(purpose.goal.label===fortuneOverview.label&&purpose.kind==='content'&&purpose.declaredIndustry?.category==='fortune')return fortuneOverview;
  if(purpose.kind==='service'&&(purpose.sector?.id==='medical'||purpose.declaredIndustry?.category==='medical'))return medical;
  if(purpose.kind==='education'&&purpose.goal.key==='application')return {...goals.application!,label:'수강 신청 완료'};
  if(purpose.business?.id==='international_logistics')return {...goals.contact!,label:'견적 문의 접수'};
  return goals[purpose.goal.key]||{label:'목표 행동 완료',start:'공개 화면에서 다음 행동으로 이어지는 경로를 확인하세요.',check:'버튼 클릭과 실제 완료를 구분하고 완료 기준을 먼저 정하세요.'};
}
