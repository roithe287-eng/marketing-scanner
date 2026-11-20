import {classificationText,isSecondarySection,offeringClauses} from './websiteIdentity';
import type {BusinessProfile} from './businessContext';
import {sameSite} from './siteIdentity';

export const fortuneTopic=/사주(?!\s*(?:팔기|조합|매입|주식|펀드))|만세력|명리학|명리\s*상담|타로|신점|운세|점성술|(?:사주|연애|결혼|커플|속)\s*궁합|철학관|역술/;
export const fortuneKeywords=['신년 사주','신년운세','무료 만세력','오늘의 운세','무료 사주','사주 풀이','사주 궁합','사주 상담','타로 상담','전화 사주','방문 상담','만세력','타로','신점','운세','사주','궁합'];
export const fortuneStart=/^(?!.*(?:배너\s*보기|상담사\s*보기|소개\s*보기|설명\s*보기)).*(?:시작하기$|바로\s*입력|얘기해\s*보자|생일로\s*확인하기|만세력\s*계산|(?:만세력|사주|운세|궁합|타로|풀이|결과)[^.!?]{0,22}(?:보기|보러\s*가기|확인하기|시작하기|계산하기|뽑기)$|무료로\s*(?:보기|시작하기)$)/;
export const fortuneRemote=/(?:전화|채팅|화상)로\s*(?:만나는|받는)\s*(?:사주|타로|신점|운세)|(?:전화|채팅)\s*사주|(?:전화|통화|채팅|카카오톡|카톡|화상|비대면|온라인)\s*(?:으로\s*|[·/와과]\s*)?(?:1\s*[:대]\s*1\s*)?(?:(?:사주|타로|신점|명리)\s*)?(?:상담|예약)|(?:상담|예약)\s*(?:방식|채널)\s*[:：]?\s*(?:전화|채팅|화상)/;
export const fortuneVisit=/철학관|점집|타로\s*샵|오시는\s*길|(?:대면|방문|현장)\s*(?:상담|예약)|주차\s*(?:안내|가능)/;
const consult=/(?:1\s*[:대]\s*1|상담사|역술인|역술가|선생님과|예약제|상담료|상담\s*(?:시간|예약|문의|신청)|예약\s*(?:하기|문의|상담))|(?:사주|타로|신점|명리|운세)\s*(?:풀이\s*)?상담/;
const digital=/(?:무료|온라인)\s*(?:사주|타로|운세)\s*(?:계산기|뽑기|풀이\s*(?:도구|서비스))|만세력\s*(?:계산|보기)|무료\s*만세력|(?:디지털|기본|프리미엄|유료|AI)\s*리포트|(?:사주|운세|궁합)\s*(?:분석\s*)?리포트|무료\s*티저|자동\s*(?:분석|생성|풀이)|사주\s*결과|(?:생년월일|출생\s*시간).{0,28}(?:입력|풀이|결과|확인)|(?:웹사이트|앱|브라우저)에서.{0,18}(?:읽|보|열람)|(?:운세|사주|만세력)\s*(?:앱|어플)|만세력(?:으로|을?\s*통해).{0,22}(?:분석|계산)/;
const thirdParty=/(?:사주|타로|운세|신점|점집|철학관|역술인|상담사).{0,14}(?:모음|디렉터리|목록|순위|비교\s*사이트|매칭\s*플랫폼)|(?:점집|철학관|상담소)\s*(?:추천|찾기)|(?:방문|상담)\s*후기\s*모음/;

export function firstPartyFortuneTools(url:string,elements:readonly {kind:string;text:string;href?:string;region?:string;heading?:string;section?:{label:string}}[]=[]){
  const labels=[/(?:^|\s)만세력(?:\s*(?:앱|도구|계산기))?$/u,/(?:^|\s)AI(?:\s*(?:사주|운세|풀이))?$/iu,/운세\s*테스트$/u];
  return elements.filter(el=>el.kind==='cta'&&el.href&&el.href.split('#')[0]!==url.split('#')[0]&&sameSite(el.href,url)&&
    !['header','nav','footer'].includes(el.region||'')&&!isSecondarySection(el.section?.label||el.heading||'',el.text,el.href)&&labels.some(label=>label.test(el.text.trim())));
}

