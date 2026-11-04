import {MedicalAuditSchema,type MedicalAudit,type MedicalEvidence} from './medicalAuditSchema';
import {MEDICAL_PROFILES} from './medicalProfiles';
import type {DiagnosticPage} from './siteDiagnosticsSchema';
import type {LlmCitationTest} from './reportSchema';
import {sameSite} from './siteIdentity';

export const MEDICAL_SOURCES:MedicalAudit['sources']=[
  {id:'naver-medical',title:'네이버 · 심평원 제공 진료정보',url:'https://help.naver.com/service/30026/contents/20424?lang=ko'},
  {id:'naver-disease',title:'네이버 · 별도 질병명 관리',url:'https://help.naver.com/service/30026/contents/22672?lang=ko&osType=COMMONOS'},
  {id:'naver-channel',title:'네이버 · 공식 연관채널',url:'https://searchadvisor.naver.com/guide/structured-data-channel'},
  {id:'naver-faq',title:'네이버 · FAQ 노출 종료 공지 목록 (2026.07.08)',url:'https://searchadvisor.naver.com/'},
  {id:'naver-ai',title:'네이버 · AI 브리핑 인용수의 적용 범위',url:'https://help.naver.com/service/30056/contents/25217?lang=ko&osType=COMMONOS&ostype=commonos'},
  {id:'helpful',title:'Google · 의료정보의 신뢰·작성 주체',url:'https://developers.google.com/search/docs/fundamentals/creating-helpful-content'},
  {id:'local',title:'Google · LocalBusiness 필수·권장 속성',url:'https://developers.google.com/search/docs/appearance/structured-data/local-business'},
  {id:'schema-policy',title:'Google · 구조화 데이터와 본문 일치',url:'https://developers.google.com/search/docs/appearance/structured-data/sd-policies'},
  {id:'specialty',title:'Schema.org · MedicalSpecialty',url:'https://schema.org/MedicalSpecialty'},
  {id:'medical-page',title:'Schema.org · MedicalWebPage',url:'https://schema.org/MedicalWebPage'},
  {id:'medicine',title:'Schema.org · MedicineSystem',url:'https://schema.org/MedicineSystem'},
  {id:'review',title:'Google · 자사 통제 리뷰 별점 제한',url:'https://developers.google.com/search/docs/appearance/structured-data/review-snippet'},
  {id:'updates',title:'Google · FAQ 리치결과 종료 (2026.05.07)',url:'https://developers.google.com/search/updates'},
  {id:'ai',title:'Google · AI 검색 최적화의 공식 기준',url:'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide'},
  {id:'ai-report',title:'Search Console · 생성형 AI 노출수 보고서',url:'https://support.google.com/webmasters/answer/16984139'},
  {id:'law',title:'의료법 제56조 · 의료광고의 금지 등',url:'https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010102&lsJoLnkSeq=1031169873'},
  {id:'law-review',title:'의료법 제57조 · 해당 매체의 심의',url:'https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1028699103'},
];
export const MEDICAL_STATUS_LABELS:Record<MedicalAudit['checks'][number]['status'],string>={observed:'관측 확인',needs_review:'보강 검토',unverified:'확인 불가',not_applicable:'해당 없음',clinical_review:'전문 검토'};

