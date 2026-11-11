import type {SiteDiagnostics} from './siteDiagnosticsSchema';
import type {LocalPlaceLookup} from './localPlaceSchema';
import {placeSector,placePolicies,PLACE_POLICY_REVIEWED,PLACE_API_DOC} from './localPlaceCatalog';
import {sameSite} from './siteIdentity';
export const LOCAL_PLACE_TITLE='네이버 플레이스 · 업체 정보와 실행 제안';
export const LOOKUP_LABELS:Record<LocalPlaceLookup['status'],string>={observed:'API 조회 완료',empty:'검색 표본에서 미확인',unavailable:'API 연결 확인 필요',error:'일시적 조회 실패',limited:'수집 제한',not_queried:'새 진단 필요'};
export const PLACE_SCOPE='API 조회값·홈페이지 관측·운영자 확인을 구분합니다. 일반검색 순위, 리뷰·저장수, 사진, 영업시간, 관리자 키워드와 AI 노출 상태는 지역 검색 API 제공 항목이 아닙니다.';
export function buildLocalPlaceReview(diagnostics?:SiteDiagnostics|null){
  if(!diagnostics)return;
  const root=diagnostics.pages.find(p=>p.url===diagnostics.targetUrl),evidence=root?.localPlaceEvidence;
  if(!root||!evidence||root.noindex||diagnostics.limited)return;
  const sector=placeSector(evidence.sector),pages=diagnostics.pages.filter(p=>sameSite(p.url,root.url)&&!p.noindex&&p.localPlaceEvidence?.sector===evidence.sector&&(p.url===root.url||!evidence.branch||p.localPlaceEvidence.branch===evidence.branch));
  const terms=pages.flatMap(p=>p.localPlaceEvidence!.terms.map(t=>({...t,url:p.url}))).filter((t,i,a)=>a.findIndex(v=>v.term===t.term&&v.group===t.group)===i).slice(0,40);
  const info:Record<string,[string,string]>={
    offer:['상품·서비스','업체정보의 업종과 제공 서비스에 실제 취급하는 내용만 반영하세요.'],
    hours:['운영시간','평일·주말·휴무·접수 마감 등 실제 운영 시간과 홈페이지를 대조하세요.'],
    price:['가격·비용','대표 상품·서비스의 가격과 추가 비용 조건을 정리하세요. 견적형이면 산정 기준을 설명하세요.'],
    visit:['위치·주차','지점별 주소·입구·주차·대중교통 동선과 실제 이용 조건을 확인하세요.'],
    booking:['예약·문의','실제 이용 가능한 예약 또는 문의 경로를 연결하고 홈페이지에서도 같은 절차를 안내하세요.'],
    conditions:['이용 조건','취소·환불·대상·준비사항 등 방문 전 필요한 조건을 상품·서비스와 함께 설명하세요.'],
  };
  const checks=Object.entries(info).map(([key,[label,action]])=>{const page=pages.find(p=>p.localPlaceEvidence!.signals.some(s=>s.key===key));const signal=page?.localPlaceEvidence!.signals.find(s=>s.key===key);return {key,label,status:signal?'홈페이지 문구 관측':'표본에서 미확인',excerpt:signal?.excerpt||'수집 표본에서 관련 표현을 확인하지 못했습니다. 실제 누락 여부는 원문에서 확인하세요.',url:page?.url||root.url,action};});
  const lookup:LocalPlaceLookup=diagnostics.localPlaceLookup||{status:'not_queried',observedAt:diagnostics.observedAt,queries:[],items:[],note:'저장된 보고서에는 API 조회가 없습니다. 같은 URL로 새로 진단하면 업체 검색을 수행합니다.'};
  return {evidence,sector,terms,checks,lookup,page:{url:root.url,title:root.title,description:root.description},policies:placePolicies(sector.id),reviewedOn:PLACE_POLICY_REVIEWED,apiDoc:PLACE_API_DOC,
    steps:[
      {title:'업체·지점 식별',text:evidence.franchise?'본사와 가맹점을 구분하고 각 지점의 고유 이름·주소·전화·공식 매장 페이지를 대조하세요. 본사의 주소를 모든 지점에 복사하지 마세요.':'API 후보의 이름·주소·업종·홈페이지를 함께 대조하고 우리 업체의 스마트플레이스 관리 화면을 여세요.'},
      {title:'업종별 정보 정리',text:sector.fields.join(' / ')+' 항목을 관리 화면과 홈페이지에 일관되게 반영하세요.'},
      {title:'방문을 돕는 사진·설명',text:'실제 외관·입구·시설·대표 상품 또는 서비스를 보여주는 사진과 구체적인 설명을 준비하세요. 홈페이지 이미지 수는 플레이스 사진 등록 수가 아닙니다.'},
      {title:'질문·답변과 전환 점검',text:sector.questions.join(' ')+' 질문에 사실로 답하고 예약·상담·길찾기 경로를 직접 확인하세요.'},
    ]};
}
export type LocalPlaceReview=NonNullable<ReturnType<typeof buildLocalPlaceReview>>;
