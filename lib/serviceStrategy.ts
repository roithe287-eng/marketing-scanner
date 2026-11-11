import {z} from 'zod';
import type {ExtractedWebsiteData} from './extractWebsite';
import {analyzeBusinessContext} from './businessContext';
import {isConsentBoilerplate} from './contentBoilerplate';

const text=z.string().min(1).max(1200);
const source=z.object({url:z.string().url().max(2048),title:z.string().max(300),text:z.string().max(600)});
const segment=z.object({id:z.string(),label:text,audience:text,evidence:z.array(source).min(1).max(3),
  landingUrl:z.string().url().optional(),diagnosis:text,questions:z.array(text).max(4),keywords:z.array(text).max(5),
  landingBlocks:z.array(text).max(6),headline:text,message:text,cta:text,metric:text});
const channel=z.object({id:z.string(),label:text,role:text,setup:text,creative:text,conversion:text,review:text});
export const ServiceStrategySchema=z.object({
  version:z.literal(1),industry:z.literal('logistics'),targetUrl:z.string().url(),capturedAt:z.string().datetime(),
  basis:z.literal('source-backed-playbook'),summary:text,notice:text,sources:z.array(source).max(24),
  findings:z.array(z.object({title:text,observed:text,interpretation:text,action:text,evidence:z.array(source).max(3)})).max(5),
  segments:z.array(segment).min(1).max(5),channels:z.array(channel).max(4),
  funnel:z.array(z.object({stage:text,event:text,definition:text,check:text})).max(6),
  metrics:z.array(z.object({name:text,formula:text,required:text,interpretation:text})).max(6),
  experiments:z.array(z.object({title:text,hypothesis:text,change:text,metric:text,decision:text})).max(4),
  content:z.array(z.object({title:text,angle:text,outline:z.array(text).max(4),cta:text,sourceUrls:z.array(z.string().url()).max(3)})).max(5),
});
export type ServiceStrategy=z.infer<typeof ServiceStrategySchema>;
type SegmentSpec=Omit<z.infer<typeof segment>,'evidence'|'landingUrl'|'diagnosis'> & {match:RegExp};