export function detectFortuneService(input:{url:string;headings:string;description:string;body:string;actions:string[];linkedTools?:boolean}){
  const path=new URL(input.url).pathname;
  if(/\/(?:blog|news|articles?|posts?|columns?|reviews?|guide|legal)(?:\/|$)/i.test(path))return;
  const active=(text:string)=>offeringClauses(text).filter(s=>!/(?:상담|예약|풀이).{0,8}(?:종료|중단|미제공|불가|하지\s*않)|(?:^|\s)(?:관련글|고객사|참고\s*자료)\s*[:：]/.test(s)).map(classificationText).join('\n');
  const headings=active(input.headings),description=active(input.description),body=active(input.body);
  const primary=headings+'\n'+description;
  if(!fortuneTopic.test(primary)||thirdParty.test(primary)||/(?:운세|사주|타로)\s*(?:칼럼|기사|매거진|해설\s*블로그)|(?:명리|사주|타로)\s*(?:책|교재|교본|카드)\s*(?:판매|구매|쇼핑몰)/.test(headings))return;
  const source=[primary,body].join('\n');
  const direct=(text:string)=>fortuneRemote.test(text)||fortuneVisit.test(text)||consult.test(text);
  const isAutomated=/(?:AI|인공지능)\s*(?:타로|사주|상담)/i.test(primary);
  if(direct(primary)&&!digital.test(primary)&&!isAutomated)return 'fortune_consultation';
  const hasStart=input.actions.some(a=>fortuneStart.test(a)&&(!/^시작하기$/.test(a)||/사주\s*풀이|운세|만세력|신년\s*사주/.test(source)));
  if(digital.test(source)||isAutomated||hasStart||(input.linkedTools&&/사주|만세력/u.test(primary)&&/운세|궁합|타로/u.test(primary)))return 'fortune_digital';
  if(direct(body))return 'fortune_consultation';
}

export const fortunePersonalData=/생년월일(?:시)?|출생\s*(?:일|시간)|(?:양력|음력).{0,14}(?:입력|선택)|(?:입력|선택).{0,14}(?:양력|음력)|개인정보\s*(?:처리|수집|보관)|제3자|파기|삭제\s*(?:신청|방법)/;
export const fortunePricing=/무료\s*(?:티저|만세력|풀이|운세)|무료\s*(?:서비스|콘텐츠)|복채|상담료|가격|요금|결제\s*금액|\d[\d,]*\s*원/;
const digitalResult=/열람\s*(?:기간|가능)|다시\s*(?:보기|열람)|환불\s*(?:정책|조건|요청|제한)|결제\s*후|결과\s*(?:생성|확인)|보관함/;
const channels=/대면|방문\s*상담|전화\s*상담|채팅\s*상담|화상\s*상담|비대면|오시는\s*길/;
const appointment=/예약\s*(?:하기|방법|가능|확정|변경|취소|문의)|상담\s*(?:시간|예약|신청)|운영\s*시간|영업\s*시간/;
const commonCaution='운세 해석의 적중률·미래 결과·재회·수익을 보장하는 문구를 제안하지 않습니다. 생년월일시·궁합 상대 정보·개인 상담 내용은 광고 픽셀·전환 API·분석 URL이나 이벤트 속성에 담지 않습니다.';

