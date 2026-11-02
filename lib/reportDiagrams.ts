import type {MarketingReport} from './reportSchema';
import type {ReportInsights} from './reportInsights';
import type {ReportRole} from './reportRoles';
import {buildSourceLibrary} from './reportContent';

export type DiagramIcon='firstView'|'cta'|'copywriting'|'trust'|'conversionFlow'|'adLanding'|'mobileUx'|'seo';
export type DiagramNode={title:string;detail:string;icon:DiagramIcon;role:ReportRole;value?:string};
export type ReportDiagram={title:string;note:string;kind:'flow'|'compare'|'branch'|'cycle'|'equation';nodes:DiagramNode[];scope?:string};
const node=(title:string,detail:string,icon:DiagramIcon,role:ReportRole='current'):DiagramNode=>({title,detail,icon,role});
const diagram=(title:string,nodes:DiagramNode[],note:string,kind:ReportDiagram['kind']='flow'):ReportDiagram=>({title,nodes,note,kind});

/** Concepts and saved counts, never synthetic scores or predictions. */
const guides:Record<string,ReportDiagram>={
 'overview-sector':diagram('우리 업종에서 고객이 확인할 세 가지',[node('이용 대상','누구에게 해당하는지','firstView'),node('제공 범위','무엇을 제공하고 제외하는지','copywriting','review'),node('다음 행동','문의·신청 방법과 조건','cta','proposal')],'업종별 조건을 실제 안내 문구와 대조하세요.'),
 'overview-observations':diagram('페이지에서 읽은 것과 직접 확인할 것을 나누어 보세요',[node('수집한 문구·설정','제목·설명·본문 등 저장된 정보','copywriting'),node('실제 화면·동작','모바일·버튼·이용 과정 확인','mobileUx','verify')],'수집 기록과 실제 이용 경험은 확인 방법이 다릅니다.','compare'),
 'overview-comparison':diagram('이전과 현재, 같은 항목을 나란히',[node('이전 기록','같은 URL의 보관된 진단','copywriting'),node('현재 기록','같은 기준·항목으로 대조','trust','verify')],'항목이 사라진 것과 문제가 해결된 것은 구분합니다.','compare'),
 'geo-observations':diagram('AI 답변은 세 가지를 각각 확인합니다',[node('답변 관측','질문에 어떤 답을 했는지','conversionFlow'),node('브랜드 언급','우리 이름을 포함했는지','firstView','review'),node('자사 출처','우리 URL을 연결했는지','seo','verify')],'브랜드가 언급돼도 자사 페이지가 출처로 연결된 것은 아닙니다.','branch'),
 'geo-questions':diagram('고객 질문에서 답변할 페이지까지',[node('고객 질문','무엇을 알고 싶은지','firstView'),node('연결할 페이지','인용 URL 또는 검토 후보','seo','location'),node('보강할 답변','사실·조건·근거를 함께','copywriting','proposal')],'페이지를 정한 뒤 질문 바로 아래에 답변을 보완하세요.'),
 'geo-brand':diagram('같은 업체인지, 같은 내용인지',[node('AI 답변의 표현','업체명·서비스·가격 확인','conversionFlow'),node('우리 홈페이지','현재 제공 범위·조건 대조','trust','verify')],'연결된 출처의 업체명과 최신 조건도 함께 확인하세요.','compare'),
 'geo-sources':diagram('외부 출처를 참고하기 전, 관련성부터',[node('연결된 질문','어떤 답변에 쓰였는지','firstView'),node('원문 관련성','업종·서비스가 맞는지','trust','review'),node('활용할 구성','비용·FAQ·근거의 배치','copywriting','proposal')],'다른 업종의 상품·가격을 경쟁력 비교에 사용하지 마세요.'),
 'geo-readiness':diagram('읽을 정보가 있어야 답변 근거를 만들 수 있습니다',[node('페이지 정보','누구에게 무엇을 제공하는지','copywriting'),node('질문과 답변','구체적인 설명과 조건','conversionFlow','proposal'),node('확인 가능한 근거','작성 주체·사례·출처','trust','verify')],'콘텐츠 준비도와 실제 AI 언급·인용은 별개의 결과입니다.'),
 'geo-comparison':diagram('같은 질문으로 다시 관측하고 출처를 대조하세요',[node('이전 답변','질문·시점·관측 조건 확인','conversionFlow'),node('현재 답변','언급·인용·출처의 변화','seo','verify')],'질문이나 측정 조건이 달라지면 변화 해석에 주의하세요.','compare'),
 'search-platforms':diagram('내 제작 도구에서 해당 페이지로',[node('제작 도구 확인','감지된 플랫폼과 실제 관리자','mobileUx'),node('수정 항목 찾기','해당 URL의 입력란·원문','seo','location'),node('적용 후 확인','PC·모바일과 최종 출력','trust','verify')],'공통 설정과 개별 페이지 설정을 구분해 적용하세요.'),
 'search-edits':diagram('원문을 보고, 수정안을 적용하고, 다시 확인',[node('현재 원문','저장된 제목·설명·버튼','copywriting'),node('수정할 문구','실제 제공 내용에 맞게','copywriting','proposal'),node('적용 결과','화면·설정·연결 동작','trust','verify')],'원문과 제안을 섞지 않고 같은 위치에서 비교하세요.'),
 'search-sources':diagram('수집한 문구와 이동 주소는 이렇게 연결됩니다',[node('고유 문구','중복을 정리한 원문','copywriting'),node('원문 종류','제목·본문·버튼·설정','firstView','review'),node('이동 주소','사이트 안팎의 목적별 링크','seo','location')],'원문은 그대로 확인하고, 주소는 연결된 목적에 맞게 열어보세요.','branch'),
 'search-keywords':diagram('자주 나온 표현이 곧 좋은 검색어는 아닙니다',[node('본문 표현','실제 페이지에서 수집한 단어','copywriting'),node('주제 적합성','상품·서비스를 대표하는지','trust','review'),node('자연스러운 문장','제목·설명·본문에 연결','seo','proposal')],'본문의 빈도와 검색량·인기·검색 순위는 다릅니다.'),
 'search-naver':diagram('검색·광고·상품, 확인할 영역부터 구분',[node('공개 페이지','문구·설정의 수집 근거','seo'),node('실제 운영 계정','등록·연동·이벤트 상태','mobileUx','location'),node('완료 확인','안내한 조건과 결과 대조','trust','verify')],'홈페이지에서 보이는 단서만으로 계정 연동 성공을 판단하지 않습니다.'),
 'search-official':diagram('공식 기준을 내 페이지에 맞게 적용',[node('공식 안내','해당 기능의 적용 조건','trust'),node('현재 페이지','실제로 쓰는 기능과 관측값','copywriting','review'),node('필요한 수정','해당 항목만 적용·확인','cta','proposal')],'모든 속성이 모든 사이트의 필수 항목인 것은 아닙니다.'),
 'search-scope':diagram('어디까지 확인했는지부터 살펴보세요',[node('읽은 범위','입력 페이지·저장된 정보','firstView'),node('직접 확인할 범위','화면·계정·실제 성과','mobileUx','verify')],'수집하지 못한 정보는 실제로 없는 정보와 다릅니다.','compare'),
 'search-checklist':diagram('상태를 확인하고, 필요한 조치만',[node('현재 기록','관측값과 판정 상태','copywriting'),node('보완·검토','해당 근거와 조건을 확인','trust','review'),node('수정·재확인','안내된 조치 후 같은 항목 대조','cta','verify')],'판정 색상만 보지 말고 원문 근거와 적용 조건을 함께 보세요.'),
 'competition-map':diagram('수집한 후보에서 실제 비교 대상으로',[node('비교 후보','수집한 업체·페이지','adLanding'),node('관련성 확인','업종·상품·고객이 맞는지','trust','review'),node('같은 기준 비교','제목·설명·행동 안내 대조','copywriting','verify')],'비교 지도는 저장된 페이지 표현 기준이며 시장점유율 지도가 아닙니다.'),
 'competition-messages':diagram('같은 메시지 주제로 나란히 비교',[node('자사 표현','제목·설명에 담긴 메시지','copywriting'),node('후보 표현','같은 주제의 문구와 수집 상태','adLanding','review')],'표현이 탐지되지 않았다고 해당 서비스가 없다는 뜻은 아닙니다.','compare'),
 'competition-pages':diagram('비교 카드에서 원문과 다음 행동까지',[node('검색 표현','제목·메타 설명','seo'),node('첫 화면 문구','제공 가치와 대상','firstView','review'),node('행동 버튼','무엇으로 연결되는지','cta','location')],'저장된 문구를 실제 페이지와 대조해 참고할 구성을 고르세요.'),
 'competition-benchmark':diagram('동일한 표본·기준인지 확인한 뒤 비교',[node('우리 기록','현재 진단과 관측 범위','copywriting'),node('업종 표본','수집 시점·표본 수·평가 기준','adLanding','review')],'표본 비교와 업계 전체의 평균은 구분하세요.','compare'),
 'actions-board':diagram('과제를 담당자에게 연결하고 완료를 확인',[node('진단 과제','원문·문제·수정안 확인','copywriting'),node('담당과 위치','수정 권한에 맞게 배정','firstView','location'),node('완료 조건','적용 후 같은 항목 대조','trust','verify')],'확인한 근거·원래 작업 순서·완료 조건을 함께 전달하세요.'),
 'actions-guide':diagram('검색에서 찾고, 답변으로 이해하고, 행동으로',[node('SEO · 찾기','검색 수집·제목·설명','seo'),node('GEO·AEO · 이해','질문에 답할 정보와 출처','conversionFlow','proposal'),node('행동 · 완료','문의·구매와 실제 기록','cta','verify')],'각 단계의 준비 상태와 실제 성과 지표를 나누어 확인하세요.'),
 'actions-issues':diagram('문제의 근거에서 조치와 확인까지',[node('무엇이 보였나','문제와 원문 근거','firstView'),node('어떻게 바꾸나','이유에 맞는 수정안','copywriting','proposal'),node('무엇을 확인하나','적용 조건과 실제 변화','trust','verify')],'제안은 적용 전 실제 제공 내용과 대조하세요.'),
 'actions-copy':diagram('같은 위치의 현재 문구와 수정 제안',[node('현재 표현','수집한 원문·기존 문구','copywriting'),node('수정 제안','대상·가치·다음 행동을 명확히','cta','proposal')],'가격·기간·성과 등은 확인된 사실만 문구에 담으세요.','compare'),
 'actions-schedule':diagram('급한 확인부터 적용과 검증까지',[node('즉시','현재 상태와 우선 작업 확인','firstView'),node('이번 주','문구·페이지·설정 수정','copywriting','proposal'),node('이번 달','실제 지표와 재진단 대조','trust','verify')],'기한별 항목 수이며, 자동 배정되거나 완료된 작업 수는 아닙니다.'),
 'actions-kpi':diagram('현재 비율을 기준으로 필요한 유입 계산',[node('목표 완료','같은 기간에 달성할 목표','cta','proposal'),node('현재 완료 비율','현재 완료 ÷ 현재 유입','firstView'),node('필요 유입','목표 완료 ÷ 현재 비율','seo','review')],'현재 비율이 유지된다는 가정입니다. 수정 효과나 미래 성과의 예측은 아닙니다.','equation'),
 'actions-geo':diagram('관측에서 답변 보강으로, 다시 관측까지',[node('답변 관측','언급·인용·출처 기록','conversionFlow'),node('내용 보강','질문에 맞는 사실과 조건','copywriting','proposal'),node('다시 확인','같은 질문과 기준으로 대조','trust','verify')],'콘텐츠를 바꿨다고 AI 인용이 보장되는 것은 아닙니다.','cycle'),
};