/** Deterministic review of public evidence. No medical-quality/legality score or fabricated external comparison. */
export function buildMedicalAudit(pages:DiagnosticPage[],limited=false):MedicalAudit|undefined{
  if(!pages.some(p=>p.medicalEvidence?.facilityCandidate))return undefined;
  const pool=pages.filter(p=>p.medicalEvidence&&!p.medicalEvidence.providerOnly&&!p.medicalEvidence.sensitive);
  const signals=pool.flatMap(p=>p.medicalEvidence!.signals),get=(key:string)=>signals.filter(s=>s.key===key).map(s=>s.evidence).slice(0,6);
  const profiles=MEDICAL_PROFILES.flatMap(profile=>{const evidence=get(`profile:${profile.id}`).slice(0,3);return evidence.length?[{id:profile.id,label:profile.label,evidence,focus:profile.focus,questions:profile.questions,schemaHint:profile.schemaHint}]:[];});
  const identity=pool.map(p=>p.medicalEvidence!.identity).join(' ');
  const systems=[...(/한의원|한방병원|한의사|한의과/.test(identity)?['한의과 후보']:[]),...(/치과|치과의사/.test(identity)?['치과 후보']:[]),...(/내과|외과|피부과|안과|이비인후과|가정의학|소아청소년|산부인과|정신건강|비뇨/.test(identity)?['의과 후보']:[])];
  const institutions=[...new Set(identity.match(/상급종합병원|종합병원|한방병원|치과병원|한의원|치과의원|요양병원|의원|병원/g)||[])].slice(0,6);
  const checks:MedicalAudit['checks']=[];
  const add=(id:string,label:string,status:MedicalAudit['checks'][number]['status'],evidence:MedicalEvidence[],detail:string,action:string,sources:string[])=>checks.push({id,label,status,evidence:evidence.slice(0,6),detail,action,sources});
  const observation=(key:string,label:string,detail:string,action:string,sources:string[])=>add(key,label,get(key).length?'observed':limited?'unverified':'needs_review',get(key),detail,action,sources);
  add('classification','진료분야·기관·자격 분리',profiles.length?'observed':'needs_review',profiles.flatMap(p=>p.evidence).slice(0,6),`${systems.join(' · ')||'의료체계 확인 필요'} / ${institutions.join(' · ')||'기관 종별 확인 필요'}. 원문 표현에 따른 후보이며 면허·전문의·의료기관 종별 인증 결과가 아닙니다.`,'의과·한의과·치과, 기관 종별, 실제 진료분야, 서비스 주제를 각각 확인하세요. 피부 시술·장비·학회 가입을 전문의 자격으로 바꾸지 않습니다.',['naver-medical','specialty','law']);
  const roles=new Set(pool.flatMap(p=>p.medicalEvidence!.roles));
  const missingRoles=[['doctors','의료진'],['services','진료안내'],['visit','시간·위치'],['cost','비용·조건']].filter(([id])=>!roles.has(id as 'doctors')).map(([,label])=>label);
  add('coverage','대표 공개 페이지 수집 범위',limited?'unverified':missingRoles.length?'needs_review':'observed',pool.slice(0,6).map(p=>({url:p.url,locator:'수집한 페이지',text:p.title||p.medicalEvidence!.identity||'제목 미감지'})),`${pool.length}개 공개 HTML 표본. 별도 안내 페이지 미확인: ${missingRoles.join(' · ')||'해당 분류 관측'}. 미수집은 실제 사이트에 해당 정보가 없다는 뜻이 아닙니다.`,'의료진·진료안내·시간/위치·비용 안내 원문을 확인합니다. 수집 범위·차단·실패를 보존하며 환자별 상담·검사결과·개인 예약 영역은 제외합니다.',['helpful','ai']);
  add('crawl','공개 정보와 비공개 진료정보',pool.some(p=>p.noindex)?'needs_review':'unverified',pool.filter(p=>p.noindex).slice(0,6).map(p=>({url:p.url,locator:'robots 메타 / 응답 헤더',text:'noindex 선언 관측'})),'정적 응답과 선언만 관측합니다. 실제 Googlebot/Yeti 접근·렌더링·색인은 검색도구 또는 로그에서 확인해야 합니다.','공개 진료안내의 검색 의도를 확인하세요. 비공개 환자 영역의 검색 제외를 해제하거나 검색 노출을 위해 로그인·접근 제한을 풀지 않습니다.',['ai','schema-policy']);
  add('text','핵심 진료안내의 텍스트 제공',pool.some(p=>p.medicalEvidence!.textLength>200)?'observed':limited?'unverified':'needs_review',get('scope'),'수집한 HTML의 본문 텍스트를 확인했습니다. 텍스트 양은 의학적 정확성·브라우저 화면·검색 색인의 검증값이 아닙니다.','진료·의료진·시간·위치의 핵심 정보가 이미지에만 있다면 같은 정보를 읽을 수 있는 본문으로 제공합니다. JavaScript 사용 자체를 실패로 판단하지 않습니다.',['ai','helpful']);
  const entities=pool.flatMap(p=>p.medicalEvidence!.entities.map(entity=>({entity,page:p}))),facilities=entities.filter(x=>!['Person','IndividualPhysician'].includes(x.entity.type));
  const identityIssues=facilities.flatMap(x=>x.entity.issues.filter(s=>/기관명|전화번호|name·PostalAddress/.test(s)).map(text=>({text,locator:x.entity.id||x.entity.type,url:x.page.url})));
  // Compare only the same explicit @id. Different branches/people are never merged by a shared name.
  const grouped=new Map<string,typeof facilities>();
  for(const item of facilities){if(!item.entity.id)continue;let key:string;try{key=new URL(item.entity.id,item.page.url).href;}catch{continue;}grouped.set(key,[...grouped.get(key)||[],item]);}
  for(const group of grouped.values())for(const field of ['name','address','telephone'] as const){
    const values=group.filter(x=>x.entity[field]).map(x=>({...x,value:x.entity[field].normalize('NFKC').replace(field==='telephone'?/[^\d]/g:/\s/g,'')}));
    if(new Set(values.map(x=>x.value)).size>1)for(const x of values)identityIssues.push({url:x.page.url,locator:x.entity.id,text:`동일 @id의 ${field} 값 차이: ${x.entity[field]}`});
  }
  add('identity','기관·지점 기본정보 대조',identityIssues.length?'needs_review':facilities.length?'observed':'unverified',identityIssues.length?identityIssues.slice(0,6):facilities.slice(0,6).map(x=>({url:x.page.url,locator:x.entity.id||x.entity.type,text:[x.entity.name,x.entity.address,x.entity.telephone].filter(Boolean).join(' · ')||'기관 속성 미감지'})),'같은 @id의 기관 정보와 수집 본문을 대조합니다. 지점·전화 표기 차이를 별도로 확인하며 외부 플레이스·심평원 값까지 자동 검증한 결과는 아닙니다.','병원명·주소·층·전화·대표 URL을 같은 지점 기준으로 맞춥니다. 실제 최신값은 운영자가 확인하며 서로 다른 지점에 본원 정보를 복제하지 않습니다.',['local','naver-medical']);
  const hoursIssues=facilities.flatMap(x=>x.entity.issues.filter(text=>text.startsWith('진료시간')).map(text=>({url:x.page.url,locator:x.entity.id||x.entity.type,text})));
  add('hours','진료시간·접수마감·휴진',hoursIssues.length?'needs_review':get('hours').length?'observed':limited?'unverified':'needs_review',hoursIssues.length?hoursIssues:get('hours'),'요일별 진료시간·점심·접수 마감·휴진을 구분합니다. 문구 관측이나 스키마 선언만으로 실제 영업 중임을 보장하지 않습니다.','홈페이지·스키마·플레이스의 같은 요일·같은 지점 시간을 대조하고 의료진별 예약제·공휴일 예외를 별도 확인하세요.',['local']);
  add('naver-source','네이버 진료정보·질병명 대조','unverified',[], '플레이스의 진료과목·전문의·특수장비 등은 심평원 제공 정보입니다. 질병명은 별도 관리하며 현재 공식 안내는 실제 진료 가능한 공공데이터 질병명을 최대 10개 선택하는 방식입니다. 외부 등록값은 이 HTML 검사로 확인하지 않았습니다.','동일 기관인지 식별한 뒤 심평원 원천자료를 확인·수정하고 플레이스 반영을 대조합니다. 질병명은 스마트플레이스의 별도 탭에서 실제 가능한 항목만 확인합니다. 홈페이지 수정만으로 원천정보가 바뀐다고 안내하지 않습니다.',['naver-medical','naver-disease']);
  add('doctors','의료진 소개와 자격 확인',get('doctors').length?'clinical_review':limited?'unverified':'needs_review',get('doctors'),'의료진 관련 문구의 존재와 실제 면허·전문의·경력·현재 소속의 검증을 구분합니다.','이름·직함·실제 담당 진료·현재 소속과 자격 자료를 연결하세요. 자격이 미확인되면 전문의로 인증하거나 새로운 경력을 생성하지 않습니다.',['helpful','naver-medical','law']);
  observation('scope','업종별 진료 대상·범위','관측된 진료분야에 맞는 설명을 검토합니다. 이 항목은 진료과별 공식 순위 요소나 개인별 치료 적합성 판정이 아닙니다.','대상·절차·한계·주의사항과 실제 다음 행동을 해당 진료 페이지에 안내합니다. '+(profiles[0]?.focus||'진료분야를 먼저 확인하세요.'),['helpful','law']);
  const schemaIssues=entities.flatMap(x=>x.entity.issues.map(text=>({url:x.page.url,locator:x.entity.id||x.entity.type,text}))).slice(0,6);
  add('schema','시설·사람·문서 스키마 구분',schemaIssues.length?'needs_review':entities.length?'observed':limited?'unverified':'needs_review',schemaIssues,`관측 형식: ${[...new Set(pool.flatMap(p=>p.medicalEvidence!.formats))].join(' · ')||'관련 선언 미감지'}. Schema.org 어휘 유효성과 Google·네이버의 지원 검색기능은 별도입니다.`,'기관은 MedicalClinic/Hospital/Dentist, 사람은 Person/IndividualPhysician, 의료정보 문서는 MedicalWebPage 등을 실제 역할에 맞게 검토합니다. 본문과 일치하는 값만 사용하고 한의과를 TraditionalChinese로 자동 매핑하지 않습니다.',['schema-policy','specialty','medicine','medical-page','local']);
  add('schema-body','스키마와 본문 사실 일치',schemaIssues.length?'needs_review':entities.length?'observed':'unverified',schemaIssues,'JSON-LD·Microdata·RDFa의 관측값과 본문을 대조한 보완 후보입니다. 어휘 검사나 Rich Results Test 통과가 실제 노출 보장은 아닙니다.','name·주소의 지원 요건과 전화·시간 등 권장 항목을 구분합니다. 원문에 없는 자격·비용·효과를 스키마나 본문에 자동 보완하지 않습니다.',['schema-policy','local']);
  add('pages','진료·의료진·지점별 문서 연결',pool.length>1?'observed':limited?'unverified':'needs_review',pool.slice(0,6).map(p=>({url:p.url,locator:'title',text:p.title||'제목 미감지'})),'주제별 공개 문서와 제목을 표본 관측합니다. 고정 글자 수·H1 개수·지역 키워드 밀도를 합격선으로 쓰지 않습니다.','실제 진료·의료진·지점 정보를 주제에 맞는 URL과 내부 링크로 연결합니다. 지역명만 바꾼 대량의 유사 페이지는 권고하지 않습니다.',['ai','helpful']);
  observation('author','작성·검토 주체와 근거','작성·감수·출처 문구는 실제 검토 완료나 의학적 정확성을 인증하지 않습니다.','실제 작성자·검토자·현재 소속·근거 출처와 진짜 검토일을 연결합니다. 논문 링크 개수나 날짜 자동 갱신만으로 신뢰 점수를 올리지 않습니다.',['helpful','medical-page']);
  add('faq','환자 질문·답변 본문',get('faq').length?'observed':limited?'unverified':'needs_review',get('faq'),'구글 FAQ 리치결과는 2026.05.07 종료됐고 네이버도 2026.07.08 종료 공지를 게시했습니다. 유용한 문답 본문과 FAQ 스키마의 검색결과 확장 노출을 구분합니다.','실제 예약·방문 준비·조건에 답하는 본문을 보완합니다. FAQPage·llms.txt·특수 AI 마크업을 필수로 요구하거나 설치 자체에 가점을 주지 않습니다.',['updates','naver-faq','ai']);
  add('claims','효과·자격·후기 표현 검토',get('claim').length?'clinical_review':'unverified',get('claim'),'효과 단정·과장·자격 오인·중요 부작용 누락·비교 표현 등의 검토 후보입니다. 미감지는 적법성 인증이 아니며 문구 하나만으로 위법을 확정하지 않습니다.','의료진과 담당자가 근거·맥락·매체별 심의 적용을 확인하세요. 후기·전후사진을 필수 SEO 요소로 요구하거나 본원 후기 별점 스키마를 자동 권고하지 않습니다.',['law','law-review','review']);
  add('geo','실제 AI 언급·인용·정보 일치','unverified',[],'이 항목은 실제 AI 응답을 새로 실행한 결과가 아닙니다. 기존 AI 관측 결과와 구글 공식 노출수, 네이버 창작자 채널 인용수를 서로 다른 범위로 관리해야 합니다.','기존 AI 답변 영역에서 질문·플랫폼·모델·시각·병원명 언급·자사 URL 인용·사실 일치를 대조하세요. Google Search Console 생성형 AI 보고서의 노출수는 계정에서 확인하며 API 표본으로 대체하지 않습니다.',['ai-report','naver-ai','ai']);
  return MedicalAuditSchema.parse({version:1,reviewedOn:'2026-11-04',systems,institutions,profiles,checks,sources:MEDICAL_SOURCES,scopeNote:`공개 HTML ${pool.length}개 표본에 기반한 병의원 진단입니다. 세부 항목과 우선순위는 공식 가이드를 업종에 적용한 제품 기준이며 검색엔진 공식 점수가 아닙니다. 외부 플레이스·심평원 등록값, 자격·의학적 정확성·광고 적법성·실제 AI 노출은 추가 확인 대상입니다.${limited?' 추가 수집이 제한되어 미확인을 결함으로 판단하지 않습니다.':''}`});
}

