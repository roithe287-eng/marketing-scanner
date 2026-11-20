import type {MarketingReport} from './reportSchema';
import type {ReportInsights} from './reportInsights';
import type {ReportRole} from './reportRoles';
import {buildSourceLibrary} from './reportContent';
import {buildDiagnosisComparison} from './diagnosisComparison';
import {buildGeoComparison} from './geoComparison';
import {readinessItems} from './reportVisuals';

export type DiagramIcon='firstView'|'cta'|'copywriting'|'trust'|'conversionFlow'|'adLanding'|'mobileUx'|'seo';
export type DiagramNode={title:string;detail:string;icon:DiagramIcon;role:ReportRole;value?:string;target?:{id:string;label:string}};
export type ReportDiagram={title:string;note:string;kind:'flow'|'compare'|'branch'|'cycle'|'equation';nodes:DiagramNode[];scope?:string;formula?:string;example?:string};
const node=(title:string,detail:string,icon:DiagramIcon,role:ReportRole='current'):DiagramNode=>({title,detail,icon,role});
const diagram=(title:string,nodes:DiagramNode[],note:string,kind:ReportDiagram['kind']='flow'):ReportDiagram=>({title,nodes,note,kind});

/** Concepts and saved counts, never synthetic scores or predictions. */
const guides:Record<string,ReportDiagram>={
 'overview-sector':diagram('우리 업종에서 고객이 확인할 세 가지',[node('이용 대상','누구에게 해당하는지','firstView'),node('제공 범위','무엇을 제공하고 제외하는지','copywriting','review'),node('다음 행동','문의·신청 방법과 조건','cta','proposal')],'업종별 조건을 실제 안내 문구와 대조하세요.'),
 'overview-observations':diagram('HTML에서 확인한 내용과 실제 이용 점검',[node('저장된 원문','제목·설명·본문과 코드 항목의 상태를 확인합니다.','copywriting'),node('화면에서 직접 확인','휴대폰에서 열고 버튼을 눌러 문의나 구매 단계까지 이동합니다.','mobileUx','verify')],'문구 수집 결과와 실제 사용 확인에는 서로 다른 기준을 적용합니다.','compare'),
 'overview-comparison':diagram('같은 페이지에서 상태가 달라진 항목',[node('이전 기록','같은 주소에서 이전에 확인한 항목입니다.','copywriting'),node('현재 기록','같은 기준으로 확인한 현재 항목입니다.','trust','verify'),node('재확인 항목','현재 기록에서 빠졌거나 조건이 다른 항목을 직접 확인합니다.','seo','review')],'기준이 다른 항목은 재확인 대상으로 분류합니다.','compare'),
 'geo-observations':diagram('AI 답변의 세 가지 확인 범위',[node('저장된 답변 관측','질문에 대해 AI가 반환한 기록입니다.','conversionFlow'),node('우리 이름이 나왔는지','브랜드 언급 여부를 판정한 답변을 확인합니다.','firstView','review'),node('우리 페이지가 근거였는지','검색·출처를 판정한 답변에서 자사 페이지 링크를 확인합니다.','seo','verify')],'브랜드 언급과 자사 출처는 판정 가능한 답변 수가 서로 다를 수 있습니다.','branch'),
 'geo-questions':diagram('질문의 근거에서 답변할 페이지를 고르는 법',[node('자사 페이지가 인용된 질문','AI가 이미 연결한 페이지에서 답변과 조건을 먼저 확인합니다.','seo'),node('자사 페이지가 연결되지 않은 질문','고객 질문을 설명할 수 있는 기존 페이지를 후보로 검토합니다.','copywriting','location'),node('판정할 수 없는 질문','검색과 출처를 확인한 뒤 답변할 페이지를 정합니다.','trust','verify')],'페이지 후보는 현재 사이트의 제공 내용과 일치하는지 검토하세요.','branch'),
 'geo-brand':diagram('답변의 업체명과 조건을 대조하는 법',[node('AI가 쓴 업체명과 서비스','어떤 업체를 어떤 서비스와 연결했는지 읽습니다.','conversionFlow'),node('우리의 최신 안내','실제 서비스 범위와 조건을 대조합니다.','trust','verify')],'일치 여부를 확인한 날짜와 근거 페이지를 함께 기록하세요.','compare'),
 'geo-sources':diagram('외부 링크가 어떤 질문에 쓰였는지 확인하기',[node('확인할 외부 페이지','질문과 관련된 설명 구조를 살펴봅니다.','seo'),node('별도로 보관한 출처','자사 사이트나 제외한 대형몰 등의 원문 기록을 확인합니다.','trust','review')],'출처가 어떤 질문에 연결됐는지 먼저 읽고 참고 범위를 정하세요.','branch'),
 'geo-readiness':diagram('답변에 필요한 정보를 어느 위치에 둘까요?',[node('서비스 소개','대상과 제공 범위를 본문에 씁니다.','copywriting'),node('질문 바로 아래','가장 중요한 답변을 먼저 쓰고 적용 조건을 덧붙입니다.','conversionFlow','proposal'),node('주장 옆 근거','가까운 위치에 확인 날짜와 원출처를 연결합니다.','trust','location')],'작성한 내용은 실제 값과 대조하고, AI 사용 여부는 같은 질문으로 따로 재측정하세요.','flow'),
 'geo-comparison':diagram('같은 질문을 조건이 맞는 경우에 비교',[node('비교 가능한 관측','질문·엔진·요청 조건이 같고 양쪽 출처가 판정된 관측입니다.','conversionFlow'),node('비교에서 제외된 관측','실패, 미확인, 측정 조건이 바뀐 이유를 확인합니다.','trust','review')],'AI 답변은 사이트를 수정하지 않은 기간에도 달라질 수 있습니다.','compare'),
 'search-platforms':diagram('내 제작 도구에서 해당 페이지로',[node('제작 도구 확인','감지된 플랫폼과 실제 관리자','mobileUx'),node('수정 항목 찾기','해당 URL의 입력란·원문','seo','location'),node('적용 후 확인','PC·모바일과 최종 출력','trust','verify')],'공통 설정과 개별 페이지 설정을 구분해 적용하세요.'),
 'search-edits':diagram('수정하려는 문구의 위치를 고르세요',[node('검색에서 보이는 문구','검색 제목과 설명의 입력란을 확인합니다.','seo','location'),node('사이트에서 읽는 문구','페이지 대표 제목과 버튼의 문구를 확인합니다.','copywriting','location'),node('저장한 뒤 확인','검색 설정과 실제 화면이 바뀌었는지 확인합니다.','trust','verify')],'제목·설명을 바꾼 뒤 화면과 설정을 각각 대조하세요.','branch'),
 'search-sources':diagram('수집한 문구와 이동 주소는 이렇게 연결됩니다',[node('고유 문구','중복을 정리한 원문','copywriting'),node('원문 종류','제목·본문·버튼·설정','firstView','review'),node('이동 주소','사이트 안팎의 목적별 링크','seo','location')],'원문은 그대로 확인하고, 주소는 연결된 목적에 맞게 열어보세요.','branch'),
 'search-keywords':diagram('자주 나온 표현이 곧 좋은 검색어는 아닙니다',[node('본문 표현','실제 페이지에서 수집한 단어','copywriting'),node('주제 적합성','상품·서비스를 대표하는지','trust','review'),node('자연스러운 문장','제목·설명·본문에 연결','seo','proposal')],'본문의 빈도와 검색량·인기·검색 순위는 다릅니다.'),
 'search-naver':diagram('검색·광고·상품, 확인할 영역부터 구분',[node('공개 페이지','문구·설정의 수집 근거','seo'),node('실제 운영 계정','등록·연동·이벤트 상태','mobileUx','location'),node('완료 확인','안내한 조건과 결과 대조','trust','verify')],'홈페이지에서 보이는 단서만으로 계정 연동 성공을 판단하지 않습니다.'),
 'search-official':diagram('공식 기준을 내 페이지에 맞게 적용',[node('공식 안내','해당 기능의 적용 조건','trust'),node('현재 페이지','실제로 쓰는 기능과 관측값','copywriting','review'),node('필요한 수정','해당 항목만 적용·확인','cta','proposal')],'모든 속성이 모든 사이트의 필수 항목인 것은 아닙니다.'),
 'search-technical':diagram('페이지 문구와 수집 정책을 확인할 위치',[node('직접 읽은 HTML','입력 페이지와 수집된 공개 내부 페이지입니다.','copywriting'),node('페이지별 점검 항목','중복 제목과 페이지별 구조화 정보를 확인합니다.','trust','review'),node('검색·AI 수집 정책','검색, 학습, 사용자 요청에 해당하는 접근 규칙을 각각 읽습니다.','seo','verify')],'수집 정책은 웹사이트에 표시된 규칙입니다. 실제 검색엔진 방문과 색인은 실측 자료에서 확인하세요.','branch'),
 'search-scope':diagram('이번에 확인한 자료와 남은 확인 항목',[node('수집한 원문','진단에 사용한 페이지 내용과 주소입니다.','firstView'),node('범위가 제한된 분석','수집 제한이나 분석 오류가 있으면 해당 결과의 확인 범위를 읽습니다.','mobileUx','review')],'판단이 필요한 항목은 해당 근거와 실제 화면을 함께 확인하세요.','compare'),
 'search-checklist':diagram('상태를 확인하고, 필요한 조치만',[node('현재 기록','관측값과 판정 상태','copywriting'),node('보완·검토','해당 근거와 조건을 확인','trust','review'),node('수정·재확인','안내된 조치 후 같은 항목 대조','cta','verify')],'판정 색상만 보지 말고 원문 근거와 적용 조건을 함께 보세요.'),
 'competition-map':diagram('어떤 후보를 비교 지도에 올렸나요?',[node('저장된 외부 후보','이 보고서의 경쟁사 분석에서 남긴 사이트입니다.','adLanding'),node('도표에서 비교하는 후보','제목과 설명을 모두 읽었고 비교 검색어를 분석할 수 있습니다.','copywriting','verify'),node('비교 보류','원문이나 검색어를 충분히 확인하지 못한 후보입니다.','trust','review')],'시장 성과를 평가하려면 실제 판매·가격·고객 자료를 별도로 확인하세요.','branch'),
 'competition-messages':diagram('제목·설명에 함께 담긴 정보를 확인하는 법',[node('자사에서 확인한 표현','자사 원문에 실제로 적힌 가격·혜택·신뢰 등의 표현입니다.','copywriting'),node('후보에서 자주 확인한 표현','두 원문을 확보한 후보만 비교하고 자사에서 보완할 정보를 고릅니다.','adLanding','review')],'서비스 제공 여부는 제목·설명과 서비스 상세 안내를 함께 확인하세요.','compare'),
 'competition-pages':diagram('비교 카드에서 원문과 다음 행동까지',[node('검색 표현','제목·메타 설명','seo'),node('첫 화면 문구','제공 가치와 대상','firstView','review'),node('행동 버튼','무엇으로 연결되는지','cta','location')],'저장된 문구를 실제 페이지와 대조해 참고할 구성을 고르세요.'),
 'competition-benchmark':diagram('동일한 표본·기준인지 확인한 뒤 비교',[node('우리 기록','현재 진단과 관측 범위','copywriting'),node('업종 표본','수집 시점·표본 수·평가 기준','adLanding','review')],'표본 비교와 업계 전체의 평균은 구분하세요.','compare'),
 'actions-board':diagram('진단 항목을 담당자와 수정 위치에 연결',[node('저장된 보완 항목','기본 진단, 검색, AI 등에서 제시한 작업 기록입니다.','copywriting'),node('담당자가 확인할 화면','제작 도구, 공개 페이지, 실제 계정 중 작업할 곳을 확인합니다.','firstView','location'),node('완료를 확인하는 방법','수정한 항목을 같은 화면이나 계정에서 다시 점검합니다.','trust','verify')],'같은 문제가 다른 진단에서 발견되면 근거가 각각 저장될 수 있습니다.'),
 'actions-guide':diagram('검색에서 찾고, 답변으로 이해하고, 행동으로',[node('SEO · 찾기','검색 수집·제목·설명','seo'),node('GEO·AEO · 이해','질문에 답할 정보와 출처','conversionFlow','proposal'),node('행동 · 완료','문의·구매와 실제 기록','cta','verify')],'각 단계의 준비 상태와 실제 성과 지표를 나누어 확인하세요.'),
 'actions-issues':diagram('문제의 근거에서 조치와 확인까지',[node('무엇이 보였나','문제와 원문 근거','firstView'),node('어떻게 바꾸나','이유에 맞는 수정안','copywriting','proposal'),node('무엇을 확인하나','적용 조건과 실제 변화','trust','verify')],'제안은 적용 전 실제 제공 내용과 대조하세요.'),
 'actions-copy':diagram('같은 위치의 현재 문구와 수정 제안',[node('현재 표현','수집한 원문·기존 문구','copywriting'),node('수정 제안','대상·가치·다음 행동을 명확히','cta','proposal')],'가격·기간·성과 등은 확인된 사실만 문구에 담으세요.','compare'),
 'actions-schedule':diagram('언제 확인하고, 언제 수정하나요?',[node('즉시','수집 제한과 주요 화면의 상태를 확인합니다.','firstView'),node('이번 주','담당자를 정하고 문구와 설정을 적용합니다.','copywriting','proposal'),node('이번 달','수정 화면과 실제 지표를 다시 확인합니다.','trust','verify')],'항목 수는 기한별 기록 기준입니다. 같은 작업이 여러 시기에 등록될 수 있습니다.'),
 'actions-kpi':diagram('현재 비율을 기준으로 필요한 유입 계산',[node('목표 완료','같은 기간에 달성할 목표','cta','proposal'),node('현재 완료 비율','현재 완료 ÷ 현재 유입','firstView'),node('필요 유입','목표 완료 ÷ 현재 비율','seo','review')],'현재 비율이 유지된다는 가정입니다. 수정 효과나 미래 성과의 예측은 아닙니다.','equation'),
 'actions-geo':diagram('관측에서 답변 보강으로, 다시 관측까지',[node('답변 관측','언급·인용·출처 기록','conversionFlow'),node('내용 보강','질문에 맞는 사실과 조건','copywriting','proposal'),node('다시 확인','같은 질문과 기준으로 대조','trust','verify')],'콘텐츠를 바꿨다고 AI 인용이 보장되는 것은 아닙니다.','cycle'),
};

