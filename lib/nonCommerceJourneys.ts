import type {NonCommerceSector} from './nonCommerceSectors';

/** The same customer journey is shown in the report and the pre-scan examples. */
export const sectorJourneys={
  medical_consulting:['병원 과제·서비스 범위 확인','담당자·사례·진행 조건 비교','상담·견적 문의 연결'],
  rehabilitation:['대상·조건 확인','서류·비용·절차 비교','개별 상담 연결'],
  franchise:['브랜드·운영 방식 확인','개설 비용·지원 비교','가맹 상담 연결'],
  property_sales:['단지·입지 확인','공급 조건·일정 비교','방문·분양 문의 연결'],
  legal:['업무 분야 확인','담당자·절차·비용 검토','법률 상담 연결'],
  medical:['진료 범위 확인','의료진·방문 정보 검토','진료 예약 연결'],
  insurance:['보장·상담 범위 확인','조건·보험료·제외 비교','개별 상담 연결'],
  startup:['지원 대상·방식 확인','범위·비용·조건 비교','창업 상담·신청 연결'],
} satisfies Record<NonCommerceSector['id'],[string,string,string]>;
