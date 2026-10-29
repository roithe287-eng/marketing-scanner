import {z} from 'zod';

const evidenceSchema=z.object({text:z.string().max(600),locator:z.string().max(1000)});
export type SectorEvidence=z.infer<typeof evidenceSchema>;
const intentSchema=z.enum(['scope','process','proof','price','eligibility','choice','location','comparison']);
export const NonCommerceSectorSchema=z.object({
  version:z.literal(1),id:z.enum(['legal','medical','property_sales','insurance','rehabilitation','startup','franchise']),
  label:z.string().max(80),evidence:z.array(evidenceSchema).min(1).max(4),
  checks:z.array(z.object({id:z.string().max(80),label:z.string().max(80),status:z.enum(['observed','review']),evidence:z.array(evidenceSchema).max(3),guide:z.string().max(600)})).length(6),
  journey:z.array(z.string().max(80)).length(3),
  questions:z.array(z.object({intent:intentSchema,question:z.string().max(160),fields:z.array(z.string().max(80)).max(5),placement:z.string().max(150),checkId:z.string().max(80)})).length(3),
  caution:z.string().max(600),
});
export type NonCommerceSector=z.infer<typeof NonCommerceSectorSchema>;
type Check={id:string;label:string;match:RegExp;guide:string};
type Question=NonCommerceSector['questions'][number];
type Profile={id:NonCommerceSector['id'];label:string;match:RegExp;checks:Check[];journey:string[];questions:Question[];caution:string};
const check=(id:string,label:string,match:RegExp,guide:string):Check=>({id,label,match,guide});
const question=(intent:Question['intent'],text:string,fields:string[],placement:string,checkId:string):Question=>({intent,question:text,fields,placement,checkId});

