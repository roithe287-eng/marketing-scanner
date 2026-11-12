import {koreanParticle} from './koreanParticle';
import type {WebsitePurpose} from './websitePurpose';
import type {AnswerIntent} from './answerContentSchema';
import {sectorProfile} from './nonCommerceSectors';
import {businessProfile} from './businessContext';
import {PLACE_DETECTION_ORDER,placeSector} from './localPlaceCatalog';
import {seasonalProfile} from './seasonalPlaceCatalog';
import {editorialFocus} from './nonCommerceEditorial';
import type {LocalPlaceEvidence} from './localPlaceSchema';

export type NonCommercePlaybook={
  id:string;label:string;audience:string;preparation:string[];proof:string;assets:string[];
  stages:[string,string,string,string,string];outcome:string;cta:string;caution:string;
  local?:{fields:string[];questions:string[];regions:string[];seasonal:boolean};
};
const make=(id:string,label:string,audience:string,preparation:string[],proof:string,assets:string[],stages:NonCommercePlaybook['stages'],outcome:string,cta:string,caution='공개된 원문과 실제 운영 자료를 대조한 뒤 사용하세요. 수치·비용·기간·실적은 추정하지 않습니다.'):NonCommercePlaybook=>({id,label,audience,preparation,proof,assets,stages,outcome,cta,caution});
const professional=(id:string,label:string,audience:string,prep:string[],proof:string,assets:string[],outcome='계약 확정',cta='조건 확인·상담 요청')=>make(id,label,audience,prep,proof,assets,['제공 범위 탐색','조건·사례 비교','문의 접수','적합성·업무 범위 확인',outcome],outcome,cta);
export const NONCOMMERCE_PLAYBOOKS:Record<string,NonCommercePlaybook>={
  legal:professional('legal','법률 서비스','사건의 취급 범위와 상담 가능 여부를 확인하려는 의뢰인',['사건 분야','진행 단계','상담 목적'],'담당 변호사의 역할·이력과 공개 가능한 사건 조건',['업무 분야별 안내','상담 준비 체크리스트','비식별 사례 해설'],'수임 여부 확정','사건 분야 상담 요청'),
  rehabilitation:professional('rehabilitation','회생·파산','절차별 적용 대상과 준비 순서를 확인하려는 상담자',['필요 절차','상담 목적','현재 진행 여부'],'개별 검토 기준·담당 전문가·비용 포함 범위',['대상 조건 확인표','절차별 준비 안내','비용 항목 해설'],'수임 여부 확정','상담 준비사항 확인'),
  medical:make('medical','병의원','진료 범위와 방문 조건을 확인하려는 이용자',['희망 진료 분야','희망 방문 시점','초진·재진 구분'],'의료진 소개·실제 진료 범위·위치와 운영 안내',['진료 분야 안내','방문 준비 안내','시설·동선 사진'],['진료 안내 탐색','의료진·방문 조건 확인','예약 요청','예약 확정','실제 내원'],'실제 내원','예약 가능 여부 확인','치료 효과·진단·자격·회복 기간을 추정하거나 보장하지 않습니다. 건강·증상 정보로 광고 대상 목록을 만들거나 추적 이벤트를 보내지 않습니다. 게시·집행 전 적용되는 표현·심의·플랫폼 기준을 확인하세요.'),
  medical_consulting:professional('medical_consulting','병원 컨설팅·마케팅','개원·경영·마케팅 과제를 맡길 파트너를 검토하는 병원 담당자',['병원 운영 단계','필요 업무','담당 조직·회신 경로'],'담당 실무자의 역할·프로젝트 수행 범위·보고 기준',['진단 예시','산출물 표본','업무 범위 비교표']),
  property_sales:make('property_sales','분양 안내','공급 조건과 방문 필요성을 검토하는 관심 고객',['관심 주택형','공고 확인 여부','희망 방문 시점'],'해당 단지의 최신 모집공고·사업 주체·납부 조건',['주택형 비교표','공고 확인 가이드','사업지·견본주택 위치 안내'],['단지·주택형 탐색','공고·조건 확인','방문 예약 요청','예약 확정','실제 방문'],'실제 방문','공고 확인·방문 문의','관심고객 등록·방문을 청약·계약으로 계산하지 않습니다. 자격·대출·미래 가격·잔여 세대를 추정하지 않습니다.'),
  insurance:professional('insurance','보험 상담','적용 조건과 보장 범위를 비교하려는 상담자',['관심 보장 분야','상담 목적','회신 희망 방식'],'실제 약관·상품설명·제외 조건과 상담 주체',['보장·제외 조건 표','약관 읽기 가이드','상담 절차 안내'],'가입 여부 확인','약관 확인·상담 요청'),
  startup:professional('startup','창업 컨설팅','사업 준비 수준에 맞는 지원 범위를 검토하는 예비·초기 사업자',['창업 단계','해결 과제','필요 지원 범위'],'담당자의 실제 역할·산출물·사례 적용 조건',['단계별 준비표','사업계획 검토 항목','지원 범위 예시']),
  franchise:professional('franchise','가맹 모집','입지·개설 조건과 본부 지원을 비교하는 예비 점주',['희망 지역','점포 보유 여부','운영 준비 단계'],'기준 점포별 비용 포함·별도 항목과 본부의 실제 지원 범위',['개설 조건표','본부 지원 절차','공개 가능한 운영 자료'],'가맹 계약 확정','가맹 조건 상담'),
  travel_booking:make('travel_booking','여행·투어 예약','일정·인원·포함 조건에 맞는 여행을 찾는 고객',['희망 여행일','인원','집결·픽업 조건'],'상품별 일정·포함·불포함·변경 조건',['코스 안내','집결지 사진','준비 체크리스트'],['코스 탐색','일정·조건 확인','예약 요청','예약 확정','실제 이용'],'실제 이용','날짜·인원별 예약 확인'),
  education:make('education','교육·프로그램','학습 수준과 목표에 맞는 과정을 고르는 학습자',['학습 목표','선수 지식','참여 가능 일정'],'커리큘럼·강사 역할·과제·수료 기준',['차시별 학습표','샘플 강의','과제·실습 예시'],['과정 탐색','대상·커리큘럼 비교','수강 신청','등록 확정','실제 참여'],'실제 참여','과정 조건·신청 확인','취업·성적·자격 취득·수료 결과를 보장하지 않습니다. 공개된 조건과 실제 과정 운영을 구분하세요.'),
  organization:professional('organization','기업·제조·기관','제공 역량과 협업 가능성을 검토하는 구매·기술·제휴 담당자',['필요 업무·규격','적용 환경','희망 일정'],'공개 기술 자료·수행 범위·담당 조직과 실제 인증 적용 범위',['역량별 설명서','적용 사례','사양·요구조건 표'],'협업 진행 여부 확인','업무 적합성 문의'),
  service:professional('service','서비스·상담','필요한 업무를 맡길 수 있는지 비교하는 고객',['필요 업무','적용 상황','희망 시점'],'실제 제공·제외 범위와 담당자의 역할·사례 조건',['이용 절차','상담 준비표','업무 범위 비교']),
  software:professional('software','소프트웨어·SaaS','업무 환경에 적합한 도입 방식을 찾는 실무·의사결정 담당자',['해결할 업무','기존 도구·연동 환경','이용 규모'],'실제 기능·지원 환경·요금 기준·지원 범위',['업무별 데모','도입 준비표','기능·플랜 비교'],'도입·활성 이용 확인','환경 확인·데모 요청'),
  agency:professional('agency','마케팅·제작 대행','목표와 예산에 맞는 수행 파트너를 찾는 기업 담당자',['사업 목표','현재 운영 범위','필요 산출물'],'담당 범위·소재 표본·기간과 집계 기준이 있는 수행 사례',['업무별 산출물','운영 과정','사례 해설']),
  accounting:professional('accounting','세무·회계','사업 상황에 맞는 신고·기장 업무를 검토하는 사업자',['사업 유형','필요 업무','진행 기한'],'담당 업무·준비자료·포함 수수료 범위',['업무 구분표','상담 준비자료','기장·신고 절차'],'업무 계약 확정','업무 범위 상담'),
  home:professional('home','인테리어·시공·청소','공간 조건에 맞는 작업 범위와 일정을 비교하는 고객',['현장 유형·지역','작업 범위','희망 일정'],'실제 작업 범위·현장 조건·견적 포함 항목',['작업 과정','공간 조건별 사례','견적 항목 비교'],'작업 계약 확정','현장 조건 상담'),
  repair:professional('repair','수리·복원','대상 물품의 상태와 접수 가능 범위를 확인하려는 고객',['대상 유형','불편 사항 개요','희망 접수 방식'],'실제 취급 범위·점검 절차·보증 조건',['접수 전 확인표','작업 과정','상태별 처리 범위'],'작업 승인·접수 확정','접수 가능 여부 문의'),
  hospitality:make('hospitality','숙박·체험·시설 예약','일정·인원·시설 조건을 비교하는 방문객',['이용 날짜','인원','필요 시설·옵션'],'실제 시설·운영시간·이용 제한·취소 조건',['시설 동선','준비물 안내','옵션별 구성'],['시설·프로그램 탐색','일정·이용 조건 비교','예약 요청','예약 확정','실제 이용'],'실제 이용','이용 조건·예약 확인'),
  hiring:professional('hiring','채용·인력 서비스','필요 직무와 지원 범위가 맞는지 확인하는 기업 담당자',['필요 직무','업무 범위','희망 일정'],'선발·매칭 절차와 수수료·보장 범위의 실제 계약 조건',['직무 요구사항 표','매칭 과정','기업 준비자료'],'매칭·계약 진행 확인','직무 조건 상담'),
  event:professional('event','행사·촬영·웨딩','행사 조건과 제작 범위를 비교하는 의뢰인',['행사 유형','일정·장소','필요 산출물'],'담당 역할·촬영/진행 범위·추가 옵션·변경 조건',['진행 시간표','산출물 표본','준비 체크리스트'],'행사 계약 확정','일정·범위 상담'),
  real_estate:professional('real_estate','부동산 중개','매물과 방문 조건을 확인하는 임차·매수 검토자',['희망 지역','매물 유형','방문 가능 시점'],'매물 정보의 확인 시점·중개 주체·공개 가능한 거래 조건',['매물 조건 비교','현장 확인 항목','방문 준비 안내'],'방문·중개 진행 확인','매물 조건·방문 문의'),
  fitness:make('fitness','필라테스·피트니스','이용 목적과 일정에 맞는 프로그램을 찾는 고객',['운동 목적','참여 가능 시간','희망 수업 방식'],'강사의 실제 역할·프로그램 구성·시설·이용 및 변경 조건',['수업 구성 안내','시설 동선','체험 준비사항'],['프로그램 탐색','강사·이용 조건 확인','체험 예약 요청','예약 확정','체험·등록 확인'],'체험·등록 확인','체험 조건·예약 확인','체형 변화·통증 개선·감량 수치를 보장하지 않습니다. 건강·신체 정보를 광고 이벤트나 대상 목록으로 사용하지 않습니다.'),
  rental:professional('rental','렌탈·설치','이용 환경에 맞는 설치·계약 방식을 비교하는 고객',['설치 환경','필요 구성','이용 기간'],'설치 가능 범위·요금 포함 항목·계약 및 유지관리 조건',['설치 전 확인표','구성별 요금 기준','유지관리 범위'],'설치·계약 확정','설치 조건·견적 문의'),
  study_abroad:professional('study_abroad','유학·연수','목표 국가와 학습 조건에 맞는 과정을 찾는 상담자',['희망 국가·과정','학습 목표·현재 수준','출발 희망 시점'],'학교·과정의 공식 자료와 수속 범위·비용 포함 항목',['과정 비교표','출국 준비 순서','수속 업무 범위'],'수속 진행 여부 확인','과정·수속 조건 상담'),
  content:make('content','정보·콘텐츠','질문에 대한 해설과 근거를 찾는 독자',['알고 싶은 주제','적용 상황','필요한 정보 수준'],'작성자·원자료·작성 및 수정일·적용 범위',['질문별 해설','원자료 비교','실제 적용 예시'],['주제 탐색','본문 읽기','관련 자료 이동','원출처 확인','재방문'],'재방문','관련 자료·원문 보기','열람·스크롤·외부 출처 클릭은 이해도나 만족도를 입증하지 않습니다. 구독 기능이 확인되지 않으면 신규 구독을 기본 전환으로 요구하지 않습니다.'),
  community:make('community','커뮤니티·정보 포털','실무 정보를 찾고 질문·경험을 나누려는 방문자',['관심 게시판','열람·참여 목적','회원 이용 조건'],'운영 안내·게시판 규칙·작성자와 원출처 표시',['게시판 탐색 가이드','질문 작성 예시','참여 절차'],['게시판 탐색','공개 글 열람','가입·참여 안내 확인','자발적 참여','재방문'],'재방문','게시판·이용 안내 보기','회원 글과 입점업체의 서비스·성과는 운영사의 사실이 아닙니다. 공개 열람과 회원 참여를 나누고 가입이 필요하지 않은 독자에게 강제 가입을 제안하지 않습니다.'),
  public_service:make('public_service','공공·지원 안내','지원 대상과 공식 신청 절차를 확인하려는 이용자',['신청 목적','공고의 적용 대상','접수 일정'],'운영 기관·최신 원공고·대상과 제외 조건·정정 이력',['대상 확인표','신청 준비표','공고 변경 안내'],['지원 정보 탐색','대상·공고 확인','공식 신청 이동','신청 접수 확인','진행 상태 확인'],'진행 상태 확인','공식 공고·신청 경로 확인','접수·선정·지급은 서로 다른 단계입니다. 자격·선정·지원 금액을 추측하지 않으며 외부 기관의 신청 완료를 링크 클릭으로 대체하지 않습니다.'),
};
const serviceMatchers:[string,RegExp][]=[['software',/소프트웨어|SaaS|software|업무\s*솔루션/i],['accounting',/세무|회계|기장|tax\s*account/i],['agency',/마케팅|광고\s*대행|브랜딩|웹\s*제작|디자인\s*(?:대행|스튜디오)/i],['home',/인테리어|리모델링|시공|청소/i],['repair',/수리|복원|수선|repair/i],['hospitality',/숙박|호텔|리조트|펜션|캠핑|체험|렌탈|대관/i],['hiring',/채용\s*(?:대행|서비스)|헤드헌팅|인력\s*(?:서비스|파견)/i],['event',/촬영|웨딩|행사\s*(?:대행|기획)|스튜디오/i]];
export function nonCommercePlaybook(p:WebsitePurpose,identity='',place?:LocalPlaceEvidence):NonCommercePlaybook{
  const special=(p.kind==='service'||p.kind==='education')?(/유학|어학\s*연수/.test(identity)?'study_abroad':p.kind==='service'?(/부동산\s*(?:중개|매물)|공인중개/.test(identity)?'real_estate':/필라테스|피트니스|요가|헬스장/.test(identity)?'fitness':/렌탈|렌털|설치\s*서비스/.test(identity)?'rental':serviceMatchers.find(([,match])=>match.test(identity))?.[0]):undefined):undefined;
  const key=p.community?'community':p.sector?.id||p.business?.id||special||p.kind;
  let result=NONCOMMERCE_PLAYBOOKS[key]||NONCOMMERCE_PLAYBOOKS.service;
  // Strong professional/HQ identities win over places mentioned in client examples.
  const localEligible=!p.community&&(!p.sector||p.sector.id==='medical'&&place?.sector==='veterinary')&&(!p.business||p.business.id==='travel_booking')&&['service','education'].includes(p.kind)&&!['software','agency','accounting','hiring','study_abroad'].includes(key);
  if(localEligible){
    const sectorId=place?.sector||PLACE_DETECTION_ORDER.find(id=>placeSector(id).identity.test(identity));
    if(sectorId){
      const sector=placeSector(sectorId);
      const season=place?.seasonal?.profiles.map(s=>seasonalProfile(s.id)).find(s=>s&&s.allowed.includes(sectorId));
      const fields=season?.fields||sector.fields,questions=season?.questions||sector.questions;
      const local={fields:[...fields],questions:[...questions],regions:place?.seasonal?.destinations.map(d=>d.label)||[],seasonal:!!season};
      // Existing detailed playbooks keep their identity; uncovered local businesses get their own workflow.
      const mismatchedLocal=!!place&&(['veterinary','pet_care','pet_store','living'].includes(sectorId)||sectorId==='rental'&&key!=='rental');
      if(season||key==='service'||mismatchedLocal){
        const visit=['restaurant','cafe','retail','pet_store','pharmacy','local'].includes(sectorId);
        const work=['home_service','automotive','living','professional','legal','finance','funeral','real_estate'].includes(sectorId);
        const cta=visit?'방문 조건·위치 확인':work?'작업·상담 조건 문의':'날짜·이용 조건 확인';
        const end=visit?'방문·이용 확인':work?'업무 진행 확인':'실제 이용';
        result=make(season?'season_'+season.id:'place_'+sector.id,season?.label||sector.label,`${sector.label}의 이용 조건을 확인하는 방문자`,fields.slice(0,3),fields[3],[`${fields[0]} 안내`,`${fields[1]} 비교표`,`${fields[2]} 준비표`],
          [visit?'메뉴·품목 탐색':'서비스 탐색','이용 조건 비교',visit?'위치·운영정보 확인':'문의·예약 요청',visit?'방문 경로 선택':'가능 여부 확정',end],end,cta);
      }
      result={...result,local};
    }
  }
  return {...result,caution:p.sector?result.caution+' '+p.sector.caution:result.caution};
}

