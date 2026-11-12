import type {ExtractedWebsiteData} from './extractWebsite';
import {analyzeWebsitePurpose,isNonCommerce,type WebsitePurpose} from './websitePurpose';
import type {ServiceStrategy} from './serviceStrategy';
import {isConsentBoilerplate} from './contentBoilerplate';
import {nonCommercePlaybook} from './nonCommercePlaybook';
import {buildNonCommerceBriefing,type StrategySource} from './nonCommerceBriefing';

export function nonCommerceSources(data:ExtractedWebsiteData):StrategySource[]{
  const url=data.finalUrl||data.url,host=new URL(url).hostname.replace(/^www\./,'');
  const own=(value:string)=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&u.hostname.replace(/^www\./,'')===host;}catch{return false;}};
  const candidates:StrategySource[]=data.communityContext?data.communityContext.evidence.map(e=>({url,title:'커뮤니티 운영·이용 안내',text:e.text})):
    (data.businessDocuments||[]).filter(d=>d.source!=='search_excerpt'&&own(d.url)).flatMap(d=>d.sections.map(s=>({url:d.url,title:(s.heading||d.title).slice(0,300),text:s.text})));
  if(!data.communityContext&&!candidates.length)for(const s of data.siteEditing?.contentSections||[]){if(!s.truncated)candidates.push({url,title:s.heading.slice(0,300),text:s.text});}
  // Metadata may anchor a sparse-page proposal, never a factual body answer.
  if(!candidates.length)candidates.push({url,title:'입력 페이지 제목·설명',text:[data.title,data.description].filter(Boolean).join(' · ').slice(0,600)});
  const filtered=candidates.filter(s=>s.text.trim().length>=4&&s.text.length<=600&&!isConsentBoilerplate(s.text)&&!/후기|testimonial|REVIEW_ONLY/i.test(s.title)).filter((s,i,a)=>a.findIndex(v=>v.text===s.text)===i).sort((a,b)=>Number(b.url!==url)-Number(a.url!==url));
  const groups=[...new Set(filtered.map(s=>s.url))].map(url=>filtered.filter(s=>s.url===url));
  return Array.from({length:16},(_,i)=>groups.flatMap(group=>group[i]?[group[i]]:[])).flat().slice(0,24);
}

