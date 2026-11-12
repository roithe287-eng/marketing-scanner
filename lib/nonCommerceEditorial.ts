import {koreanParticle} from './koreanParticle';
import type {NonCommercePlaybook} from './nonCommercePlaybook';
import type {ServiceStrategy} from './serviceStrategy';
import type {StrategySource} from './nonCommerceBriefing';

/** Editorial comparison axes. These are required writing tasks, never observed provider claims. */
export const INDUSTRY_AXES:Record<string,[string,string,string,string]>={
 legal:['취급 사건·진행 단계','담당 변호사·업무 분담','상담료·수임료의 포함/별도 범위','상담 준비 서류·비밀보호 경로'],
 rehabilitation:['회생·파산 절차의 적용 대상','담당 전문가·검토 과정','비용 항목·납부 시점','상담 전 준비자료·진행 확인'],
 medical:['진료과목·초진/재진 대상','담당 의료진·진료 일정','예약·내원 준비·비급여 안내','진료시간·접수 마감·주차'],
 medical_consulting:['개원·경영·마케팅 업무 구분','담당 실무자·월별 산출물','대행료·매체비·추가 제작비','보고 주기·계약 변경·인수인계'],
 property_sales:['주택형·공급 면적·공고 대상','모집공고·사업 주체','공급 금액·납부 일정·별도 항목','견본주택 방문·공고 변경 확인'],
 insurance:['보장 대상·가입 검토 조건','약관·보험금 지급 제외 조건','보험료 산정·납입·갱신 기준','상담 주체·청약 및 해지 안내'],
 startup:['창업 단계·해결 과제','검토 범위·사업계획 산출물','자문료·추가 업무·지원 종료 조건','담당자·자료 전달·회의 일정'],
 franchise:['개설 지역·점포 조건','본부 지원·점주 담당 업무','가맹비·설비비·별도 운영비','정보공개서·개설 절차·계약 조건'],
 travel_booking:['코스·여행일·최소 출발 인원','교통·숙박·식사 포함/불포함','인원별 요금·추가 선택 비용','집결·픽업·기상 변경·취소'],
 education:['수강 대상·선수 지식','차시·실습·강사 역할','수강료·교재비·수료 기준','시간표·신청·환불 조건'],
 organization:['제공 기술·제품 규격·적용 환경','생산·수행 범위·인증 적용 대상','납기·검수·견적 산정 조건','기술자료·담당 조직·협업 절차'],
 service:['제공 업무·대상','담당자·수행 범위','견적 산정·포함/제외 업무','자료 준비·진행 일정·변경 조건'],
 software:['지원 업무·실제 기능','연동 환경·권한·데이터 이전','플랜별 사용자 수·사용량·요금','도입·지원·해지·데이터 반환'],
 agency:['매체·제작·운영 업무 범위','월 산출물·수정 횟수·담당자','매체비·수수료·추가 제작비','보고 기준·계정 소유·인수인계'],
 accounting:['기장·신고·감사 업무 구분','사업 유형·신고 기한·담당자','수수료·결산·추가 신고 비용','준비 서류·전달 방식·검토 일정'],
 home:['현장 지역·면적·작업 대상','자재·공정·철거/폐기 포함 범위','견적 단위·추가 작업·결제 시점','현장 점검·작업 일정·하자 처리'],
 repair:['취급 물품·손상 유형','점검 방식·수리 가능 범위','점검비·부품비·승인 전 비용','접수·완료 예정·보증·재접수'],
 hospitality:['이용일·인원·객실/시설 유형','시설·옵션·추가 인원 조건','날짜별 요금·포함 구성·보증금','입퇴실·접근 동선·취소 조건'],
 hiring:['채용 직무·필수 업무 조건','후보 탐색·검증·추천 범위','수수료 발생 시점·재추천 조건','담당자·면접 일정·진행 상태'],
 event:['행사일·장소·인원','진행 시간·촬영 컷·납품 규격','기본 구성·추가 시간·옵션 비용','일정 확정·수정 횟수·취소'],
 real_estate:['중개 지역·매물 유형','매물 확인일·중개 주체','거래 조건·중개보수 안내','현장 방문·준비사항·확인 경로'],
 fitness:['운동 목적·입문 수준','개인/그룹 수업·강사·정원','횟수·유효기간·추가 비용','체험 일정·시설·변경/환불'],
 rental:['설치 대상·사용 환경','기기 구성·유지관리 범위','약정·보증금·월요금·총 부담','설치일·이전·해지·반납 조건'],
 study_abroad:['국가·학교·과정·입학 조건','공식 과정자료·수속 대행 범위','학비·체류비·수속비 구분','출발 일정·서류·변경/취소'],
 content:['질문·핵심 답변·적용 범위','원자료·작성자·발행일','상충하는 근거·적용 예외','관련 글·정정·갱신 이력'],
 community:['게시판 주제·공개 열람 범위','게시글 작성자·원출처·작성일','참여 조건·게시판 운영 규칙','글 작성·댓글·신고·수정 경로'],
 public_service:['신청 대상·제외 조건','원공고·운영 기관·정정 이력','제출 서류·접수 기간','공식 신청·접수 확인·진행 조회'],
};
export function editorialFocus(book:NonCommercePlaybook){
 const fields=book.local?.fields||INDUSTRY_AXES[book.id]||INDUSTRY_AXES.service;
 const mode=book.id==='public_service'?'public':book.id==='content'?'read':book.id==='community'?'community':/^방문·/.test(book.outcome)?'visit':'request';
 return {fields,mode,information:['public','read','community'].includes(mode),questions:[`${koreanParticle(fields[0],'topic')} 어떻게 구분하나요?`,`${koreanParticle(fields[2],'topic')} 어디에서 확인하나요?`]};
}
/** Local catalog fields do not have a shared question order. Match their own topic. */
export function editorialFieldMatcher(field:string,fallback:RegExp):RegExp{
 const words=field.split(/[\s·/()]+/).filter(w=>w.length>=2&&!/^(포함|별도|여부|조건|안내|구분|확인|실제|범위|기준|대상|최종|해당|연도)$/.test(w));
 if(!words.length)return fallback;
 const topic=words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 // A weekend pickup condition does not substantiate a weekend rental price.
 return /비용|요금|가격|보증금/.test(field)?new RegExp(`(?=[\\s\\S]*(?:${topic}))(?=[\\s\\S]*(?:비용|요금|가격|보증금|추가금|결제|\\d[\\d,]*\\s*원))`,'i'):new RegExp(topic,'i');
}
/** A quotation belongs to one editorial block; metadata is context, not body evidence. */
export function allocateSources(sources:StrategySource[],matchers:RegExp[]):StrategySource[][]{
 const used=new Set<string>();
 return matchers.map(match=>sources.filter(s=>s.title!=='입력 페이지 제목·설명'&&match.test(s.title+' '+s.text)&&!used.has(s.text)).slice(0,2).map(s=>{used.add(s.text);return s;}));
}
export const STAGE_MATCHERS=[/소개|대상|제공|범위|업무|주제|메뉴|품목/,/비교|요금|비용|조건|담당|강사|의료진|규격|약관|공고|원자료/,/준비|절차|신청|예약|접수|위치|운영시간|집결|반납|원출처|게시판/];