// These are review criteria, never claims that a provider actually offers a service.
// Specific services outrank broader professions only when the submitted page supports them.
export const SECTOR_PROFILES:Profile[]=[
  {id:'rehabilitation',label:'회생·파산·채무조정',match:/개인\s*회생|개인\s*파산|채무\s*조정|도산\s*(?:전문|상담|사건)/i,
    journey:['대상·조건 확인','서류·비용·절차 비교','개별 상담 연결'],
    checks:[
      check('eligibility','이용 대상·제외 조건',/소득|채무|재산|신청\s*자격|이용\s*대상|제외\s*조건/,'신청 대상과 제외 조건을 실제 안내 자료에 연결하고, 개별 판단이 필요한 항목을 구분하세요.'),
      check('scope','회생·파산 업무 범위',/개인\s*회생|개인\s*파산|채무\s*조정|도산/,'실제 취급하는 절차별 업무와 제공·제외 범위를 나누어 설명하세요.'),
      check('proof','담당 전문가·운영 주체',/변호사|법무사|법무\s*법인|법률\s*사무소|담당자/,'담당 전문가와 실제 운영 주체를 원문·공식 소개 페이지에서 대조하세요.'),
      check('process','절차·준비 서류',/준비\s*서류|필요\s*서류|진행\s*절차|접수|보정|변제\s*계획/,'서류 준비부터 접수·진행 확인까지의 실제 순서와 고객 준비사항을 안내하세요.'),
      check('price','비용·추가 조건',/수임료|상담료|비용|분납|송달료|인지대/,'관측된 비용의 포함 항목과 추가 발생 조건을 확인하세요. 공개 정액 가격을 임의로 요구하지 않습니다.'),
      check('contact','상담·민감정보 안내',/상담|문의|개인정보|민감\s*정보|비밀\s*보장/,'상담 경로와 입력 정보·동의 안내를 대조하고, 접수 완료와 실제 상담 연결을 구분하세요.'),
    ],questions:[
      question('eligibility','회생·파산 상담 전 어떤 대상·제외 조건을 확인해야 하나요?',['소득·채무·재산 조건','제외 조건'],'이용 대상 안내 아래','eligibility'),
      question('process','신청 준비 서류와 진행 절차는 어떻게 확인하나요?',['필요 서류','진행 단계','고객 준비사항'],'절차 안내와 상담 버튼 사이','process'),
      question('price','상담·수임 비용의 포함 범위와 추가 조건은 무엇인가요?',['비용 산정 기준','포함·별도 비용'],'비용 안내와 상담 경로 옆','price'),
    ],caution:'면책·인가·채무 감면율·처리 기간을 추측하거나 보장하지 않습니다. 페이지 문구와 개별 사건 판단은 구분합니다.'},
  {id:'franchise',label:'프랜차이즈·가맹 모집',match:/프랜차이즈|가맹\s*(?:모집|문의|상담|개설|계약|본부)|franchis/i,
    journey:['브랜드·운영 방식 확인','개설 비용·지원 비교','가맹 상담 연결'],
    checks:[
      check('scope','브랜드·가맹 운영 방식',/프랜차이즈|가맹|브랜드|운영\s*방식/,'소비자 메뉴 소개와 가맹 모집 정보를 나누고, 실제 가맹 사업의 운영 방식을 설명하세요.'),
      check('price','개설 비용·별도 항목',/가맹비|교육비|보증금|로열티|창업\s*비용|개설\s*비용|인테리어\s*비용/,'개설 비용의 기준 면적·포함 항목·별도 비용과 적용 시점을 대조하세요.'),
      check('eligibility','입지·점포·가맹 조건',/상권|입지|점포|면적|가맹\s*조건|계약\s*조건/,'점포·상권·운영자 조건과 계약 검토에 필요한 자료를 연결하세요.'),
      check('process','개설 절차·일정',/개설\s*절차|가맹\s*절차|상담|계약|오픈|개점/,'상담부터 점포 검토·계약·개점까지 실제 진행 단계와 변동 조건을 안내하세요.'),
      check('proof','본부 지원·운영 근거',/본부|교육|물류|슈퍼바이저|운영\s*지원|정보\s*공개서|가맹점/,'교육·물류·운영 지원의 범위와 확인 가능한 가맹 자료를 연결하세요. 메뉴 사진을 수익 근거로 쓰지 않습니다.'),
      check('contact','가맹 상담 경로',/가맹\s*(?:문의|상담|신청)|창업\s*(?:문의|상담)|개설\s*문의/,'가맹 문의를 일반 고객 주문·매장 문의와 구분하고 실제 연결 경로를 확인하세요.'),
    ],questions:[
      question('price','가맹점 개설 비용에 포함되는 항목과 별도 비용은 무엇인가요?',['기준 점포 조건','포함·별도 비용'],'개설 비용 표 아래','price'),
      question('scope','가맹 본부의 교육·물류·운영 지원 범위는 무엇인가요?',['본부 지원 범위','점주 부담 항목'],'본부 지원 안내 아래','proof'),
      question('process','점포 검토부터 가맹 상담·개점까지 어떤 순서로 진행되나요?',['입지 검토','계약 검토 자료','개점 단계'],'개설 절차와 가맹 상담 사이','process'),
    ],caution:'예상 매출·수익·회수 기간·가맹점 성과를 만들어내지 않습니다. 공개된 수치도 기준 점포·기간·출처를 별도로 확인합니다.'},
  {id:'property_sales',label:'아파트·주택 분양',match:/입주자\s*모집|견본\s*주택|모델\s*하우스|주택\s*청약|(?:아파트|주택|오피스텔|단지|청약).{0,30}분양|분양.{0,30}(?:아파트|주택|오피스텔|단지|청약)/i,
    journey:['단지·입지 확인','공급 조건·일정 비교','방문·분양 문의 연결'],
    checks:[
      check('scope','단지·공급 개요',/단지|세대|주택형|평면|타입|공급\s*규모/,'해당 URL의 단지명·공급 규모·주택형을 확인하고 다른 단지 정보를 섞지 마세요.'),
      check('location','입지·현장 위치',/소재지|사업지|주소|입지|교통|위치/,'사업지·견본주택 위치를 구분하고 실제 지도·주소와 대조하세요.'),
      check('eligibility','공급 대상·신청 조건',/청약|공급\s*대상|신청\s*자격|특별\s*공급|일반\s*공급|전매/,'공급 대상·신청 조건·제한은 해당 모집공고의 기준일과 원문을 연결해 확인하세요.'),
      check('price','분양가·납부 조건',/분양가|공급\s*금액|계약금|중도금|잔금|추가\s*비용/,'주택형별 금액·기준일·계약금 등 납부 조건을 원공고와 대조하세요. 금액을 추측하지 않습니다.'),
      check('proof','모집공고·일정·사업 주체',/모집\s*공고|공고일|청약\s*일정|입주\s*예정|시행|시공/,'사업 주체·공고·청약 및 입주 일정의 현재 버전을 연결하세요.'),
      check('contact','방문 예약·분양 문의',/방문\s*예약|관심\s*고객|분양\s*문의|상담|예약/,'방문 예약·관심고객 등록·청약 신청을 구분하고 각 완료 기준을 확인하세요.'),
    ],questions:[
      question('scope','이 단지의 공급 주택형과 입지 정보는 어디에서 확인하나요?',['공급 주택형','사업지 위치'],'단지·입지 소개 아래','scope'),
      question('eligibility','분양 신청 대상과 청약 일정은 어떤 공고를 기준으로 확인하나요?',['신청 조건','공식 모집공고','일정 기준일'],'모집공고와 일정 안내 옆','eligibility'),
      question('price','주택형별 분양가와 계약금·중도금·추가 비용은 어떻게 확인하나요?',['공급 금액','납부 일정','별도 비용'],'분양가·납부 조건 안내 아래','price'),
    ],caution:'청약 자격·대출 가능 여부·시세 차익·미래 가치·잔여 세대를 추측하지 않습니다. 관심고객 등록을 청약 완료로 표시하지 않습니다.'},
  {id:'legal',label:'법무법인·법률 서비스',match:/법무\s*법인|법률\s*사무소|변호사|법률\s*상담|\blaw firm\b|legal services/i,
    journey:['업무 분야 확인','담당자·절차·비용 검토','법률 상담 연결'],
    checks:[
      check('scope','취급 업무·사건 분야',/업무\s*분야|취급\s*(?:사건|업무)|형사|민사|이혼|상속|노동|기업\s*법무/,'실제 취급하는 사건·업무를 고객 상황별로 설명하고 제외 범위를 확인하세요.'),
      check('proof','담당 변호사·이력',/변호사\s*소개|(?:대표|담당|소속|파트너)\s*변호사|담당\s*전문가|구성원|경력|이력|약력/,'담당 변호사와 역할·이력을 실제 소개 원문에 연결하세요. 전문 자격을 추측하지 않습니다.'),
      check('process','상담·수임 진행 절차',/상담\s*절차|수임|진행\s*절차|사건\s*검토|준비\s*서류/,'문의·사건 검토·수임·진행 안내의 실제 단계와 고객 준비자료를 연결하세요.'),
      check('price','상담료·수임 비용 기준',/상담료|수임료|보수|비용|견적/,'비용 산정 기준과 포함·별도 항목을 확인하세요. 상담 버튼만으로 가격 공개 여부를 판정하지 않습니다.'),
      check('reference','사례의 조건·출처',/사건\s*사례|수행\s*사례|성공\s*사례|판결|사례/,'공개 가능한 사례의 사실관계·담당 범위·출처를 확인하고 결과를 일반화하지 마세요.'),
      check('contact','상담·위치·정보 안내',/상담|문의|오시는\s*길|주소|개인정보/,'실제 상담 경로·운영 시간·위치·정보 입력 안내를 대조하세요.'),
    ],questions:[
      question('scope','이 법률 서비스가 취급하는 사건과 업무 범위는 무엇인가요?',['취급 사건','제공·제외 범위'],'업무 분야 소개 아래','scope'),
      question('process','법률 상담과 사건 검토는 어떤 절차로 진행되나요?',['상담 절차','고객 준비자료','담당자'],'상담 안내와 신청 사이','process'),
      question('price','상담료·수임료는 어떤 기준과 조건으로 안내되나요?',['비용 산정 기준','포함·별도 항목'],'비용 안내와 상담 버튼 옆','price'),
    ],caution:'승소·성공률·결과·처리 기간을 추측하거나 보장하지 않습니다. 사례 문구 관측은 해당 사례의 진위 검증과 구분합니다.'},
  {id:'medical',label:'병의원·진료',match:/병원|의원|치과|한의원|의료진|진료\s*(?:과목|안내|예약)|클리닉|\bclinic\b|\bhospital\b/i,
    journey:['진료 범위 확인','의료진·방문 정보 검토','진료 예약 연결'],
    checks:[
      check('scope','진료 과목·대상',/진료\s*과목|진료\s*분야|진료\s*대상|치료|검사|시술/,'해당 병의원의 실제 진료 범위와 대상·제외 조건을 확인하세요.'),
      check('proof','의료진·운영 주체',/의료진|원장|전문의|의사|약력|경력/,'의료진의 실제 역할·이력을 확인하고 관측 문구를 검증된 자격으로 단정하지 마세요.'),
      check('process','진료 절차·준비사항',/진료\s*절차|검사\s*전|내원|준비\s*사항|준비물|초진/,'예약·내원·검사·진료의 실제 순서와 방문 전 준비사항을 연결하세요.'),
      check('price','비용·적용 조건',/비급여|급여|진료비|검사비|시술비|비용/,'관측된 비용의 적용 대상·포함 범위·별도 확인 조건을 담당 자료와 대조하세요.'),
      check('location','진료 시간·위치',/진료\s*시간|휴진|점심\s*시간|오시는\s*길|주소|주차/,'진료 시간·휴진·위치·주차 안내를 현재 운영 정보와 대조하세요.'),
      check('contact','예약·문의·정보 안내',/예약|접수|문의|개인정보/,'예약 접수와 확정의 차이, 실제 연결 경로와 입력 정보 안내를 확인하세요.'),
    ],questions:[
      question('scope','이 병의원의 진료 과목과 방문 전 확인할 대상·조건은 무엇인가요?',['실제 진료 범위','대상·제외 조건'],'진료 안내 아래','scope'),
      question('process','초진 예약과 내원 전 준비는 어떤 순서로 진행되나요?',['예약·접수 단계','내원 준비사항'],'진료 절차와 예약 경로 사이','process'),
      question('location','진료 시간·위치·휴진 정보는 어디에서 확인하나요?',['현재 진료 시간','위치','휴진 안내'],'진료 시간·오시는 길 영역','location'),
    ],caution:'치료 효과·안전성·적합한 시술·의료진 자격을 추측하지 않습니다. 환자 후기·전후 사진을 필수 신뢰 요소로 요구하지 않습니다.'},
  {id:'insurance',label:'보험·보장 상담',match:/보험|보장\s*분석|\binsurance\b/i,
    journey:['보장·상담 범위 확인','조건·보험료·제외 비교','개별 상담 연결'],
    checks:[
      check('scope','보험·보장 범위',/보험|보장\s*(?:범위|내용|항목)|특약/,'실제 안내하는 보험 종류·보장 범위를 확인하고 상품명만으로 보장 사실을 추측하지 마세요.'),
      check('eligibility','가입 조건·면책·제외',/가입\s*조건|가입\s*대상|면책|감액|제외|고지\s*의무/,'가입 조건과 면책·감액·제외 항목을 해당 상품 설명·약관과 연결하세요.'),
      check('price','보험료 산정·변동 기준',/보험료|갱신|납입|산정|보험\s*나이/,'보험료 예시의 산정 조건·갱신·납입 기준을 확인하고 보장금액과 구분하세요.'),
      check('proof','보험사·상담 운영 주체',/보험사|보험\s*회사|설계사|대리점|모집인|등록\s*번호/,'실제 보험사·판매 또는 상담 주체와 확인 가능한 소개·등록 정보를 연결하세요.'),
      check('process','약관·청구·변경 안내',/약관|상품\s*설명|보험금\s*청구|해지|변경\s*절차/,'약관·상품 설명과 청구·변경·해지 안내의 실제 적용 범위를 확인하세요.'),
      check('contact','상담·동의·연락 안내',/상담|문의|개인정보|동의|연락/,'상담 입력 정보·동의·연락 방법을 대조하고 상담 신청과 보험 가입 완료를 구분하세요.'),
    ],questions:[
      question('scope','이 보험 안내의 보장 범위와 특약은 어디에서 확인하나요?',['실제 보장 내용','특약','상품 설명'],'보장 설명 아래','scope'),
      question('eligibility','가입 조건과 면책·감액·제외 항목은 어떻게 확인하나요?',['가입 조건','면책·감액','적용 약관'],'가입 조건과 약관 링크 옆','eligibility'),
      question('price','보험료는 어떤 산정 조건과 갱신 기준에 따라 달라지나요?',['산정 조건','갱신·납입 기준'],'보험료 예시와 상담 경로 사이','price'),
    ],caution:'가입 승인·보험금 지급·절감액·보장 범위를 추측하거나 보장하지 않습니다. 상담 신청을 보험 계약 완료로 표시하지 않습니다.'},
  {id:'startup',label:'창업·사업 개설 지원',match:/창업|사업\s*개설|예비\s*창업|\bstartup\b/i,
    journey:['지원 대상·방식 확인','범위·비용·조건 비교','창업 상담·신청 연결'],
    checks:[
      check('scope','창업 지원·제공 범위',/창업|컨설팅|멘토링|사업\s*개설|제공|지원\s*범위/,'실제 창업 지원·컨설팅·개설 서비스의 제공·제외 범위를 구분하세요.'),
      check('eligibility','대상·참여 조건',/예비\s*창업|대상|자격|참여\s*조건|제외|모집\s*요건/,'업력·업종 등 실제 적용 대상과 참여·제외 조건을 원문에 연결하세요.'),
      check('process','진행 절차·준비 자료',/절차|신청|접수|사업\s*계획|준비\s*자료|진행/,'상담·신청·검토·지원의 실제 단계와 필요한 준비 자료를 설명하세요.'),
      check('price','비용·지원 조건',/비용|견적|지원금|부담금|유료|무료|수수료/,'서비스 비용과 지원금·본인 부담 조건을 구분하고 적용 시점·제외 항목을 확인하세요.'),
      check('proof','담당 주체·실제 사례',/운영\s*기관|담당|전문가|경력|사례|공고|협약/,'운영 주체·담당자·실제 지원 사례 또는 원공고를 연결하세요.'),
      check('contact','상담·신청 연결',/창업\s*상담|상담|문의|신청|접수/,'상담 신청·프로그램 지원·실제 개설 완료를 구분하고 연결 경로를 확인하세요.'),
    ],questions:[
      question('scope','창업 지원·컨설팅에 포함되는 업무와 제외 항목은 무엇인가요?',['제공 업무','제외 항목'],'지원 범위 안내 아래','scope'),
      question('eligibility','참여 대상과 신청 전 확인할 조건·준비 자료는 무엇인가요?',['참여 조건','제외 조건','준비 자료'],'대상·신청 안내 아래','eligibility'),
      question('price','창업 서비스 비용과 지원·본인 부담 조건은 어떻게 확인하나요?',['비용 산정','지원 조건','별도 부담'],'비용·지원 조건과 상담 사이','price'),
    ],caution:'지원금 선정·매출·수익·사업 성공·투자 회수 기간을 추측하거나 보장하지 않습니다. 정부 지원 공고와 민간 서비스를 구분합니다.'},
];