export function buildStrategyFindings(p:WebsitePurpose,sources:StrategySource[],url:string):ServiceStrategy['findings']{
  const eligibleChecks=p.checks.filter(c=>c.status!=='not_applicable').slice(0,6);
  const findings=eligibleChecks.map(c=>({
    title:c.label,observed:(c.evidence.length?c.evidence.map(e=>e.text).join(' / '):'수집된 근거 없음').slice(0,1100),interpretation:'',action:'',
    evidence:c.evidence.map(e=>({url:/^https?:\/\//.test(e.locator)?e.locator:sources.find(s=>s.text.includes(e.text))?.url||url,title:c.label,text:e.text.slice(0,600)})).slice(0,3),
  }));
  return findings;
}

export function buildNonCommerceSegments(p:WebsitePurpose,sources:StrategySource[],url:string,topic:string):ServiceStrategy['segments']{
  const book=nonCommercePlaybook(p,topic),information=['content','community','public_service'].includes(book.id),education=book.id==='education';
  const noun=information?'이용자':'고객',end=book.outcome,prep=book.preparation.join('·');
  const stageContent:Record<string,{blocks:string[];cta:string;metric:string}>={
    discover:{blocks:[
      `첫 화면: ${book.label}의 [제공 서비스·주제]와 [이용 대상]을 한 문장으로 써야 합니다.`,
      `대상 안내: ${book.preparation[0]}에 따라 적용되는 경우와 제외되는 경우를 나눠야 합니다.`,
      `서비스 소개: ${book.assets[0]}의 핵심 내용을 사진 또는 본문으로 설명해야 합니다.`,
      `기초 질문: 처음 방문한 ${noun}이 묻는 제공 범위·이용 조건에 짧게 답해야 합니다.`,
      '상세 연결: 소개한 서비스명마다 해당 상세 페이지의 실제 URL을 연결해야 합니다.',
      '다음 버튼: 「대상·서비스 자세히 보기」를 서비스 소개 바로 아래에 배치해야 합니다.',
    ],cta:'대상·서비스 자세히 보기',metric:'서비스 상세 이동 이용자 ÷ 소개 페이지 방문 이용자 × 100'},
    compare:{blocks:[
      `비교표: ${book.preparation.join(' / ')} 항목을 각각 행으로 구분해야 합니다.`,
      '비용·범위: 적용되는 금액 또는 산정 기준, 포함 항목, 별도 비용을 같은 표에 써야 합니다.',
      `담당·근거: ${book.proof}를 주장 바로 옆의 원문 링크로 연결해야 합니다.`,
      '조건 차이: 대상·기간·제외 조건이 달라지는 경우를 비교표 아래에 명시해야 합니다.',
      '자료 표기: 표 아래에 [원자료 링크·작성 주체·확인일]을 적어야 합니다.',
      `다음 버튼: 「조건 확인 후 ${book.cta}」 버튼을 비교표 끝에 배치해야 합니다.`,
    ],cta:`조건 확인 후 ${book.cta}`,metric:'조건·근거 열람 후 행동 경로 이동 이용자 ÷ 비교 페이지 방문 이용자 × 100'},
    act:{blocks:[
      `준비 체크리스트: ${prep} 항목을 ${book.cta} 전에 확인할 항목으로 제시해야 합니다.`,
      `행동 경로: 「${book.cta}」 버튼에 실제 [${book.cta} URL]을 연결해야 합니다.`,
      `진행 순서: ${book.stages.join(' → ')}의 담당자와 완료 조건을 순서대로 써야 합니다.`,
      '처리 안내: [운영시간·예상 회신 시점]과 접수 후 받을 안내를 버튼 옆에 표시해야 합니다.',
      '변경·오류: 일정 변경, 취소 또는 접속 실패 시 [담당 확인 경로]를 제공해야 합니다.',
      `완료 안내: 접수·이동 직후 확인 가능한 상태를 표시하고, ${end} 여부는 실제 운영 기록과 구분해 관리해야 합니다.`,
    ],cta:book.cta,metric:`${end} 확인 건 ÷ 행동 경로에 진입한 고유 이용자 × 100`},
  };
  const stages=[
    {id:'discover',label:'탐색 단계',audience:`${book.audience} 중 주제와 제공 범위를 처음 확인하는 ${noun} 가설입니다. 유입 검색어·접수 사유로 실제 비중을 확인하세요.`,questions:[`${topic}에서 실제 다루는 범위는 무엇인가`,`${prep}에 맞는 안내인가`],keywords:[`${book.label} 안내`,`${book.label} 대상`,`${book.label} 준비사항`],match:/대상|위한|제공|범위|소개|업무|과정|주제/,headline:`${book.label}, 나에게 적용되는 범위부터 확인하세요`,message:`${prep}에 맞춰 [실제 제공·적용 범위]를 확인하세요. [제외 조건]은 관련 원문과 담당 안내에서 확인할 수 있도록 구성합니다.`},
    {id:'compare',label:'비교·검토 단계',audience:`${book.proof} 등의 근거를 확인한 뒤 다음 행동을 결정하려는 ${noun} 가설입니다. 근거 문서 열람과 실제 후속 행동을 따로 확인하세요.`,questions:['어떤 조건을 같은 기준으로 비교해야 하는가','현재 안내를 뒷받침하는 원자료와 담당자는 누구인가','다르게 적용되는 경우와 추가 확인 항목은 무엇인가'],keywords:[`${book.label} 선택 기준`,`${book.label} 확인사항`,`${book.label} 절차`],match:/조건|비교|담당|사례|자료|공고|과정|제외|포함/,headline:`조건과 근거를 함께 보고 판단하세요`,message:`[확인 가능한 원자료]와 [동일 조건의 비교 항목]을 함께 안내합니다. ${book.proof}의 실제 확인 경로를 연결하세요.`},
    {id:'act',label:'행동·이용 단계',audience:`${prep} 등 준비 항목을 확인하고 ‘${book.cta}’ 경로로 이동하려는 ${noun} 가설입니다. 버튼 클릭과 ${end} 여부를 구분해서 집계하세요.`,questions:[`${book.cta} 전에 무엇을 준비해야 하는가`,'접수·이동 이후 어떤 안내를 받는가','변경이나 추가 확인은 어디에서 진행하는가'],keywords:[`${book.label} 이용 방법`,`${book.label} 진행 순서`,`${book.label} ${information?'공식 안내':education?'신청 안내':'문의'}`],match:/신청|상담|예약|접수|문의|안내|이용|관련|출처/,headline:`준비사항을 확인하고 다음 단계로 이동하세요`,message:`${prep} 등 준비 항목을 먼저 정리하세요. [실제 행동 경로]에서 [접수·이동 이후 안내]를 확인하고 조건이 다르면 [담당 확인 경로]로 연결합니다.`},
  ];
  return stages.map(s=>{
    const hits=sources.filter(e=>s.match.test(e.text)),evidence=(hits.length?hits:sources).slice(0,2),landing=hits.find(e=>e.url!==url)?.url;
    const {match,...rest}=s;
    return {...rest,evidence,...(landing?{landingUrl:landing}:{}),diagnosis:hits.length?`${s.label} 관련 원문 ${hits.length}개`:'단계별 직접 근거 미수집',landingBlocks:stageContent[s.id].blocks,cta:stageContent[s.id].cta,metric:stageContent[s.id].metric};
  });
}

/** Purpose-specific decisions, grounded in bounded own-source observations. No inferred score changes. */
export function buildNonCommerceStrategy(data:ExtractedWebsiteData):ServiceStrategy|undefined{
  const p=analyzeWebsitePurpose(data);if(!isNonCommerce(p)||data.collectionNotice||p.business?.id==='international_logistics')return;
  const sources=nonCommerceSources(data);if(!sources.length)return;
  const book=nonCommercePlaybook(p,[data.title,data.description,...data.h1].join(' '));
  const url=data.finalUrl||data.url,topic=(data.h1[0]||data.title||book.label).replace(/\s+/g,' ').slice(0,70);
  const information=['content','community','public_service'].includes(book.id),education=book.id==='education';
  const noun=information?'이용자':'고객',end=book.outcome;
  const prep=book.preparation.join('·');
  const bounded=(s:string)=>s.slice(0,1100);
  const segments=buildNonCommerceSegments(p,sources,url,topic);
  const findings=buildStrategyFindings(p,sources,url);
  const endEvent=information?'meaningful_followup':education?'participation_confirmed':book.id==='medical'?'attendance_confirmed':'outcome_confirmed';
  return {version:1,industry:'noncommerce',targetUrl:url,capturedAt:data.seoEvidence?.capturedAt||new Date().toISOString(),basis:'source-backed-playbook',
    summary:`${book.label} 관점에서 입력 페이지와 자사 상세 원문을 검토했습니다. ${book.stages.join(' → ')} 흐름에 맞춰 설명·검색·콘텐츠·이용 행동을 연결합니다. 아래 세 그룹은 관측된 서비스 개수가 아닌 고객 판단 단계별 전략 가설입니다.`,
    notice:bounded('실행 제안 · '+book.caution),sources,segments,findings,
    briefingPlan:buildNonCommerceBriefing(book,sources),
    channels:[
      {id:'search',label:'검색 유입·검색 광고',role:`${book.label}의 실제 질문을 관련 상세 안내에 연결`,setup:`탐색·비교·행동 의도의 검색어를 분리하고 ${prep}에 맞는 페이지로 연결하세요. 브랜드 검색과 일반 주제 검색은 따로 봅니다. 유료 집행은 운영 목적·검색 수요·예산 확인 후 선택합니다.`,creative:`${book.label} + 확인할 조건 + ${book.cta} 문구를 문구의 출발점으로 검토합니다. 실제 제공하지 않는 분야나 지역을 확장하지 않습니다.`,conversion:`클릭과 ${end} 여부를 같은 성과로 계산하지 않습니다. 외부 신청·예약 시스템은 완료 데이터 연결 여부부터 확인하세요.`,review:'검색량·단가는 미측정입니다. 실제 검색어 보고서의 무관한 의도를 구분하고 유효한 정보 탐색어를 일괄 제외하지 마세요.'},
      {id:'content',label:'네이버 콘텐츠·검색·AI 답변',role:`${prep}에 대한 직접 답변과 신뢰 근거 확보`,setup:'주제별 핵심 답변→적용 조건→절차→준비사항→원자료→다음 행동 순서로 문서를 검토합니다. 웹사이트 원문과 운영하는 블로그의 역할을 나누세요.',creative:`${book.assets.join('·')} 같은 자료를 실제 자료로 구성하고 작성·검수 주체와 확인일을 안내합니다. AI 초안은 담당자가 사실과 조건을 확인해 완성하세요.`,conversion:`질문 문서에서 관련 원문과 ‘${book.cta}’ 경로로 이동하는 경로를 확인합니다.`,review:'문서 게시·검색 수집·AI 브리핑 생성·자사 인용은 별도 상태로 기록합니다. 형식을 맞추는 것만으로 노출을 약속하지 않습니다.'},
      {id:'visual',label:'영상·SNS·이미지 콘텐츠',role:'복잡한 조건과 이용 과정을 이해시키는 보조 접점',setup:`${book.assets[0]} 자료와 ${book.assets[1]}처럼 서로 다른 판단 재료를 비교하세요. 채널 운영·유료 광고 여부는 이용자 특성과 자료 제작 여건에 맞춰 정합니다.`,creative:`첫 장면에서 ${book.preparation[0]}의 질문을 제시하고 실제 과정·조건·다음 행동을 보여줍니다. 권한을 확인한 자료만 사용하고 개인 정보와 민감한 상황을 노출하지 않습니다.`,conversion:'조회·반응·상세 탐색·확인 가능한 후속 행동을 나눠 봅니다. 조회수만으로 이용·계약 효과를 판단하지 않습니다.',review:book.caution},
      {id:'followup',label:information?'탐색·이용 후속 안내':'접수·후속 운영',role:`${end}까지 이탈 원인을 확인`,setup:`${book.stages.join(' → ')} 흐름의 담당자와 완료 기준을 정합니다. ${information?'원출처·관련 자료로 이어지는 경로와 갱신 상태를 확인하세요.':'초기 입력은 '+prep+'와 회신에 필요한 최소 정보로 검토하고 상세 자료는 후속 단계로 분리하세요.'}`,creative:`${book.cta} 이후 무엇을 확인할 수 있는지 안내합니다. 실제 처리시간·일정이 정해졌다면 적용 조건을 함께 씁니다.`,conversion:`${end} 여부는 실제 운영 자료로 확인합니다. 클릭·접수·확정의 구분과 중복 처리를 문서화하세요.`,review:'후속 연락은 동의·실제 업무 절차에 맞춰 운영할 과제입니다. 이름·연락처·상담 내용·건강·재무 정보를 광고 이벤트에 전송하지 않습니다.'},
    ],
    funnel:book.stages.map((stage,i)=>({stage,event:['detail_view','criteria_view',information?'official_path_click':'request_submit',information?'followup_observed':'qualification_confirmed',endEvent][i],definition:i===0?'해당 주제의 상세 안내 방문을 구분합니다.':i===4?`${end} 여부를 내부 자료 또는 확인 가능한 이용 기록으로 정의합니다.`:`${stage}의 시작·완료 기준을 실제 운영에 맞춰 정하고 이전 단계와 분리합니다.`,check:i===2?(information?'외부 링크 이동은 외부 기관의 접수·이용 완료를 의미하지 않습니다.':'서버 접수 성공을 확인할 때만 완료로 기록하며 클릭·오류·중복 접수와 구분합니다.'):'동일 식별 기준·기간으로 중복을 제거합니다. 이벤트에는 개인·민감정보를 넣지 않으며 외부 플랫폼의 미측정 단계는 미확인으로 남깁니다.'})),
    metrics:[
      {name:'단계별 연결률',formula:'다음 단계에 도달한 고유 이용자 ÷ 이전 단계 고유 이용자 × 100',required:'같은 기간·식별 기준의 단계별 기록',interpretation:'전체 방문자와 특정 유입의 분모를 섞지 않습니다. 추적 연결이 안 되는 구간은 계산하지 않습니다.'},
      {name:information?'관련 원문 이동률':'유효 접수율',formula:information?'관련 원문으로 이동한 고유 이용자 ÷ 해당 안내 방문자 × 100':'사전에 정한 조건에 맞는 접수 건 ÷ 중복·스팸 제외 접수 건 × 100',required:information?'안내별 방문·원문 이동 기록':'유효 기준·접수 기록·무효 사유',interpretation:information?'원문 이동을 이해도·만족도와 동일하게 해석하지 않습니다.':'유효 기준을 결과 확인 전에 정하고 담당자별 판정 차이를 점검합니다.'},
      {name:`${end} 연결률`,formula:`같은 유입 집단의 ${end} 확인 건 ÷ 앞 단계 확인 건 × 100`,required:'유입 집단·접수 시점·후속 결과·중복 제거 기준',interpretation:'결과가 늦게 발생하는 업종은 충분한 관찰 기간을 두고 신규 접수와 과거 결과를 섞지 않습니다.'},
      {name:'후속 확인 소요시간',formula:'접수·요청부터 첫 유효한 후속 안내까지 걸린 시간의 중앙값',required:'각 단계 시각·운영시간·처리 상태',interpretation:information?'운영자가 처리하는 문의가 있을 때만 적용합니다. 일반 문서 열람에는 필수 지표가 아닙니다.':'야간·휴무·담당 배정 지연을 분리해 확인합니다. 자동 수신 알림을 실제 응답으로 계산하지 않습니다.'},
      {name:'확인 가능한 행동당 비용',formula:'해당 집단의 실제 광고비 ÷ 정의한 후속 행동 확인 건',required:'광고비·유입 연결·행동 정의·관찰 기간',interpretation:'유료 집행과 데이터 연결이 있을 때만 산출합니다. 분모가 0이면 계산 불가로 표시하고 목표 비용·ROAS를 임의 생성하지 않습니다.'},
    ],
    content:book.assets.map((asset,i)=>({title:`${book.label} · ${asset}`,angle:`${book.preparation[i]} 관련 내용을 확인하는 ${noun}의 질문을 해결하는 제작 제안입니다. 현재 사이트에 이 자료가 있다고 주장하는 항목은 아닙니다.`,outline:[`첫 문단: ${book.preparation[i]}에 대한 직접 답변`,'본문: 실제 조건·절차와 다른 경우의 차이',`근거: ${book.proof}`,'마무리: 확인일·담당 경로와 관련 상세 연결'],cta:book.cta,sourceUrls:[...new Set(sources.slice(i,i+3).map(s=>s.url))]})).concat([
      {title:`${book.label} · 준비사항 체크리스트`,angle:`${prep} 등 준비 항목을 정리해 다음 행동 전의 불확실성을 줄입니다.`,outline:book.preparation.map(x=>`${x}: 누구에게 적용되는지, 무엇을 확인하는지, 예외가 무엇인지 작성`),cta:book.cta,sourceUrls:[url]},
      {title:`${book.label} · 변경·예외 조건 안내`,angle:'일반 안내가 그대로 적용되지 않는 상황과 실제 확인 경로를 설명합니다.',outline:['현재 적용되는 기준과 확인일','예외·변경 조건과 확인 주체','정정 안내·원문 링크','관련 안내로 이동하는 경로'],cta:book.cta,sourceUrls:[url]},
      {title:`${book.label} · 이용 흐름 안내`,angle:`${book.stages[0]}부터 ${end}까지 각 단계의 의미를 설명합니다.`,outline:['처음 확인할 대상과 목적','중간 단계의 준비·담당·완료 기준','클릭·접수·확정의 차이','진행 상태와 추가 문의 경로'],cta:book.cta,sourceUrls:[url]},
    ]),
    experiments:[
      {title:'1주차 · 원문·측정 기준 정리',hypothesis:'목적·조건·다음 행동의 불일치가 이용자의 판단을 어렵게 할 수 있습니다.',change:`${prep} 관련 원문과 실제 화면을 대조하고 단계별 완료 기준·데이터 수집 가능 범위를 정합니다.`,metric:'핵심 질문별 원문·담당 확인 여부와 이벤트 중복·누락',decision:'검수된 원문과 측정 기준을 갖춘 뒤 비교를 시작합니다. 미수집 값을 0으로 두지 않습니다.'},
      {title:'2주차 · 질문별 상세 안내 보완',hypothesis:'질문에 직접 답하는 안내가 다음 단계 탐색을 도울 수 있습니다.',change:`가장 중요한 ${book.assets[0]} 자료를 한 페이지에서 보완하고 변경 전 버전·날짜를 남깁니다.`,metric:'관련 안내 이동률과 실제 이용자 질문·이탈 사유',decision:'방문 수·유입 구성이 달라졌는지 함께 봅니다. 짧은 기간의 작은 표본으로 효과를 확정하지 않습니다.'},
      {title:'3주차 · 유입 문구·자료 비교',hypothesis:'이용자가 확인하려는 조건을 드러낸 문구가 적합한 유입을 늘릴 수 있습니다.',change:`${book.preparation[0]} 강조안과 ${book.preparation[1]} 강조안을 같은 범위에서 비교합니다. 유료 집행이 없다면 기존 콘텐츠 유입에서 검토합니다.`,metric:`유입별 단계 이동과 ${end}의 연결 여부`,decision:'클릭만 늘고 후속 행동이 악화되면 채택을 보류합니다. 충분한 표본과 비용 자료가 확보된 경우에만 확장합니다.'},
      {title:'4주차 · 후속 결과·검색 관측',hypothesis:'설명 보완 이후에도 후속 단계의 조건·운영 문제가 성과를 제한할 수 있습니다.',change:'유입 집단별 결과와 미완료 사유를 점검하고 질문별 검색 화면·출처 URL을 기록합니다.',metric:`${end} 확인률·미완료 사유·AI 브리핑 실제 관측 기록`,decision:'이용 성과와 검색 노출을 별도로 판단합니다. 결과가 늦게 나타나는 업종은 관찰 기간을 연장하고 단정적인 개선 수치를 제시하지 않습니다.'},
    ],
  };
}