/** Templates are editorial tasks, never provider facts or live search observations. */
export function nonCommerceQuestionGuides(p:WebsitePurpose,identity='',place?:LocalPlaceEvidence){
  const book=nonCommercePlaybook(p,identity,place),focus=editorialFocus(book),scope=p.sector?.label||book.label;
  const base=p.sector?p.sector.questions.map(q=>{const c=sectorProfile(p.sector!.id).checks.find(c=>c.id===q.checkId)!;return {intent:q.intent as AnswerIntent,question:q.question,fields:q.fields,placement:q.placement,match:c.match,explanation:c.guide};}):p.business?businessProfile(p.business.id).questions.map(q=>({...q,explanation:q.explanation||businessProfile(p.business!.id).caution})):p.community?[
    {intent:'scope' as const,question:'커뮤니티에서 어떤 게시판과 공개 정보를 찾아볼 수 있나요?',fields:['게시판별 주제','공개 열람 범위'],placement:'게시판 탐색 안내',match:/게시판|커뮤니티|정보/,explanation:'운영자의 게시판·이용 안내를 기준으로 설명합니다. 회원 글에 등장하는 사업과 성과를 운영사 제공 범위로 합치지 않습니다.'},
    {intent:'process' as const,question:'회원가입·질문 작성·댓글 참여는 어떤 순서로 진행하나요?',fields:['비회원 열람 조건','가입·참여 절차'],placement:'가입·참여 안내 앞',match:/회원|가입|질문|댓글/,explanation:'공개 열람과 회원 참여 경로를 나눠 설명하고 실제 이용 약관·운영 정책과 대조합니다.'},
    {intent:'proof' as const,question:'게시글의 작성자·원출처와 최신 정보는 어디에서 확인하나요?',fields:['작성자·발행일','원출처','수정일'],placement:'글 상세의 작성·출처 영역',match:/작성|출처|수정/,explanation:'게시글 원문과 작성 정보를 확인할 수 있도록 안내합니다. 회원의 경험담과 검증된 사실을 구분하세요.'},
  ]:[];
  const extra=[
    {intent:'scope' as const,question:`${scope}에서 확인할 제공 범위와 제외 항목은 무엇인가요?`,fields:['실제 제공 범위','제외·별도 조건'],match:/범위|제공|포함|제외|커리큘럼|주제|게시판/,explanation:`${book.proof} 등의 근거를 기준으로 안내의 범위를 한정합니다. 다른 페이지의 조건을 동일한 서비스나 프로그램의 약속으로 합치지 않습니다.`},
    {intent:'eligibility' as const,question:`${scope} 이용 대상과 사전 준비사항은 무엇인가요?`,fields:book.preparation,match:/대상|조건|준비|필수|자격|초진|선수/,explanation:`${book.audience}의 판단에 필요한 질문입니다. ${book.preparation.join('·')} 등 준비 항목을 공개 설명과 후속 확인 항목으로 구분하고 개인정보나 민감한 상세 내용은 처음부터 요구하지 않습니다.`},
    {intent:'process' as const,question:`${scope} 이용은 어떤 절차로 확인하고 진행하나요?`,fields:['실제 진행 순서','담당 주체','단계별 완료 기준'],match:/절차|단계|진행|신청|상담|접수|이용/,explanation:`${book.stages.join(' → ')} 흐름은 검토할 흐름입니다. 실제 운영 절차에 맞춰 수정하고 각 단계의 이용자 준비사항과 다음 행동을 함께 설명합니다.`},
    ...(p.pricingObserved&&!['content','public_service'].includes(p.kind)?[{intent:'price' as const,question:`${scope}의 비용 산정 기준과 포함·별도 항목은 무엇인가요?`,fields:['산정 기준과 적용 대상','포함·별도 항목','변경 조건'],match:/비용|요금|견적|수강료|수수료|유료|무료|가격/,explanation:'원문에 비용 관련 표현이 있어도 확정 가격이나 전체 포함 범위가 공개되었다고 단정하지 않습니다. 실제 조건별 산정 기준과 추가 확인 경로를 안내하세요.'}]:[]),
    {intent:'proof' as const,question:`${scope} 안내의 근거와 최신 조건은 어디에서 확인하나요?`,fields:['담당·발행 주체','확인 가능한 원자료','최종 확인일'],match:/담당|작성|원문|출처|공고|경력|이력|사례|수정/,explanation:`${book.proof} 등의 근거를 확인 가능한 링크와 연결합니다. 표현이 관측된 것과 자격·성과가 검증된 것은 구분하며 최신 조건을 담당자가 검수합니다.`},
    {intent:'choice' as const,question:`${scope} 선택 시 어떤 조건을 같은 기준으로 비교해야 하나요?`,fields:['목적별 선택 기준','적용 조건의 차이','제외·주의사항'],match:/조건|비교|선택|범위|제외|차이/,explanation:`${koreanParticle(book.preparation.join('·'),'subject')} 같은 경우끼리 비교합니다. ${book.assets.join('·')} 같은 자료를 활용해 선택에 필요한 차이를 설명하고 출처 없는 우열·순위를 만들지 않습니다.`},
    {intent:'care' as const,question:`${scope} 이용 중 변경·중단·추가 확인은 어떻게 안내하나요?`,fields:['변경·중단 적용 조건','담당 확인 경로','안내 갱신 기준'],match:/변경|취소|중단|추가|문의|갱신|수정/,explanation:'최초 안내와 다른 조건이 생겼을 때 이용자가 확인할 경로를 제시합니다. 정정·취소·변경 기준은 실제 운영 자료를 확인한 뒤 작성하며, 적용되지 않는 항목은 제외합니다.'},
  ];
  const locations:Partial<Record<AnswerIntent,string>>={scope:'상세 첫 설명 문단',eligibility:`${book.cta} 버튼 위`,process:'이용 순서 안내',price:'조건별 비용 표',proof:'주장 바로 옆의 원자료 링크',choice:'선택안 비교표',care:'변경·정정 안내'};
  return [...base,...extra.filter(q=>!base.some(b=>b.intent===q.intent)).map(q=>({...q,placement:locations[q.intent]||'관련 설명 문단'}))].slice(0,8).map(q=>{
    const fields=q.intent==='choice'?[focus.fields[0],focus.fields[2]]:q.intent==='proof'?[focus.fields[1],'원자료·확인일']:q.fields;
    return {...q,fields,question:book.local&&q.intent==='scope'?focus.questions[0]:book.local&&q.intent==='choice'?focus.questions[1]:q.question,
      explanation:`${q.placement}에 ${fields.join(' / ')} 항목을 나눠 써야 합니다.`,
      template:fields.map(field=>`${field}: [현재 원문으로 확인한 ${field}]`).join('\n')};
  });
}