export function sectorProfile(id:NonCommerceSector['id']){return SECTOR_PROFILES.find(p=>p.id===id)!;}

/** Explicit service actions may live in navigation; ordinary menu links stay excluded. */
export function sectorActionPattern(id:NonCommerceSector['id']):RegExp{
  const patterns:Record<NonCommerceSector['id'],RegExp>={
    legal:/상담|상담\s*신청|상담\s*문의|전화\s*문의/,
    medical:/예약|진료\s*접수|상담\s*(?:신청|문의)|온라인\s*상담/,
    property_sales:/방문\s*예약|분양\s*(?:문의|상담)|관심\s*고객\s*(?:등록|신청)/,
    insurance:/보험\s*상담|보장\s*분석|상담\s*(?:신청|문의)|전화\s*상담/,
    rehabilitation:/회생\s*상담|파산\s*상담|상담\s*(?:신청|문의)|전화\s*상담/,
    startup:/창업\s*(?:상담|문의)|개설\s*문의|상담\s*(?:신청|문의)/,
    franchise:/(?:가맹|창업|개설)\s*(?:문의|상담|신청)|상담\s*(?:신청|문의)/,
  };
  return patterns[id];
}

/** Prefer a literal service phrase to generic CTA words when AI assistance is unavailable. */
export function sectorTopicPatterns(id:NonCommerceSector['id']):RegExp[]{
  const patterns:Record<NonCommerceSector['id'],RegExp[]>={
    legal:[/(?:형사|민사|이혼|상속|노동|기업)\s*(?:사건|소송|상담|법무)/, /법률\s*상담/,/법무\s*법인/],
    medical:[/[가-힣]{2,10}(?:의원|병원|치과|클리닉)/,/진료\s*과목/,/진료\s*안내/],
    property_sales:[/[가-힣a-z0-9]{2,12}\s*(?:아파트|오피스텔)\s*분양/i,/아파트\s*분양/,/입주자\s*모집/],
    insurance:[/보험\s*상담/,/보험\s*비교/,/보험\s*설계/,/보장\s*분석/,/보험/],
    rehabilitation:[/개인\s*회생/,/개인\s*파산/,/채무\s*조정/],
    startup:[/창업\s*컨설팅/,/창업\s*지원/,/사업\s*개설/,/예비\s*창업/],
    franchise:[/프랜차이즈\s*창업/,/가맹\s*모집/,/가맹\s*상담/],
  };
  return patterns[id];
}