export function editorialChannels(book:NonCommercePlaybook):ServiceStrategy['channels']{
 const f=editorialFocus(book),[scope,proof,cost,operation]=f.fields;
 return [
  {id:'search',label:'검색 · 질문별 유입',role:`${koreanParticle(scope,'object')} 찾는 방문자 연결`,setup:`「${book.label}」와 「${book.preparation[0]}」 검색어를 서로 다른 상세 주제에 연결해야 합니다.`,creative:`제목은 [실제 서비스명] + [${book.preparation[0]}] + [업체명] 순서로 작성해야 합니다.`,conversion:`검색 유입의 ${book.stages[1]} 도달률을 집계해야 합니다.`,review:'실제 검색어 보고서에서 동명 업체·무관한 업무를 제외해야 합니다.'},
  {id:'content',label:book.local?'플레이스 · 지점 정보':'검색·AI 답변 · 원문 설명',role:book.local?'매장 선택에 필요한 등록정보 정리':`${cost} 질문의 답변 문서 작성`,setup:book.local?`스마트플레이스의 업체명·지점·주소와 홈페이지를 맞추고 「${operation}」 항목을 담당자가 갱신해야 합니다.`:`「${cost}」 질문에 대한 답을 첫 문단에 쓰고 상세 조건을 표로 정리해야 합니다.`,creative:book.local?`「${proof}」에 맞는 현재 매장 자료를 등록하고 사진의 촬영 시점과 설명을 써야 합니다.`:`「${proof}」의 원문 링크·작성자·확인일을 주장 옆에 표시해야 합니다.`,conversion:book.local?'공개 플레이스에서 홈페이지·길찾기·예약의 실제 연결 주소를 각각 확인해야 합니다.':'질문 문서에서 관련 상세 설명으로 이동한 이용자를 집계해야 합니다.',review:book.local?'API에서 확인한 업체 기본정보와 사업주가 직접 확인할 운영정보를 구분해야 합니다.':'게시 URL의 검색 수집 여부와 실제 AI 답변의 인용 URL을 각각 기록해야 합니다.'},
  {id:'visual',label:'사진·영상 · 과정 설명',role:`${koreanParticle(book.assets[0],'object')} 시각 자료로 설명`,setup:`전체 홍보 영상 대신 「${book.preparation[1]}」 한 가지를 설명하는 사진·영상 묶음을 만들어야 합니다.`,creative:`첫 장면에 질문, 중간에 실제 자료, 마지막에 「${book.assets[1]}」 원문 이동을 넣어야 합니다.`,conversion:'소재별 상세 페이지 이동 수와 도착 후 이탈을 나눠 확인해야 합니다.',review:'화면 속 자료와 본문 조건이 같은지 확인하고 공개 권한이 없는 정보는 가려야 합니다.'},
  {id:'followup',label:f.information?'이용 동선 · 후속 자료':f.mode==='visit'?'방문 동선 · 현장 안내':'접수 운영 · 담당 처리',role:`${book.stages[2]} 이후 다음 상태 안내`,setup:f.information?`「${operation}」 링크를 본문 끝에 배치하고 이동한 문서의 제목과 기관을 표시해야 합니다.`:f.mode==='visit'?'지도 핀·출입구·주차장 위치를 구분하고 휴무일 안내를 길찾기 버튼 옆에 표시해야 합니다.':`${book.stages[2]} 기록에 담당자·접수시각·처리상태를 연결해야 합니다.`,creative:f.information?'본문 끝에는 이미 읽은 설명 대신 추가로 확인할 문서 제목을 써야 합니다.':f.mode==='visit'?'도착 후 입장·대기·수령 위치를 사진 한 장과 짧은 캡션으로 설명해야 합니다.':'접수 완료 화면에는 요청 내용의 구분·다음 안내 시점·변경 방법을 써야 합니다.',conversion:`${book.outcome} 기록을 클릭 기록과 분리해야 합니다.`,review:f.information?'끊어진 출처·종료된 공고·이동된 게시판 링크를 수정해야 합니다.':f.mode==='visit'?'현장 이용 기록이 연결되지 않으면 길찾기 클릭을 방문 수로 표시하지 않아야 합니다.':'미배정·중복·진행 불가 상태를 나눠 담당자가 처리해야 합니다.'},
 ];
}
export function editorialContent(book:NonCommercePlaybook,sources:StrategySource[]):ServiceStrategy['content']{
 const [scope,proof,terms,operation]=editorialFocus(book).fields;
 const specs=[
  {title:book.assets[0],angle:`${koreanParticle(scope,'object')} 한눈에 구분할 자료`,outline:[`${scope}: 실제 제공하는 항목별로 소제목을 나눠야 합니다.`,'대상별 적용 예시를 한 가지씩 쓰고 제외 항목을 바로 아래에 표시해야 합니다.','소개한 각 항목에 해당 상세 URL을 연결해야 합니다.'],cta:'제공 항목 자세히 보기'},
  {title:`${terms} 비교표`,angle:`${terms}의 차이를 비교할 자료`,outline:[`행은 선택안, 열은 「${terms}」 기준으로 비교표를 만들어야 합니다.`,'별도 확인이 필요한 칸에는 확인 경로를 표시해야 합니다.','서로 다른 기간·단위·범위의 수치를 같은 조건으로 정리해야 합니다.'],cta:'조건별 차이 보기'},
  {title:`${proof} 근거 자료`,angle:`${koreanParticle(proof,'object')} 설명하는 근거 자료`,outline:[`${koreanParticle(proof,'object')} 보여주는 원자료를 선택해야 합니다.`,'자료마다 실제 적용 대상과 작성일을 붙여야 합니다.','사진·도표에 보이는 내용을 캡션과 본문으로 설명해야 합니다.'],cta:'근거 자료 열기'},
  {title:'이용 전 준비표',angle:`${book.cta} 전에 정리할 항목`,outline:book.preparation.slice(0,3).map(x=>`「${x}」의 확인 방법과 준비 시점을 써야 합니다.`),cta:book.cta},
  {title:'변경·예외 안내',angle:`${koreanParticle(operation,'subject')} 달라지는 경우의 처리`,outline:['변경 사유별로 적용되는 안내를 구분해야 합니다.','기존 조건·변경된 조건·적용일을 함께 표시해야 합니다.','확인이 필요한 사람과 갱신 담당자의 연락 경로를 나눠 써야 합니다.'],cta:'변경 조건 확인'},
  {title:'진행 상태 안내',angle:`${book.stages[2]} 이후 어디까지 진행됐는지 설명`,outline:[`${book.stages[2]} 완료 화면에 현재 상태를 표시해야 합니다.`,`${book.stages[3]}에 필요한 다음 행동과 담당 역할을 알려야 합니다.`,`${book.stages[4]} 확인 방법을 마지막 단계에 써야 합니다.`],cta:'다음 단계 확인'},
 ];
 const evidence=allocateSources(sources,[/소개|범위|대상|업무|메뉴/,/비교|가격|비용|조건|요금|기간/,/의료진|강사|담당|인증|자료|사진|규격|약관/,/준비|서류|필수|체크/,/변경|예외|취소|정정/,/접수|확정|진행|조회|절차/]);
 return specs.map((s,i)=>({...s,title:`${book.label} · ${s.title}`,sourceUrls:[...new Set(evidence[i].map(e=>e.url))]}));
}
export function editorialMeasurement(book:NonCommercePlaybook):Pick<ServiceStrategy,'funnel'|'metrics'|'experiments'>{
 const f=editorialFocus(book),[scope,proof,terms,operation]=f.fields;
 const event=f.mode==='public'?['program_view','eligibility_view','official_apply_click','receipt_confirmed','status_checked']:f.mode==='read'?['article_view','body_read','related_link_click','source_open','return_visit']:f.mode==='community'?['board_view','post_read','participation_guide_view','participation_complete','return_visit']:f.mode==='visit'?['offering_view','visit_conditions_view','location_view','directions_click','visit_confirmed']:['detail_view','criteria_view','request_submit','request_confirmed','outcome_confirmed'];
 const definition=[`「${scope}」 상세 페이지 방문을 기록해야 합니다.`,`「${proof}」 설명 영역을 실제 열었을 때 기록해야 합니다.`,f.information?'표시된 공식·관련 경로로 이동했을 때 기록해야 합니다.':f.mode==='visit'?'지도·영업시간 안내를 열었을 때 기록해야 합니다.':'서버가 접수 성공을 반환했을 때만 기록해야 합니다.',f.mode==='public'?'공식 시스템의 접수번호 또는 연동된 접수 상태가 있을 때 기록해야 합니다.':f.mode==='read'?'원출처 링크를 열었을 때 기록해야 합니다.':f.mode==='community'?'실제 글·댓글 등록 성공을 확인했을 때 기록해야 합니다.':f.mode==='visit'?'길찾기 경로를 실행했을 때 기록해야 합니다.':`담당자가 「${book.stages[3]}」 상태를 확정했을 때 기록해야 합니다.`,`「${book.outcome}」을 확인할 수 있는 운영·이용 기록으로 집계해야 합니다.`];
 const checks=['다른 주제의 페이지 방문을 같은 분모에 합치지 않아야 합니다.','영역이 존재한다는 이유만으로 열람을 기록하지 않아야 합니다.',f.information?'링크 클릭을 외부 시스템의 완료로 바꾸지 않아야 합니다.':f.mode==='visit'?'주소 복사와 지도 열기를 각각 기록해야 합니다.':'오류·연속 클릭·중복 접수를 제거해야 합니다.',f.mode==='read'?'출처 이동을 내용 이해로 해석하지 않아야 합니다.':f.mode==='visit'?'길찾기 실행을 매장 방문으로 집계하지 않아야 합니다.':'확인 기록이 없으면 미측정으로 남겨야 합니다.','동일한 이용 집단과 관찰 기간으로 앞 단계와 연결해야 합니다.'];
 return {
  funnel:book.stages.map((stage,i)=>({stage,event:event[i],definition:definition[i],check:checks[i]})),
  metrics:[
   {name:'상세 정보 연결률',formula:'관련 상세 이동 이용자 ÷ 소개 페이지 방문 이용자 × 100',required:'소개·상세 페이지별 고유 이용자',interpretation:`${scope}별로 나눠 확인해야 합니다.`},
   {name:'조건 열람률',formula:'조건 영역 열람 이용자 ÷ 상세 페이지 방문 이용자 × 100',required:'조건 영역 열람 이벤트·상세 방문',interpretation:`${koreanParticle(terms,'object')} 읽기 전에 이탈하는지 확인해야 합니다.`},
   {name:f.information?'후속 자료 이동률':f.mode==='visit'?'길찾기 실행률':'정상 접수율',formula:f.information?'공식·관련 문서 이동 이용자 ÷ 본문 열람 이용자 × 100':f.mode==='visit'?'길찾기 실행 이용자 ÷ 위치 안내 열람 이용자 × 100':'정상 접수 건 ÷ 접수 화면 진입 이용자 × 100',required:f.information?'본문 열람·외부 이동 기록':f.mode==='visit'?'위치 열람·길찾기 실행 기록':'접수 화면 방문·서버 성공·중복 제거 기록',interpretation:'같은 기간과 유입 집단으로 계산해야 합니다.'},
   {name:`${book.outcome} 연결률`,formula:`같은 집단의 ${book.outcome} 확인 이용자 ÷ 앞 단계 확인 이용자 × 100`,required:'앞 단계와 최종 상태를 연결한 이용 기록',interpretation:'연결할 수 없는 외부·오프라인 결과는 계산하지 않아야 합니다.'},
   ...(f.information?[{name:'안내 갱신 완료율',formula:'원자료와 대조해 갱신한 문서 수 ÷ 점검 대상 문서 수 × 100',required:'문서별 원자료·확인일·검수 상태',interpretation:'내용을 수정하지 않은 자동 날짜 변경은 갱신으로 계산하지 않아야 합니다.'}]:[{name:f.mode==='visit'?'방문 정보 정합률':'처리 대기시간',formula:f.mode==='visit'?'현장과 일치하는 정보 항목 수 ÷ 점검한 정보 항목 수 × 100':'정상 접수부터 담당자의 첫 답변까지 소요시간 중앙값',required:f.mode==='visit'?'주소·운영시간·휴무·주차의 현장 대조표':'접수·답변 시각·운영시간',interpretation:f.mode==='visit'?'지점별로 따로 집계해야 합니다.':'자동 수신 알림을 담당자 답변으로 계산하지 않아야 합니다.'}]),
  ],
  experiments:[
   {title:'01 · 첫 화면 정리',hypothesis:`${koreanParticle(scope,'subject')} 첫 화면에서 바로 구분되는가`,change:`첫 제목과 설명에 ${koreanParticle(scope,'object')} 쓰고 상세 연결 버튼을 배치해야 합니다.`,metric:'소개 → 상세 이동률',decision:'수정 전후 같은 유입 경로에서 상세 이동과 다음 단계 이탈을 비교해야 합니다.'},
   {title:'02 · 선택 조건 구체화',hypothesis:`${terms} 관련 질문에 본문이 답하는가`,change:`실제 문의에서 반복된 질문 하나를 골라 ${terms} 표를 보완해야 합니다.`,metric:'조건 열람률·동일 질문 재문의 건',decision:'조건 열람이 늘고 같은 질문이 줄었는지 대조해야 합니다.'},
   {title:'03 · 다음 행동 연결',hypothesis:`${book.cta} 경로가 중간에 끊기지 않는가`,change:`버튼 → ${book.stages[2]} → ${book.stages[3]} 화면을 PC·모바일에서 각각 실행해야 합니다.`,metric:f.information?'연결 오류·후속 자료 이동률':f.mode==='visit'?'지도 오류·길찾기 실행률':'접수 오류·중복·완료율',decision:'연결 오류를 해결한 뒤 정상 완료 기록으로 비교해야 합니다.'},
   {title:'04 · 운영 결과 대조',hypothesis:`${operation} 안내와 실제 처리가 일치하는가`,change:`변경한 안내의 적용일을 남기고 ${book.outcome} 기록과 연결해야 합니다.`,metric:`${book.outcome} 연결률·갱신 누락`,decision:'관찰 기간을 채운 같은 집단의 결과로 유지·재수정을 결정해야 합니다.'},
  ],
 };
}