const segments:SegmentSpec[]=[
  {id:'outbound',label:'해외이사',match:/해외\s*이사|international\s*(?:moving|relocation)/i,
    audience:'해외 발령·이주·유학 등으로 생활 물품을 보내려는 개인·가족 고객 가설입니다. 실제 문의 사유와 매출 비중으로 우선 고객을 정하세요.',
    questions:['도착 국가·도시와 이사 일정에 맞춰 맡길 수 있는가','포장·통관·현지 배송 중 어디까지 담당하는가','견적에 포함되지 않는 비용과 파손 시 절차는 무엇인가'],
    keywords:['해외이사 견적','[실제 제공 국가] 해외이사','해외이사 준비물','해외이사 비용 산정'],
    landingBlocks:['첫 화면: 해외이사 대상·운송 구간과 견적 상담 버튼','상담에 필요한 출발지·도착지·일정·물품 개요','포장→운송→통관→인도 단계와 담당 주체','견적 포함·별도 비용과 확인이 필요한 예외','실제 운송 사례의 조건과 원문 근거','견적 상담 양식과 접수 후 진행 안내'],
    headline:'해외이사, 출발부터 현지 인도까지 먼저 확인하세요',message:'이사할 국가·도시와 준비 상황에 맞춰 운송 범위·준비 서류·견적 항목을 상담하세요. 제공 구간과 조건은 담당자 확인 후 확정합니다.',cta:'해외이사 견적 상담',metric:'해외이사 유효 문의율과 견적 발송률'},
  {id:'return',label:'귀국이사',match:/귀국\s*이사|return\s*(?:moving|relocation)/i,
    audience:'해외 거주를 마치고 한국으로 생활 물품을 들여오는 개인·가족 고객 가설입니다. 출발 국가와 국내 도착 지역별 문의를 분리하세요.',
    questions:['해외 현지 집하와 국내 배송의 담당 연락처는 어디인가','귀국 일정과 화물 도착 일정이 다르면 어떻게 준비하는가','이사화물 통관 대상과 준비 서류는 어디에서 확인하는가'],
    keywords:['귀국이사 견적','[출발 국가] 한국 귀국이사','귀국이사 준비 서류','귀국이사 통관 안내'],
    landingBlocks:['첫 화면: 한국 귀국 고객임을 명확히 안내','출발 국가·국내 도착지·희망 시점 입력','해외 집하→국제운송→국내 통관·배송 안내','국가·고객 조건별 준비 서류 확인 경로','도착 일정 차이와 보관 필요 여부 확인','귀국 담당자 상담과 견적 진행 순서'],
    headline:'귀국 일정과 이삿짐 도착, 함께 준비하세요',message:'출발 국가와 국내 도착지, 준비된 물품 정보를 남기고 귀국이사 절차를 확인하세요. 통관 조건과 일정은 고객 상황에 따라 별도 확인이 필요합니다.',cta:'귀국이사 상담하기',metric:'귀국이사 문의의 구간·일정 확인 완료율'},
  {id:'sea',label:'기업 해상운송',match:/SEA\s*FREIGHT|해상\s*운송|NVOCC|consolidation/i,
    audience:'수출입 화물 운송을 검토하는 기업의 물류·구매 담당자 가설입니다. 개인 이삿짐 문의와 별도 상담 흐름으로 구분하세요.',
    questions:['화물 종류·부피·중량과 운송 구간을 처리할 수 있는가','견적의 운임·현지 비용·부대 비용은 어떻게 구분되는가','선적부터 인도까지 담당자와 진행 정보는 어떻게 받는가'],
    keywords:['해상운송 견적','수출입 화물 운송','[실제 운송 구간] 포워딩','기업 해상운송 상담'],
    landingBlocks:['기업 화물 전용 제목과 서비스 범위','출발·도착 항만 및 화물 제원 확인','해상운송 방식과 실제 제공 범위','견적 포함 비용·현지 비용·변동 조건','서류·진행 상황·담당자 커뮤니케이션','기업 견적 요청과 후속 서류 안내'],
    headline:'수출입 화물, 구간과 조건에 맞는 운송을 검토하세요',message:'화물 종류·출발지·도착지와 물량을 바탕으로 해상운송 범위와 견적 항목을 확인하세요. 운임·운항 일정·부대 비용은 개별 견적으로 안내합니다.',cta:'기업 화물 견적 문의',metric:'기업 유효 견적 요청률과 견적 대비 계약률'},
  {id:'air',label:'기업 항공운송',match:/AIR\s*FREIGHT|항공\s*운송|air\s*cargo/i,
    audience:'납기와 화물 조건을 함께 검토하는 기업 담당자 가설입니다. 긴급성만 강조하기 전에 실제 취급 화물·구간·접수 조건을 확인하세요.',
    questions:['중량·규격·품목 조건으로 항공운송을 접수할 수 있는가','희망 일정과 실제 출항·도착 조건은 어떻게 협의하는가','포장·서류·통관 준비는 누가 담당하는가'],
    keywords:['항공운송 견적','항공화물 운송 상담','[실제 운송 구간] 항공화물','수출 항공운송'],
    landingBlocks:['항공화물 대상과 실제 취급 범위','품목·규격·중량·희망 일정 확인','포장·서류·통관 준비와 담당 역할','운임 산정·일정 변동·제외 조건','진행 상황 확인 및 담당자 연락','항공운송 조건 상담'],
    headline:'항공화물, 납기와 화물 조건부터 확인하세요',message:'품목·규격·중량과 희망 일정에 맞춰 접수 가능 범위와 준비사항을 상담하세요. 확정되지 않은 도착일이나 운송 가능 여부를 약속하지 않습니다.',cta:'항공운송 조건 상담',metric:'화물 조건 확인 완료율과 항공 견적 발송률'},
  {id:'storage',label:'이사화물 보관',match:/보관\s*서비스|storage\s*(?:service|facility)|보관료|보관\s*창고/i,
    audience:'입주·귀국 일정과 화물 이동 일정이 달라 보관이 필요한 고객 가설입니다. 독립 수요인지 이사와 결합한 수요인지 접수 시 구분하세요.',
    questions:['어떤 물품을 어느 기간 동안 맡길 수 있는가','보관·입출고·추가 운송 비용은 어떻게 안내되는가','보관 중 취급·보험·책임 범위는 어디에서 확인하는가'],
    keywords:['해외이사 짐 보관','귀국이사 보관 서비스','이사화물 보관 비용','입주 전 이삿짐 보관'],
    landingBlocks:['보관 대상·이용 목적과 실제 시설 정보','품목·물량·예상 보관 기간 확인','입고→보관→출고·배송 과정','보관료·입출고료·추가 비용 기준','취급 제외 품목·책임·보험 조건','이사와 보관을 함께 상담하는 경로'],
    headline:'이사 일정이 달라졌다면, 보관 조건부터 확인하세요',message:'보관할 물품과 예상 기간, 입출고 일정을 알려주세요. 실제 이용 가능 범위와 보관·운송 비용은 확인 후 안내합니다.',cta:'보관 조건 문의',metric:'이사 문의 중 보관 상담 연결률과 유효 견적률'},
];