/** Page title/H1/description lead; a footer or URL keyword alone cannot classify a page. */
export function analyzeNonCommerceSector(units:SectorEvidence[],actions:SectorEvidence[]):NonCommerceSector|undefined{
  const primary=(u:SectorEvidence)=>u.locator==='head > title'?16:u.locator==='h1'?12:u.locator==='meta[name="description"]'?10:0;
  const candidates=SECTOR_PROFILES.map((p,index)=>{
    const evidence=units.filter(u=>p.match.test(u.text));
    const score=evidence.reduce((n,u)=>n+primary(u),0)+Math.min(6,evidence.filter(u=>!primary(u)).length*2);
    return {p,index,evidence,score,anchored:evidence.some(u=>primary(u)>0)};
  }).filter(c=>c.anchored||c.evidence.length>=2).sort((a,b)=>b.score-a.score||a.index-b.index);
  let selected=candidates[0];if(!selected)return;
  // A dedicated debt/franchise page specializes law/startup, but a sidebar cannot.
  const specialty=candidates.find(c=>c.anchored&&((selected.p.id==='legal'&&c.p.id==='rehabilitation')||(selected.p.id==='startup'&&c.p.id==='franchise')));
  if(specialty)selected=specialty;
  const p=selected.p;
  return NonCommerceSectorSchema.parse({version:1,id:p.id,label:p.label,evidence:selected.evidence.slice(0,4),journey:p.journey,questions:p.questions,caution:p.caution,
    checks:p.checks.map(c=>{
      const rank=(u:SectorEvidence)=>(actions.includes(u)?(c.id==='contact'?12:0):primary(u)?1:u.locator==='h2'?2:8)-(u.text.length>300?5:0)-(/사무소.{0,180}사무소|(?:로|길)\s*\d/.test(u.text)?20:0);
      const evidence=[...units,...actions].filter(u=>c.match.test(u.text)).sort((a,b)=>rank(b)-rank(a)).filter((u,i,a)=>a.findIndex(v=>v.text===u.text)===i).slice(0,3).map(u=>{
        if(u.text.length<=240)return u;
        const start=Math.max(0,u.text.search(c.match)-45);return {...u,text:u.text.slice(start,start+240)};
      });
      return {id:c.id,label:c.label,status:evidence.length?'observed':'review',evidence,guide:c.guide};
    })});
}
