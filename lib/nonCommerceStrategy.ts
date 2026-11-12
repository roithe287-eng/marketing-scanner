import {koreanParticle} from './koreanParticle';
import type {ExtractedWebsiteData} from './extractWebsite';
import {analyzeWebsitePurpose,isNonCommerce,type WebsitePurpose} from './websitePurpose';
import type {ServiceStrategy} from './serviceStrategy';
import {isConsentBoilerplate} from './contentBoilerplate';
import {nonCommercePlaybook,type NonCommercePlaybook} from './nonCommercePlaybook';
import {editorialFocus,editorialChannels,editorialContent,editorialMeasurement,allocateSources,STAGE_MATCHERS} from './nonCommerceEditorial';
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

export function buildNonCommerceSegments(p:WebsitePurpose,sources:StrategySource[],url:string,topic:string,selectedBook?:NonCommercePlaybook):ServiceStrategy['segments']{
  const book=selectedBook||nonCommercePlaybook(p,topic),f=editorialFocus(book),[scope,proof,terms,operation]=f.fields;
  const placePrefix=book.local?.regions.length?book.local.regions[0]+' ':book.local?'[실제 지역] ':'';
  const priceRelevant=!f.information;
  const actions=f.information?[
    `준비 체크리스트: ${book.preparation.join('·')} 항목을 본문 끝의 관련 자료와 연결해야 합니다.`,
    `행동 경로: 「${book.cta}」 버튼에 [공식·관련 문서 URL]을 넣고 이동할 문서명을 표시해야 합니다.`,
    `이용 안내: ${operation}의 실제 이용 방법과 변경 확인 경로를 써야 합니다.`,
    `완료 안내: ${koreanParticle(book.stages[2],'and')} ${koreanParticle(book.outcome,'object')} 구분해서 기록해야 합니다.`,
  ]:f.mode==='visit'?[
    `준비 체크리스트: ${koreanParticle(operation,'object')} 방문 전에 확인할 수 있도록 안내해야 합니다.`,
    '길찾기: 매장 입구·주차장·대기 위치를 지도와 사진에서 구분해야 합니다.',
    '운영 안내: [영업시간·휴무·마감시간]을 위치 안내 바로 위에 표시해야 합니다.',
    '완료 안내: 길찾기 클릭과 실제 매장 방문을 별도로 집계해야 합니다.',
  ]:[
    `준비 체크리스트: ${book.preparation.join('·')} 항목의 준비 방법을 ${book.cta} 버튼 앞에 써야 합니다.`,
    `접수 경로: 「${book.cta}」 버튼에 [실제 접수 URL]을 연결하고 성공·오류 화면을 각각 제공해야 합니다.`,
    `처리 안내: ${book.stages[2]} 이후 ${book.stages[3]}까지의 담당자·[회신 시점·변경 경로]를 표시해야 합니다.`,
    `완료 안내: ${book.outcome} 여부는 실제 운영 기록으로 확인해야 합니다.`,
  ];
  const specs=[
    {id:'discover',label:'탐색 · 대상과 제공 범위',audience:book.audience,questions:[f.questions[0]],keywords:[`${placePrefix}${book.label}`,`${book.label} ${book.preparation[0]}`],
      landingBlocks:[`첫 화면: ${scope}에 해당하는 실제 항목과 이용 대상을 제목·첫 문단에 써야 합니다.`,`${book.assets[0]}: [원문에서 확인한 내용]을 항목별 소제목 아래에 설명해야 합니다.`,'상세 연결: 소개한 각 항목을 해당 상세 URL에 연결해야 합니다.','다음 버튼: 「제공 범위 자세히 보기」를 소개 문단 아래에 배치해야 합니다.'],headline:`${book.label}, ${book.preparation[0]}부터 확인하세요`,message:`[실제 제공 항목]과 [이용 대상]을 안내합니다. 자세한 조건은 항목별 상세 설명에서 확인하세요.`,cta:'제공 범위 자세히 보기',metric:'상세 이동 이용자 ÷ 소개 방문 이용자 × 100'},
    {id:'compare',label:'비교 · 조건과 근거',audience:`${koreanParticle(terms,'object')} 비교하는 이용자`,questions:[f.questions[1],`${proof}의 원자료는 무엇인가요?`],keywords:[`${book.label} ${priceRelevant?'구성·비용':'적용 범위'}`,`${book.label} ${proof}`],
      landingBlocks:[`비교표: ${scope}의 선택안을 행으로, ${koreanParticle(terms,'object')} 열로 나눠야 합니다.`,priceRelevant?`포함·별도 비용: ${terms}의 기준과 제외 항목을 같은 표에 써야 합니다.`:`해석 기준: ${proof}의 원자료와 적용 예외를 비교표 옆에 써야 합니다.`,`근거 연결: ${koreanParticle(proof,'object')} 확인할 [원자료 URL·작성 주체·확인일]을 표시해야 합니다.`,`다음 버튼: 「${f.information?'관련 근거 자세히 보기':'선택 조건 확인하기'}」를 비교표 아래에 배치해야 합니다.`],headline:`${koreanParticle(terms,'object')} 같은 기준으로 비교하세요`,message:`[선택안 A]와 [선택안 B]의 ${koreanParticle(terms,'object')} 비교합니다. 각 조건의 근거는 [원자료 URL]에서 확인하세요.`,cta:f.information?'관련 근거 자세히 보기':'선택 조건 확인하기',metric:'조건 열람 후 다음 행동 이용자 ÷ 비교 페이지 방문 이용자 × 100'},
    {id:'act',label:f.information?'이용 · 공식 경로와 후속 자료':f.mode==='visit'?'방문 · 위치와 운영 안내':'신청 · 준비와 진행 상태',audience:`${koreanParticle(book.cta,'object')} 진행하려는 이용자`,questions:[`${koreanParticle(operation,'topic')} 어떻게 확인하나요?`],keywords:[`${placePrefix}${book.label} ${f.information?'이용 안내':f.mode==='visit'?'위치·운영시간':'예약·문의'}`,`${book.label} ${book.preparation[2]}`],landingBlocks:actions,headline:book.cta,message:f.information?'[관련 문서 제목]에서 추가 안내를 확인하세요. 변경된 내용은 [정정·갱신 안내]에 표시합니다.':f.mode==='visit'?'방문 전 [영업시간·휴무일]을 확인하세요. [매장 입구·주차 위치]로 이동하시면 됩니다.':`[필요한 준비 항목]을 정리하고 [접수 경로]로 요청해 주세요. [다음 안내 시점]에 진행 상태를 알려드립니다.`,cta:book.cta,metric:`${book.outcome} 확인 이용자 ÷ 앞 단계 이용자 × 100`},
  ];
  const evidence=allocateSources(sources,STAGE_MATCHERS);
  return specs.map((s,i)=>({...s,evidence:evidence[i],...(evidence[i].find(e=>e.url!==url)?{landingUrl:evidence[i].find(e=>e.url!==url)!.url}:{}),diagnosis:evidence[i].length?`관련 원문 ${evidence[i].length}개`:'작성 제안'}));
}