export function buildReportDiagrams(report:MarketingReport,data:ReportInsights,sources=buildSourceLibrary(report)):Record<string,ReportDiagram>{
 const result=Object.fromEntries(Object.entries(guides).map(([id,g])=>[id,{...g,scope:'결과 읽는 법',nodes:g.nodes.map(n=>({...n}))}])) as Record<string,ReportDiagram>;
 const set=(id:string,index:number,value:string)=>{result[id].nodes[index].value=value;result[id].scope='저장된 보고서 기준';};
 const link=(id:string,index:number,targetId:string,label:string)=>{result[id].nodes[index].target={id:targetId,label};};
 const review=report.evidenceReview;
 const concernCount=report.analysisWarnings?.length||0;
 const observation=data.obs;
 const diagnosisComparison=buildDiagnosisComparison(report);
 const geoComparison=buildGeoComparison(report);
 if(review){
   set('overview-observations',0,review.assessed?`${review.assessed}개 중 ${review.passed}개 충족`:'판정 가능한 HTML 항목 없음');
   if(review.unknown>0)set('overview-observations',1,`HTML 미확인 ${review.unknown}개`);
   link('overview-observations',0,'report-html-observations','항목별 HTML 근거 보기');
   link('overview-observations',1,'report-conversion-verification','직접 확인할 순서 보기');
 }
 if(diagnosisComparison){
   set('overview-comparison',2,diagnosisComparison.blocked?'비교 보류':`재확인 ${diagnosisComparison.items.filter(item=>item.group==='unknown').length}개`);
   link('overview-comparison',2,'report-recheck','이전 결과와 대조하기');
 }
 if(observation?.total){
   set('geo-observations',0,`${observation.total}건`);
   set('geo-observations',1,observation.mentionTotal?`${observation.mentionTotal}건 중 ${observation.mentionCount}건`:'언급 판정 자료 없음');
   set('geo-observations',2,observation.sourceTotal?`${observation.sourceTotal}건 중 ${observation.sourceCount}건`:'출처 판정 자료 없음');
 }
 if(data.questions.length){
   const kinds=['인용 페이지','입력 페이지 검토','재측정 후 연결'] as const;
   kinds.forEach((kind,i)=>set('geo-questions',i,`${data.questions.filter(question=>question.kind===kind).length}개 질문`));
 }
 if(data.reviewSummary.verified){
   set('geo-brand',0,`내용 대조 ${data.reviews.length}건`);
   link('geo-brand',0,'report-view-geo-observations','AI 답변 원문 확인');
   set('geo-sources',0,`${data.eligibleSources.length}개 주소`);
   set('geo-sources',1,`${data.excludedSources.length}개 주소`);
 }
 if(report.discoverability)set('geo-readiness',0,`${readinessItems(report.discoverability).length}개 점검`);
 if(geoComparison){
   set('geo-comparison',0,`${geoComparison.matched}쌍`);
   set('geo-comparison',1,`${geoComparison.excluded}쌍`);
 }
 link('search-edits',0,'report-edit-title','검색 제목 수정안 보기');
 link('search-edits',1,'report-edit-hero','대표 제목 수정안 보기');
 if(sources.groups.length||sources.links.length||report.pageEvidence){
   set('search-sources',0,`${sources.groups.length}개`);
   set('search-sources',2,`${sources.links.length}개`);
 }
 if(report.naverOptimization?.mode==='diagnosis'){
   result['search-naver'].nodes[0].title='확보한 근거로 확인';
   result['search-naver'].nodes[1].title='직접 확인할 항목';
   result['search-naver'].nodes[1].detail='안내한 운영 계정이나 실제 페이지에서 확인합니다.';
   result['search-naver'].nodes[2].title='수정이나 조치가 필요한 항목';
   const checks=report.naverOptimization.checks;
   set('search-naver',0,`${checks.filter(c=>c.status==='observed').length}개 확인`);
   set('search-naver',1,`${checks.filter(c=>c.status==='manual').length}개 확인 필요`);
   set('search-naver',2,`${checks.filter(c=>c.status==='action').length}개 조치 필요`);
 }
 link('search-official',0,'report-search-document-library','적용 조건과 공식 문서 열기');
 if(report.checklist?.length){
   set('search-checklist',0,`${report.checklist.length}개 항목`);
   set('search-checklist',1,`${report.checklist.filter(c=>c.status==='fail'||c.status==='warning'||c.status==='review').length}개 보완·검토`);
 }
 if(report.siteDiagnostics){
   set('search-technical',0,`${report.siteDiagnostics.pages.length}개 HTML`);
   set('search-technical',1,`${report.siteDiagnostics.findings.length}개 점검`);
   set('search-technical',2,`${report.siteDiagnostics.crawlers.length}개 봇 정책`);
 }
 if(concernCount){
   set('search-scope',1,`${concernCount}개 항목`);
   link('search-scope',1,'report-coverage-warnings-heading','제한 사유와 영향 확인');
 }
 if(report.competitorAnalysis){
   const comparable=data.messageRows.filter(row=>!row.isOwn&&row.canPosition).length;
   set('competition-map',0,`${data.competitorCount}개 후보`);
   set('competition-map',1,`${comparable}곳`);
   set('competition-map',2,`${data.competitorCount-comparable}곳`);
   if(data.competitorCount)link('competition-map',1,'report-view-competition-messages','제목·설명 표현 비교 보기');
 }
 if(!data.tasks.length)result['overview-priority']=diagram('과제가 생기면 이 순서로 실행합니다',[node('근거 확인','먼저 현재 페이지 기록을 확인','firstView'),node('할 일과 담당','실제 권한에 맞게 작업을 정리','copywriting','proposal'),node('완료 확인','적용 결과와 같은 항목을 대조','trust','verify')],'현재 저장된 보완 항목은 없습니다. 실행 방법을 설명하는 개념도입니다.');
 set('actions-board',0,`${data.tasks.length}개 항목`);
 link('actions-board',1,'report-work-map','수정 위치별 작업 열기');
 set('actions-issues',0,`${report.criticalIssues.length}개 이슈`);
 for(const [i,key] of (['immediately','thisWeek','thisMonth'] as const).entries()){
   const tasks=report.priorityRoadmap[key];
   set('actions-schedule',i,`${tasks.length}개 항목`);
   if(tasks.length)link('actions-schedule',i,`report-roadmap-${key}-0`,'첫 작업 확인');
 }
 result['actions-kpi'].formula='필요한 유입 수 = 목표 완료 수 ÷ 현재 완료율';
 result['actions-kpi'].example='필요한 유입은 정수로 올림합니다. 계산값이 1,500.2회라면 1,501회를 목표로 잡습니다.';
 link('actions-kpi',2,'report-simple-kpi','내 숫자로 계산하기');
 return result;
}