/** Facts are bounded merchant quotes. All marketing decisions remain explicit proposals. */
export function buildServiceStrategy(data:ExtractedWebsiteData):ServiceStrategy|undefined{
  const business=analyzeBusinessContext(data);
  if(business?.id!=='international_logistics'||data.collectionNotice)return;
  const inputPage=new URL(data.finalUrl||data.url).href;
  const own=new URL(data.finalUrl||data.url).hostname.replace(/^www\./,'');
  const sources=(data.businessDocuments||[]).filter(d=>d.source!=='search_excerpt'&&new URL(d.url).hostname.replace(/^www\./,'')===own)
    .flatMap(d=>d.sections.map(s=>({url:d.url,title:(s.heading||d.title).slice(0,300),text:s.text})))
    .filter(s=>!isConsentBoilerplate(s.text)&&!/고객.{0,5}후기|testimonial|REVIEW_ONLY/i.test(s.title+' '+s.text));
  const selected=segments.flatMap(spec=>{
    const hits=sources.filter(s=>spec.match.test(s.title+' '+s.text));
    const relevance=(s:z.infer<typeof source>)=>Number(new URL(s.url).href!==inputPage)*8+Number(s.text.length>=80)*4+Number(spec.match.test(s.text))*3+Number(/포장|통관|서류|입출고|물품|보관|화물|cargo|shipment|customs|consolidation|airport/i.test(s.text))*6;
    const evidence=hits.sort((a,b)=>relevance(b)-relevance(a)).filter((s,i,a)=>a.findIndex(x=>x.text===s.text)===i).slice(0,3);
    if(!evidence.length)return [];
    const landing=evidence.find(e=>new URL(e.url).href!==inputPage)?.url;
    const {match,...content}=spec;
    return [{...content,evidence,...(landing?{landingUrl:landing}:{}),diagnosis:landing?
      `${spec.label} 관련 설명을 자사 상세 원문에서 확인했습니다. 이 원문을 출발점으로 고객의 목적, 상담 준비사항, 포함·별도 범위를 한 흐름으로 연결하세요. 현재 화면의 배치와 실제 접수 동작은 별도 점검이 필요합니다.`:
      `${spec.label} 표현은 확인했지만 이번 수집에서 전용 상세 페이지의 근거는 확보하지 못했습니다. 전용 페이지가 실제 있는지 먼저 확인하고, 없다면 아래 구성으로 분리하는 방안을 검토하세요.`}];
  });
  if(!selected.length)return;
  const used=[...new Map(selected.flatMap(s=>s.evidence).map(s=>[s.url+'#'+s.text,s])).values()];
  const labels=selected.map(s=>s.label).join(' · ');
  const form=sources.find(s=>/입력 항목:/.test(s.text));
  const missingFields=[['물량·화물 제원',/물량|물품|부피|중량|품목|규격|CBM/i],['희망 일정',/일정|희망일|예정일|날짜|시기/],['서비스 유형',/서비스|해외이사|귀국이사|화물|문의유형/]].filter(([,pattern])=>form&&!(pattern as RegExp).test(form.text)).map(([label])=>label);
  const conditionWords=/보험|보상|추가\s*비용|약관/;
  const conditionRelevance=(s:z.infer<typeof source>)=>Number(conditionWords.test(s.text))*4+Number(s.text.length>=80);
  const conditions=sources.filter(s=>conditionWords.test(s.title+' '+s.text)).sort((a,b)=>conditionRelevance(b)-conditionRelevance(a)).filter((s,i,a)=>a.findIndex(x=>x.text===s.text)===i).slice(0,2);
  const hasServiceMetadata=segments.some(s=>s.match.test(data.title+' '+data.description));
  return ServiceStrategySchema.parse({version:1,industry:'logistics',targetUrl:data.finalUrl||data.url,capturedAt:data.seoEvidence?.capturedAt||new Date().toISOString(),basis:'source-backed-playbook',
    summary:`원문에서 확인한 서비스를 고객 목적별로 나눴습니다: ${labels}. 검색어→서비스 상세→조건 확인→견적 문의→유효 상담→계약으로 이어지는 실행안을 검토하세요.`,
    notice:'원문 인용은 확인한 정보이고 고객 유형·검색어·광고 문구·실행안은 검토 제안입니다. 검색량·광고 계정·실제 전환·계약 성과는 측정하지 않았습니다. 국가·비용·기간·운송 가능 여부는 자사 운영 자료와 대조해 확정하세요.',sources:used,segments:selected,
    findings:[
      {title:'검색에서 서비스가 드러나는가',observed:`페이지 제목: ${data.title.slice(0,300)||'수집 범위에서 미확인'} / 메타 설명: ${data.description.slice(0,500)||'수집 범위에서 미확인'}`,interpretation:hasServiceMetadata?'제목·설명에서 서비스 단서를 확인했습니다. 각 서비스 상세의 검색 의도와 표현이 일치하는지 대조하세요.':'현재 수집한 제목·설명에서 서비스 단서를 확인하지 못했습니다. 브랜드를 모르는 고객에게 무엇을 제공하는지 전달하기 어려울 수 있습니다.',action:`메인에는 실제 핵심 서비스와 브랜드를 함께 설명하고, ${labels} 상세에는 서로 다른 서비스명·대상·확인 가능한 제공 범위를 작성하세요. 검색 결과에 표시되는 제목·설명은 별도로 확인합니다.`,evidence:[{url:data.finalUrl||data.url,title:'메인 제목·설명',text:(data.title+' / '+data.description).slice(0,600)||'수집 범위에서 미확인'}]},
      {title:'상담 접수 전에 조건을 구분하는가',observed:form?.text||'수집한 자사 원문에서 상담 양식 라벨을 확보하지 못했습니다.',interpretation:form?(missingFields.length?`공개 라벨에서는 ${missingFields.join(' · ')}을 확인하지 못했습니다. 실제 폼의 선택 항목·입력 안내와 후속 상담에서 받는 정보인지 대조하세요.`:'수집한 라벨에서 서비스·물량·일정 관련 단서를 확인했습니다. 실제 필수 항목과 입력 부담은 화면에서 확인하세요.'):'정적 수집만으로 실제 상담 폼 부재를 판단할 수 없습니다. 서비스 상세에서 상담으로 이어지는 실제 경로를 확인하세요.',action:'초기 접수는 서비스 유형·출발/도착지·희망 시점·연락 경로 중심으로 검토하고 상세 물품 목록과 서류는 후속 상담으로 분리하세요. 이미 받는 정보가 있다면 중복 항목을 추가하지 않습니다.',evidence:form?[form]:[]},
      {title:'서비스별 광고와 도착 페이지를 나눌 수 있는가',observed:`원문에서 ${selected.length}개 서비스 유형(${labels})의 단서를 확인했습니다.`,interpretation:'고객의 출발점과 상담 준비 정보가 다른 서비스들입니다. 모든 광고가 회사소개나 동일한 상담 폼으로만 연결된다면 고객이 직접 관련 정보를 찾아야 할 수 있습니다.',action:'현재 광고 URL을 계정에서 대조하고 서비스별로 검색어→설명→조건 확인→상담 CTA를 연결하세요. 이미 분리되어 있다면 서비스별 유효 문의율을 비교해 보완 대상을 정합니다.',evidence:used.slice(0,3)},
      {title:'비용·보험 안내가 선택 판단에 충분한가',observed:conditions.length?conditions.map(s=>s.text).join(' / ').slice(0,1000):'수집 범위에서 비용·보험 조건의 원문을 확보하지 못했습니다.',interpretation:'관련 문구의 존재는 견적 포함 범위·면책·보상 조건 전체가 충분히 안내됐다는 뜻이 아닙니다. 일반 서비스 설명과 실제 계약 조건을 구분해 검토해야 합니다.',action:'견적 포함·별도 비용, 보험 범위, 예외, 사고 접수 경로를 현재 약관과 대조하고 필요한 요약 및 상세 링크를 상담 버튼 가까이에 배치하세요. 국가별 규정의 법적 적합성은 이 진단에서 확정하지 않습니다.',evidence:conditions},
    ],
    channels:[
      {id:'search',label:'네이버·구글 검색 광고',role:'견적·운송을 직접 찾는 수요를 서비스별 상담으로 연결',setup:`${labels}를 각각 광고그룹과 랜딩으로 구분합니다. 브랜드 검색은 별도로 집계하고 국가·도시 조합은 실제 제공 구간만 추가합니다. 검색량과 예상 단가는 광고 계정에서 확인 후 예산을 정합니다.`,creative:'서비스명 + 상담 전 확인할 가치 + 구체적인 다음 행동을 사용합니다. 최저가·무조건 통관·확정 도착일 등 검증하지 않은 약속은 제외합니다.',conversion:'상담 버튼 클릭은 보조 지표, 접수 완료는 1차 지표로 기록하고 실제 진행 가능한 유효 문의·견적·계약을 따로 집계합니다.',review:'검색어 보고서에서 취업·주식·다른 동명 기업·업무와 무관한 택배 조회를 구분합니다. 실제 상담으로 연결되는 정보 탐색어는 일괄 제외하지 말고 별도 그룹에서 검토합니다.'},
      {id:'social',label:'메타·영상 콘텐츠',role:'준비 과정과 선택 기준을 보여주고 서비스 상세 탐색을 유도',setup:'확인된 서비스별로 콘텐츠를 나누고 초기에는 국가·상황별 소재 반응을 비교합니다. 리타게팅은 동의 및 플랫폼 정책을 충족하고 충분한 모수가 확보되는 경우에만 검토합니다.',creative:'포장 전후, 상담 준비물, 견적 비교 체크리스트, 실제 운송 단계처럼 고객이 판단할 수 있는 자료를 사용합니다. 고객 물품·주소·서류가 보이는 장면은 권한 확인과 비식별 처리가 필요합니다.',conversion:'영상 반응·상세 방문·문의 접수를 각각 구분합니다. 저렴한 클릭이나 영상 조회수만으로 신규 계약 효과를 판단하지 않습니다.',review:'캠페인 목표와 이벤트 수신을 계정에서 확인한 후 집행합니다. 소재별 서비스 유형·유효 문의율을 비교하며 성과 데이터가 없는 상태에서 목표 CPA를 임의로 제시하지 않습니다.'},
      {id:'organic',label:'네이버 콘텐츠·검색·AI 답변',role:'비용·준비·통관·일정 질문에 답할 서비스별 원문 구축',setup:'고객 질문 하나에 직접 답변, 적용 조건, 예외, 출처, 상담 경로를 함께 구성합니다. 회사 소개만 반복하지 말고 고객이 견적을 준비하는 데 필요한 정보를 구체화합니다.',creative:'운송 구간·서비스 유형·준비사항이 다른 사례를 구분하고 실제 수행 범위와 확인 날짜를 제시합니다. 고객 후기의 기간·가격을 공통 조건으로 바꾸지 않습니다.',conversion:'질문 페이지에서 관련 서비스 상세, 상담 준비 체크리스트, 견적 요청으로 이어지는 이동을 관측합니다.',review:'제목·설명에 회사명만 있는 페이지는 실제 서비스와 주제를 함께 설명하도록 검토합니다. AI 인용·검색 노출 개선은 수정 후 별도로 확인합니다.'},
      {id:'sales',label:'기업 문의·영업 후속 관리',role:'기업 화물 문의를 담당자 확인과 견적 진행으로 연결',setup:'개인 이사와 기업 화물을 접수 단계에서 구분하고 기업 문의에는 구간·화물 제원·희망 일정·회신 경로를 확인합니다. 이미 제공한 정보를 후속 상담에서 반복 입력하지 않도록 접수 내용을 연결합니다.',creative:'확인 가능한 취급 범위·거점·업무 절차·사례를 요약한 서비스 자료를 제공합니다. 공개되지 않은 고객사명·물량·계약 조건을 임의로 넣지 않습니다.',conversion:'접수→담당자 배정→조건 확인→견적 발송→계약을 CRM이나 관리표에 기록하고 채널·서비스·구간별로 묶어 비교합니다.',review:'응답 지연·취급 불가·예산 차이·일정 불일치 등 이탈 사유를 분리합니다. 메시지 발송과 고객 연락은 실제 동의·업무 절차에 맞춰 운영할 과제입니다.'},
    ],
    funnel:[
      {stage:'서비스 상세 탐색',event:'service_view',definition:'어떤 서비스 상세를 읽었는지 서비스 코드로 구분합니다.',check:'단순 페이지 새로고침·중복 방문과 신규 관심을 구분하고 국가·도시는 허용된 비식별 분류만 사용합니다.'},
      {stage:'상담 시작',event:'inquiry_start',definition:'상담 폼 진입 또는 첫 항목 입력을 접수 완료와 분리합니다.',check:'전화·메신저 클릭은 별도 클릭 이벤트로 기록하며 실제 대화나 문의 접수로 간주하지 않습니다.'},
      {stage:'문의 접수 완료',event:'inquiry_submit',definition:'서버가 정상 접수를 확인한 경우에만 접수 완료를 기록합니다.',check:'중복 클릭·오류·스팸을 점검하고 이벤트에 이름·전화번호·이메일·상세 주소를 전송하지 않습니다.'},
      {stage:'유효 문의·견적',event:'qualified_lead / quote_sent',definition:'실제 취급 가능한 서비스·구간·일정인지 확인하고 견적 발송 여부를 구분합니다.',check:'유효 문의 정의를 담당자끼리 통일하고 무응답·취급 불가 사유를 별도로 남깁니다.'},
      {stage:'계약 성과',event:'contract_won',definition:'계약 확정과 실제 계약 금액·공헌이익을 내부 자료로 확인합니다.',check:'접수일 기준 코호트와 계약 시점을 구분하고 취소·환불·후속 비용을 반영합니다. 광고 전환 업로드는 사용 환경과 동의 요건을 확인한 뒤 설계합니다.'},
    ],
    metrics:[
      {name:'문의 완료율',formula:'정상 문의 접수 세션 ÷ 해당 서비스 랜딩 세션',required:'서비스별 랜딩 세션, 중복 제거한 정상 접수',interpretation:'버튼 클릭률과 구분합니다. 전화·메신저는 별도 집계 후 실제 문의와 대조합니다.'},
      {name:'유효 문의율',formula:'진행 가능한 문의 수 ÷ 정상 문의 접수 수',required:'서비스·운송 구간·일정 확인, 유효 문의의 공통 정의',interpretation:'접수량이 늘어도 취급 불가·스팸이 증가하면 개선으로 판단하지 않습니다.'},
      {name:'유효 문의당 광고비',formula:'해당 채널 광고비 ÷ 해당 채널 유효 문의 수',required:'채널 식별, 광고비, 유효 문의 연결 기록',interpretation:'분모가 0이면 계산하지 않습니다. 클릭당 비용과 비교하지 말고 같은 서비스·기간으로 비교합니다.'},
      {name:'견적·계약 전환율',formula:'견적 발송 수 ÷ 유효 문의 수 / 계약 수 ÷ 견적 발송 수',required:'견적 발송과 계약 확정 상태, 접수일 기준 관측 기간',interpretation:'상담·계약 지연을 고려하고 아직 미결인 문의를 실패로 확정하지 않습니다.'},
      {name:'허용 광고비 기준',formula:'계약당 공헌이익 × 유효 문의→계약률 × 광고비 배분 비율',required:'직접 비용 차감 후 공헌이익, 실제 계약률, 자사가 정한 배분 비율',interpretation:'유효 문의당 허용 광고비를 검토하는 계산식입니다. 운영 데이터가 없으면 금액과 성과 예상치를 제시하지 않습니다.'},
    ],
    experiments:[
      {title:'1주차 · 서비스별 유입·접수 기준선',hypothesis:'개인 이사와 기업 화물이 섞이면 어느 광고와 페이지가 유효 문의를 만드는지 알기 어렵습니다.',change:`${labels}별 랜딩·상담 분류와 접수 완료 측정을 점검하고 현재 유효 문의 기준을 정합니다.`,metric:'서비스별 접수 수·유효 문의율·응답 지연',decision:'정상 수신과 중복 제거를 확인한 뒤 비교를 시작합니다. 기간은 실행 순서 제안이며 성과 달성 기한이 아닙니다.'},
      {title:'2주차 · 첫 화면과 견적 CTA',hypothesis:'추상적인 브랜드 문구 뒤에 서비스와 상담 준비사항이 늦게 나오면 방문자가 다음 행동을 결정하기 어려울 수 있습니다.',change:'한 서비스에서 현재 첫 화면과 서비스·구간·견적 준비사항을 설명하는 첫 화면을 비교합니다. CTA를 서비스명과 연결하고 연결 주소도 대조합니다.',metric:'상담 시작률·접수 완료율·유효 문의율',decision:'같은 유입 구성으로 비교하고 표본과 관측 기간을 먼저 정합니다. 클릭만 상승하고 유효 문의가 줄면 채택을 보류합니다.'},
      {title:'3주차 · 견적·절차 질문 콘텐츠',hypothesis:'비용과 진행 절차에 대한 불확실성을 줄이면 반복 문의를 줄이고 필요한 조건을 갖춘 접수가 늘 수 있습니다.',change:'가장 자주 받는 질문을 실제 상담 기록에서 고르고 포함·별도 비용, 준비사항, 원문 출처와 견적 연결을 보강합니다.',metric:'질문 페이지→서비스 상세 이동·문의 완료·반복 질문 유형',decision:'기존 FAQ 존재 여부와 조건의 최신성을 먼저 확인합니다. 개선 전후 같은 질문·서비스로 대조합니다.'},
      {title:'4주차 · 검색어·소재와 후속 상담',hypothesis:'접수 후 취급 불가·무응답이 많은 원인은 광고 표현, 고객 조건, 후속 응답 중 어느 단계인지 나눠 볼 수 있습니다.',change:'검색어·소재별 유효 문의와 이탈 사유를 연결하고 응답 담당자·누락 알림·견적 후속 확인 절차를 점검합니다.',metric:'유효 문의당 광고비·견적 발송률·계약 전환율',decision:'서비스별 표본이 충분할 때 예산과 소재를 조정합니다. 적은 계약 건수나 짧은 기간의 변동만으로 채널을 확정 평가하지 않습니다.'},
    ],
    content:selected.map(s=>({title:`${s.label} 상담 전에 확인할 내용`,angle:s.questions[0],outline:[`도입: ${s.questions[0]}`,`본문: ${s.questions[1]}`,`조건·예외: ${s.questions[2]}`,'마무리: 확인한 범위와 담당자에게 확인할 사항을 나누고 서비스별 상담 연결'],cta:s.cta,sourceUrls:[...new Set(s.evidence.map(e=>e.url))]})),
  });
}