/** Regenerates editorial sections only. Retained facts, dates and scores stay with their original report. */
export function nonCommerceEditorialSections(p:WebsitePurpose,sources:StrategySource[],url:string,topic:string,book:NonCommercePlaybook){
  return {summary:`${book.label} · ${book.stages.join(' → ')}`,notice:'실행 제안입니다. 대괄호는 담당자가 실제 운영 내용으로 채워야 합니다. 검색량·AI 인용·이용 성과는 별도 측정 대상입니다.',
    segments:buildNonCommerceSegments(p,sources,url,topic,book),briefingPlan:buildNonCommerceBriefing(book,sources),channels:editorialChannels(book),content:editorialContent(book,sources),...editorialMeasurement(book)};
}

export function buildNonCommerceStrategy(data:ExtractedWebsiteData):ServiceStrategy|undefined{
  const p=analyzeWebsitePurpose(data);if(!isNonCommerce(p)||data.collectionNotice||p.business?.id==='international_logistics')return;
  const sources=nonCommerceSources(data);if(!sources.length)return;
  const book=nonCommercePlaybook(p,[data.title,data.description,...data.h1].join(' '),data.diagnosticSeed?.page.localPlaceEvidence);
  const url=data.finalUrl||data.url,topic=(data.h1[0]||data.title||book.label).replace(/\s+/g,' ').slice(0,70);
  return {version:1,industry:'noncommerce',targetUrl:url,capturedAt:data.seoEvidence?.capturedAt||new Date().toISOString(),basis:'source-backed-playbook',sources,findings:buildStrategyFindings(p,sources,url),...nonCommerceEditorialSections(p,sources,url,topic,book)};
}