export function medicalPrompt(audit:MedicalAudit|undefined){
  return audit?{classification:{systems:audit.systems,institutions:audit.institutions,profiles:audit.profiles.map(p=>({label:p.label,evidence:p.evidence.slice(0,1),focus:p.focus,questions:p.questions,schemaHint:p.schemaHint}))},scopeNote:audit.scopeNote,checks:audit.checks.map(c=>({label:c.label,status:c.status,evidence:c.evidence.slice(0,1),action:c.action})),rule:'의료진 자격·보험·치료효과·회복기간을 추측하지 않는다. 병원 컨설팅 업체와 실제 진료기관을 구분한다. 피부 시술을 피부과 전문의 자격으로 해석하거나 한의과를 TraditionalChinese로 자동 동일시하지 않는다. FAQPage·llms.txt·후기 별점을 필수로 요구하지 않는다. 원문 관측은 검증된 의료 사실·적법성·실제 AI 인용 성공이 아니다.'}:undefined;
}

/** Bind existing measured API responses; never infer Google/Naver impressions or clinical accuracy. */
export function withMedicalCitation(audit:MedicalAudit|undefined,citation:LlmCitationTest|null|undefined,target:string):MedicalAudit|undefined{
  if(!audit||citation?.measurementVersion!==2)return audit;
  const rows=citation.results.filter(r=>r.engine==='chatgpt'),responses=rows.filter(r=>(r.status==='ok'||r.status==='unverified')&&!!r.responseText);
  const verified=rows.filter(r=>r.status==='ok'&&r.searchUsed===true&&r.citationVerified===true);
  const own=verified.filter(r=>r.sources?.some(s=>s.ownership==='own'&&sameSite(s.url,target)));
  const evidence=responses.slice(0,6).map(r=>({text:`질문: ${r.question}\n답변 표본: ${(r.responseText||'').slice(0,350)}`.slice(0,600),locator:`OpenAI ${r.model||'모델 미기록'} · ${r.measuredAt||'시각 미기록'}`.slice(0,150),url:r.sources?.find(s=>s.ownership==='own'&&sameSite(s.url,target))?.url||target}));
  return MedicalAuditSchema.parse({...audit,checks:audit.checks.map(c=>c.id==='geo'?{...c,status:responses.length?'observed':'unverified',evidence,detail:`OpenAI API 표본 ${rows.length}건 중 답변 ${responses.length}건, 병원명 언급 ${responses.filter(r=>r.brandMentioned===true).length}건, 검색·출처 판정 ${verified.length}건, 자사 URL 인용 ${own.length}건입니다. 질문·모델·시점에 한정한 관측으로 일반 ChatGPT 화면·구글/네이버 실제 노출 실적과 다릅니다. 답변의 의학적 정확성과 운영정보 일치는 별도 확인 대상입니다.`,action:'아래 질문·답변과 기존 AI 답변 영역의 전체 응답·출처를 열어 병원명·같은 지점 주소·진료시간·자격·실제 진료를 원문과 대조하세요. 출처 인용만으로 사실 일치나 치료 적합성을 인증하지 않습니다. Google Search Console의 생성형 AI 노출수는 계정 보고서에서 확인합니다.'}:c)});
}
