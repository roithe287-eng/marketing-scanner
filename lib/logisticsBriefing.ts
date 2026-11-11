import {z} from 'zod';
import {isConsentBoilerplate} from './contentBoilerplate';

const text=z.string().min(1).max(1500);
const source=z.object({url:z.string().url().max(2048),title:z.string().max(300),text:z.string().max(600)});
type Source=z.infer<typeof source>;
export const LogisticsBriefingSchema=z.object({
  version:z.literal(1),query:z.literal('해외이사'),basis:z.literal('reference-example-and-own-sources'),
  reference:text,scope:text,strategy:text,
  blocks:z.array(z.object({id:text,label:text,example:text,observed:z.array(text).max(4),review:z.array(text).max(4),
    evidence:z.array(source).max(3),action:text,placement:text,draft:text})).length(4),
  steps:z.array(z.object({title:text,customer:text,operator:text,verify:text,evidence:z.array(source).max(2)})).length(5),
  channels:z.array(z.object({name:text,role:text,deliverable:text,connection:text})).length(3),
  articles:z.array(z.object({title:text,intent:text,outline:z.array(text).max(4),asset:text,cta:text})).length(6),
  verification:z.array(z.object({title:text,action:text,metric:text})).length(4),
  references:z.array(z.object({label:text,url:z.string().url(),scope:text})).max(3),
});
export type LogisticsBriefing=z.infer<typeof LogisticsBriefingSchema>;
type BlockSpec={id:string;label:string;example:string;facets:{label:string;match:RegExp}[];action:string;placement:string;draft:string};
const blockSpecs:BlockSpec[]=[
  {id:'answer',label:'핵심 요약 답변',example:'해외이사의 범위와 준비 시점을 먼저 설명하는 도입 문단',
    facets:[{label:'해외이사 서비스',match:/해외\s*이사|해외이주화물/},{label:'포장·통관·배송 관련 표현',match:/포장|통관|배송|인도/},{label:'일정·출항 관련 표현',match:/일정|기간|출항|선적|도착/}],
    action:'회사 소개와 구분되는 해외이사 가이드 도입부를 작성하세요. 어떤 서비스인지, 고객이 확인할 조건이 무엇인지 먼저 답하고 절차·준비물·선택 기준으로 이어집니다. 사례 화면의 준비 기간을 자사의 공통 권장 기간으로 옮기지 않습니다.',
    placement:'해외이사 상세 첫 설명과 네이버 블로그 가이드의 첫 문단',
    draft:'해외이사를 준비할 때는 출발·도착지, 보낼 물품과 희망 일정을 먼저 정리하고 [실제 제공하는 포장·국제운송·통관·현지 배송 범위]를 확인합니다. 준비를 시작할 시점은 [운송 구간·방식·서류 등 실제 일정 기준]에 따라 안내합니다. 아래 절차와 체크리스트를 확인한 뒤 [서비스 담당 상담 경로]로 조건을 문의해 주세요.'},
  {id:'process',label:'진행 절차',example:'상담·견적 → 계약·일정 → 포장·출고 → 국제운송 → 통관·현지 배송의 5단계',
    facets:[{label:'상담·견적 조건',match:/견적|출발지|도착지|CBM|물량|부피/},{label:'계약·일정 안내',match:/계약|일정|출항|선적/},{label:'포장부터 인도까지',match:/포장|통관|배송|인도/}],
    action:'현재 절차 이름마다 고객 준비사항, 업체가 설명할 내용, 완료 확인 기준을 덧붙이세요. 한 단계만 떼어 읽어도 이해되는 문장으로 작성하고 포함 범위는 실제 계약 조건과 연결합니다.',
    placement:'해외이사 절차 원문의 번호 목록과 같은 주제를 다루는 블로그 본문',
    draft:'해외이사 진행은 [실제 상담·견적] → [계약·일정 협의] → [포장·출고] → [국제운송] → [도착지 통관·인도]로 구분해 안내합니다. 단계마다 [고객이 준비할 자료], [담당 주체], [완료 확인 방법]을 설명합니다. 제공 구간과 역할은 [계약상 포함 범위]에 따라 달라질 수 있습니다.'},
  {id:'preparation',label:'준비 체크리스트',example:'서류 준비, 짐 정리, 귀중품·운송 제한 품목을 나누는 목록',
    facets:[{label:'서류 준비',match:/서류|여권|비자|물품리스트|Packing List/i},{label:'짐 정리·품목별 포장',match:/물품|품목|포장자재|가전|가구|누락/},{label:'반입 제한·휴대 구분',match:/반입|금지|제한품목|귀중품|휴대|위험물/}],
    action:'서류 / 보내는 짐 / 별도 휴대 / 국가별 확인 항목으로 체크리스트를 나누세요. 각 항목에 누가 언제 확인하는지 붙이고 국가·품목별 공식 안내와 확인일을 연결합니다. 서류·위험물 규정을 모든 국가에 동일하게 적용하지 않습니다.',
    placement:'절차 안내 아래 체크리스트와 국가별 안내 글',
    draft:'상담 전에는 [출발·도착 구간]과 [물품 목록·일정]을 정리합니다. 서류는 [개별 조건에 맞춰 확인한 목록], 포장은 [품목별 사전 준비], 별도 휴대·운송 제한 품목은 [목적지 공식 안내 및 담당자 확인]에 따라 구분합니다. 이 목록의 적용 조건과 최근 확인일은 [작성일·검수자]와 함께 표시합니다.'},
  {id:'selection',label:'업체 선정 기준',example:'포장 전문성, 통관 경험, 견적 투명성을 비교하는 기준',
    facets:[{label:'포장 자재·작업 과정',match:/포장자재|전문인력|전문포장|전문 포장|장비/},{label:'통관 절차·담당 역할',match:/통관|서류|현지|담당/},{label:'비용 포함·별도 조건',match:/추가비용|추가\s*비용|포함|별도|운송조건/}],
    action:'추상적인 경력·만족도 문구에 더해 실제 포장 자재·작업 사진, 담당 역할, 항목이 구분된 견적 예시를 제시하세요. 통관 안내의 존재를 실적 증명으로 간주하지 말고 공개 가능한 사례와 자료를 별도로 확보합니다.',
    placement:'해외이사 업체 선택 가이드와 서비스 상세의 사례·견적 안내',
    draft:'해외이사 업체를 비교할 때는 [확인 가능한 포장 자재·작업 방식], [구간별 통관 준비와 담당 역할], [견적 포함·별도 비용]을 같은 조건으로 확인하세요. [공개 가능한 작업 사례·견적 항목 예시·현재 약관 링크]를 함께 검토하고, 확인되지 않은 인증이나 보상 범위를 공통 보장으로 받아들이지 않도록 설명합니다.'},
];