export const fortuneDigitalProfile:BusinessProfile={
  label:'사주·운세 온라인 풀이형',industry:'fortune',kind:'service',goalKey:'start',goalLabel:'풀이 시작·결과 확인',
  keywords:fortuneKeywords.filter(k=>!/상담|^전화/.test(k)),caution:commonCaution+' 무료 범위·유료 리포트 구성·최종 결제금액·재열람 기간·환불 조건은 각 서비스 원문에서 확인합니다. 무료 도구만 제공하는 경우 결제 단계를 요구하지 않습니다.',
  checks:[
    {id:'topics',label:'풀이 유형과 무료·유료 진입 경로',match:fortuneTopic,guide:'실제로 제공하는 사주·궁합·신년운세·만세력 등 주요 주제별로 상세 페이지와 시작 버튼을 연결하세요. 무료 도구와 유료 리포트가 함께 있다면 차이를 첫 화면에서 구분하세요.'},
    {id:'input',label:'생년월일시 입력과 개인정보 안내',match:fortunePersonalData,guide:'입력 전 필수·선택 항목, 출생 시간을 모를 때의 처리, 입력 목적과 개인정보 안내 위치를 확인하세요. 타인의 정보를 받는 궁합에서도 같은 기준을 적용하세요.'},
    {id:'access',label:'결과 열람·재열람과 환불 조건',match:digitalResult,guide:'무료 결과가 어디까지 열리는지 확인하세요. 유료 리포트가 있는 경우 결제 전 제공 범위와 결과 접근 방법, 열람 기간, 환불·장애 문의 조건을 각각 연결하세요.'},
  ],
  questions:[
    {intent:'scope',question:'어떤 사주·운세 풀이와 만세력을 이용할 수 있나요?',fields:['실제 제공하는 풀이 유형','각 서비스의 시작 페이지'],match:fortuneTopic,placement:'서비스 목록과 주제별 상세 첫 문단'},
    {intent:'process',question:'풀이를 시작하려면 무엇을 입력하고 출생 시간을 모르면 어떻게 하나요?',fields:['필수·선택 입력 항목','출생 시간을 모를 때의 안내','개인정보 안내 경로'],match:fortunePersonalData,placement:'풀이 시작 버튼과 최초 입력 화면'},
    {intent:'price',question:'무료 풀이의 범위와 유료 리포트가 있는 경우 구성·가격은 어디서 확인하나요?',fields:['무료로 확인할 수 있는 범위','유료 제공 시 리포트별 구성·결제 금액'],match:fortunePricing,placement:'무료 결과와 유료 선택 화면'},
    {intent:'care',question:'결과를 다시 보는 방법과 해당되는 환불 조건은 무엇인가요?',fields:['결과 접근·재열람 방법','유료 결제 시 적용되는 환불·문의 조건'],match:digitalResult,placement:'결과 화면과 리포트별 이용·환불 안내'},
  ],
};

export const fortuneConsultationProfile:BusinessProfile={
  label:'사주·타로 상담 예약형',industry:'fortune',kind:'service',goalKey:'booking',goalLabel:'상담 문의·예약 요청',
  keywords:fortuneKeywords.filter(k=>!/무료|신년|오늘의|만세력/.test(k)),caution:commonCaution+' 전화·채팅·방문 등 실제 운영 방식과 상담사, 예약 가능 조건을 확인합니다.',
  checks:[
    {id:'scope',label:'상담 분야·담당자와 제공 방식',match:fortuneTopic,guide:'실제 상담 분야, 담당자와 확인 가능한 소개, 전화·채팅·방문 등 제공 방식을 상담 상세에서 구분하세요.'},
    {id:'booking',label:'예약·가능 시간·변경 조건',match:appointment,guide:'상담 방식과 희망 시간 선택에서 예약 요청·확정까지 확인하세요. 방문형의 위치·운영시간과 원격형의 접속 안내를 제공 방식에 맞춰 표시하세요.'},
    {id:'privacy',label:'준비 항목과 개인정보 안내',match:fortunePersonalData,guide:'상담에 실제 필요한 항목과 이용 목적을 안내하세요. 공개 후기·사례나 광고 예시에 상담자·상대방의 입력값과 사연이 들어가지 않도록 하세요.'},
  ],
  questions:[
    {intent:'scope',question:'어떤 사주·타로 상담을 받을 수 있고 전화·채팅·방문 중 어떤 방식인가요?',fields:['실제 상담 주제·담당자','상담 방식과 적용 조건'],match:channels,placement:'상담 분야와 담당자 안내'},
    {intent:'process',question:'상담 가능 시간과 예약 확정·변경 절차는 어떻게 되나요?',fields:['운영시간과 예약 경로','확정·변경·취소 방법'],match:appointment,placement:'상담 예약 버튼과 확정 안내'},
    {intent:'price',question:'상담료와 시간·인원에 따른 추가 비용은 어디에서 확인하나요?',fields:['상담별 비용과 시간','추가 비용·취소 조건'],match:fortunePricing,placement:'상담 유형 선택과 예약 전 요금표'},
  ],
};