export function buildReportDiagrams(report:MarketingReport,data:ReportInsights):Record<string,ReportDiagram>{
 const result=Object.fromEntries(Object.entries(guides).map(([id,g])=>[id,{...g,nodes:g.nodes.map(n=>({...n}))}]));
 const set=(id:string,index:number,value:string)=>{result[id].nodes[index].value=value;result[id].scope='저장된 보고서 기준';};
 const sources=buildSourceLibrary(report);
 if(!data.tasks.length)result['overview-priority']=diagram('과제가 생기면 이 순서로 실행합니다',[node('근거 확인','먼저 현재 페이지 기록을 확인','firstView'),node('할 일과 담당','실제 권한에 맞게 작업을 정리','copywriting','proposal'),node('완료 확인','적용 결과와 같은 항목을 대조','trust','verify')],'현재 저장된 보완 항목은 없습니다. 실행 방법을 설명하는 개념도입니다.');
 set('search-sources',0,`${sources.groups.length}개`);set('search-sources',2,`${sources.links.length}개`);
 set('competition-map',0,`${data.competitorCount}개 후보`);
 set('actions-board',0,`${data.tasks.length}개 항목`);
 set('actions-issues',0,`${report.criticalIssues.length}개 이슈`);
 const roadmap=report.priorityRoadmap;
 for(const [i,key] of (['immediately','thisWeek','thisMonth'] as const).entries())set('actions-schedule',i,`${roadmap[key].length}개 항목`);
 return result;
}