/** The screenshot is a structural example, never a live Naver observation or ranking signal. */
export function buildLogisticsBriefing(targetUrl:string,input:Source[]):LogisticsBriefing|undefined{
  const own=new URL(targetUrl).hostname.replace(/^www\./,'');
  const sources=input.filter(s=>{try{return new URL(s.url).hostname.replace(/^www\./,'')===own&&!isConsentBoilerplate(s.text)&&!/후기|testimonial|REVIEW_ONLY/i.test(s.title);}catch{return false;}});
  if(!sources.some(s=>/해외\s*이사|해외이주화물/.test(s.text)))return;
  const evidence=(patterns:RegExp[],max=3)=>{
    const candidates=sources.filter(s=>patterns.some(p=>p.test(s.text)))
      .sort((a,b)=>Number(new URL(b.url).pathname!=='/')*4-Number(new URL(a.url).pathname!=='/')*4+patterns.filter(p=>p.test(b.text)).length-patterns.filter(p=>p.test(a.text)).length||Number(b.text.length>=45)-Number(a.text.length>=45))
      .filter((s,i,a)=>a.findIndex(x=>x.text===s.text)===i);
    const selected:Source[]=[];
    for(const pattern of patterns){
      if(selected.length>=max||selected.some(s=>pattern.test(s.text)))continue;
      const item=candidates.find(s=>pattern.test(s.text));if(item)selected.push(item);
    }
    return [...selected,...candidates.filter(s=>!selected.includes(s))].slice(0,max);
  };
  return LogisticsBriefingSchema.parse({version:1,query:'해외이사',basis:'reference-example-and-own-sources',
    reference:'해외이사 검색 화면 사례를 참고했습니다. 사례에는 요약 답변·5단계 절차·준비 체크리스트·업체 선정 기준과 이미지 카드·블로그 출처가 표시되어 있습니다.',
    scope:'사례 화면의 촬영일·검색 조건과 전체 출처 URL은 확인되지 않았습니다. 현재 네이버 AI 브리핑을 자동 수집하거나 자사 인용 여부를 측정한 결과가 아닙니다. 아래 원문 단서는 수집 범위의 표현이며 답변의 충분성·최신성을 인증하지 않습니다.',
    strategy:'해외이사라는 정보 탐색 질문에 답하는 대표 가이드와 구체적인 작업·국가별 사례를 연결하세요. 홈페이지에는 서비스 조건의 기준 문서를, 블로그에는 실제 경험과 상황별 설명을 쌓고, 확인한 조건에 맞는 견적 상담으로 이어지도록 구성합니다.',
    blocks:blockSpecs.map(s=>({...s,facets:undefined,observed:s.facets.filter(f=>sources.some(e=>f.match.test(e.text))).map(f=>f.label),review:s.facets.filter(f=>!sources.some(e=>f.match.test(e.text))).map(f=>f.label),evidence:evidence(s.facets.map(f=>f.match))})),
    steps:[
      {title:'1. 상담·견적',customer:'출발·도착 국가와 도시, 물품 종류·예상 물량, 희망 시점을 정리합니다.',operator:'물량 확인 방식, 해상·항공 등 실제 제공 방식과 견적 포함·별도 항목을 설명합니다.',verify:'CBM 산정, 금액, 유효기간은 실제 견적 기준으로 채웁니다. 공개 폼 라벨만으로 충분한 안내라고 판단하지 않습니다.',evidence:evidence([/견적|입력 항목|물량|부피|CBM/i],2)},
      {title:'2. 계약·일정 협의',customer:'견적서의 구간·포함 항목·추가 비용과 희망 일정을 대조합니다.',operator:'포장일·출항일·도착·인도 예정일의 차이와 보험 확인 절차를 안내합니다.',verify:'계약·보험·변경 조건은 현재 문서와 대조합니다. 예시 화면의 준비 기간을 확정 납기로 쓰지 않습니다.',evidence:evidence([/계약|일정|출항|보험/],2)},
      {title:'3. 포장·출고',customer:'보낼 짐·남길 짐·별도 확인할 물품을 구분하고 작업 환경을 알립니다.',operator:'품목별 자재·작업 과정, 누락 확인과 출고 전 점검을 실제 사진·설명으로 보여줍니다.',verify:'사진 속 이름·주소·문서를 가리고 촬영·공개 권한을 확인합니다. 이미지만 올리지 말고 설명을 본문에도 적습니다.',evidence:evidence([/포장자재|포장작업|전문포장|누락물품|장비/],2)},
      {title:'4. 국제운송',customer:'구간과 운송 방식, 변경 안내를 받을 연락 경로를 확인합니다.',operator:'실제 제공 구간의 운송 과정과 일정이 달라질 수 있는 조건을 설명합니다.',verify:'개별 사례의 운임·기간을 공통 약속으로 사용하지 않습니다. 선적·도착·인도 기준 시점을 구분합니다.',evidence:evidence([/출항|선적|해상|항공|운송한다|운송편/],2)},
      {title:'5. 통관·현지 인도',customer:'자신의 조건에 맞는 서류·인도 범위와 도착 후 확인 절차를 상담합니다.',operator:'도착지 담당 역할, 계약에 포함된 배송·배치 범위, 손상 발견 시 연락 경로를 안내합니다.',verify:'국가·품목·계약에 따른 예외와 공식 확인 경로를 적고 통관 가능·보상을 일괄 보장하지 않습니다.',evidence:evidence([/수입통관|배송서비스|인도|Door To|파손/i],2)},
    ],
    channels:[
      {name:'홈페이지 · 조건을 확인하는 기준 문서',role:'해외이사의 정의·단계·준비·선택 기준과 현재 제공 범위를 한 곳에서 확인',deliverable:'해외이사 대표 가이드 1개와 실제 제공 국가별 상세 안내를 구성합니다. 단계별 설명, 견적 항목, 약관·공식 참고 링크, 담당 부서와 갱신일을 함께 관리합니다.',connection:'블로그의 경험 글에서 관련 서비스·조건 안내로 연결하고, 홈페이지에서는 해당 가이드를 읽은 고객이 상담 준비 정보를 바로 남길 수 있게 연결합니다.'},
      {name:'네이버 블로그 · 경험과 상황별 설명',role:'검색 사례에서 보인 블로그 출처 형태를 참고해 실제 작업 경험을 구체화',deliverable:'아래 6개 주제 중 실제 상담·작업 자료가 있는 글부터 작성합니다. 홈페이지 문장을 그대로 복제하지 말고 구간·준비 과정·문제 해결·사진 설명을 추가하고 운영 주체를 명확히 밝힙니다.',connection:'글의 질문에 먼저 답한 뒤 관련 홈페이지 원문과 다음에 읽을 글을 연결합니다. 모든 문단을 상담 유도로 끝내거나 동일 키워드를 반복하지 않습니다.'},
      {name:'사진·영상 · 설명을 뒷받침하는 작업 자료',role:'상단 이미지 카드 사례를 참고해 현장 과정을 읽고 이해할 수 있는 자료 확보',deliverable:'대표 이미지 1개와 포장 자재·작업·출고·인도 등 권한이 확보된 실제 사진을 선별합니다. 사진마다 무엇을 보여주는지 설명하고 웹 이미지에는 적절한 대체 텍스트를 붙입니다.',connection:'핵심 준비사항은 이미지 안에만 넣지 않고 본문에도 제공합니다. 카드 노출·썸네일 선택은 직접 제어하거나 보장할 수 없습니다.'},
    ],
    articles:[
      {title:'해외이사 절차, 상담부터 현지 인도까지 무엇을 확인할까요?',intent:'절차를 처음 알아보는 정보 탐색',outline:['첫 문단에서 진행 흐름과 적용 조건 요약','5단계별 고객 준비·업체 담당·완료 확인','현재 조건의 원문과 관련 체크리스트 연결'],asset:'단계별 실제 작업 사진 또는 자사 절차 도식과 본문 설명',cta:'내 구간·일정에 맞는 절차 확인'},
      {title:'해외이사 견적 비교 전 확인할 물량·포함 비용·별도 항목',intent:'가격 차이의 이유와 비교 조건 확인',outline:['견적에 필요한 구간·물품·일정 정리','실제 견적서의 포함·선택·별도 항목 설명','금액·기간을 확정하는 절차와 조건 안내'],asset:'개인정보·거래 조건을 가린 견적 항목 예시',cta:'같은 조건으로 견적 요청'},
      {title:'해외이사 준비 체크리스트: 서류·짐 정리·국가별 확인',intent:'상담 전 준비할 일을 구체화',outline:['서류·포장 준비·별도 휴대·확인 필요 품목을 구분','국가별 조건은 공식 자료와 확인일 표시','일괄 금지·허용으로 단정하지 않고 담당 확인 연결'],asset:'검수한 준비 항목표와 본문 목록',cta:'내 물품의 준비 조건 문의'},
      {title:'해외이사 업체 선택 기준: 포장·통관 대응·견적 투명성',intent:'업체 비교에 필요한 증거 확인',outline:['경력 소개와 실제 작업 근거 구분','포장 자재·담당 역할·견적 항목 비교','자사의 공개 가능한 사례와 적용 조건 연결'],asset:'자사 작업 근거와 항목별 비교 체크표',cta:'우리 조건에 맞는 제공 범위 확인'},
      {title:'[실제 제공 국가] 해외이사, 출발 전에 확인할 조건',intent:'국가·도시별 구체적인 준비',outline:['실제 제공 구간·확인 날짜를 먼저 명시','일반 가이드와 달라지는 서류·품목·현지 인도 조건','최신 공식 근거와 구간 담당 경로 연결'],asset:'해당 구간의 공개 가능한 작업 자료와 출처 링크',cta:'해당 구간 상담하기'},
      {title:'[실제 작업 구간] 해외이사 기록: 준비·포장·인도에서 확인한 점',intent:'실제 수행 사례를 통한 선택 판단',outline:['작업 시점·구간·비식별 물품 특성·수행 범위','고객이 준비한 일과 현장에서 해결한 과정','개별 사례와 현재 공통 조건의 차이 설명'],asset:'공개 권한이 있는 자사 작업 사진·담당자 검수 기록',cta:'비슷한 조건의 운송 가능 범위 상담'},
    ],
    verification:[
      {title:'1. 원문·운영 조건 검수',action:'운영 담당자가 단계별 역할·비용 항목·서류·약관을 확인하고 대괄호를 채웁니다. 실제 경험과 작성·검수 주체, 갱신일을 표시합니다.',metric:'확인한 운영 항목과 남은 확인 항목을 구분한 게시 전 검수 기록'},
      {title:'2. 발행·검색 반영 확인',action:'홈페이지와 블로그의 제목·본문·원문 링크가 일치하는지 확인합니다. 소유한 홈페이지는 서치어드바이저에서 수집·색인 상태를 별도로 점검합니다.',metric:'발행 URL·발행일·검색 반영 확인일. 수집·색인과 AI 브리핑 인용은 별도 상태'},
      {title:'3. AI 브리핑 직접 관측',action:'해외이사·해외이사 절차·해외이사 준비물·해외이사 업체 선택과 실제 제공 국가 조합을 정하고 PC·모바일, 로그인 여부, 확인일을 기록합니다. 출처 전체보기를 열어 자사 홈페이지·블로그 URL과 연결 문장을 확인합니다.',metric:'질의별 브리핑 생성 여부 / 브랜드 언급 / 홈페이지 URL 인용 / 블로그 URL 인용을 각각 기록. 일부 화면에 없다는 이유로 전체 미노출로 확정하지 않음'},
      {title:'4. 상담 품질과 연결 확인',action:'콘텐츠 방문, 상담 시작, 정상 접수, 유효 문의와 견적 발송을 서비스별로 대조합니다. AI 브리핑 유입을 별도로 식별할 근거가 없으면 네이버 전체 유입을 AI 성과로 바꾸지 않습니다.',metric:'콘텐츠별 유효 문의·견적 연결과 확인 가능한 유입 출처. 게시 전후 동일 조건으로 관찰'},
    ],
    references:[
      {label:'네이버 서치어드바이저 · 콘텐츠 작성시 권장 사항',url:'https://searchadvisor.naver.com/guide/content-basic',scope:'경험·전문성, 읽기 쉬운 구성, 본문 텍스트와 원문 출처에 관한 일반 가이드입니다. AI 브리핑 선정 공식이나 보장 조건이 아닙니다.'},
      {label:'네이버 · 검색 및 AI 브리핑 소개',url:'https://www.navercorp.com/service/search',scope:'검색 의도에 맞춘 요약과 원문 출처 연결을 설명하는 서비스 안내입니다.'},
    ],
  });
}
