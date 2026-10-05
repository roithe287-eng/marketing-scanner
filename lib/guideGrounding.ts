import type {PageElement,SiteEditing} from './siteEditingSchema';
import type {GuideTopic} from './guideKnowledge';

export const REGION_NAMES={head:'검색·공유 설정',header:'상단 공통 영역',nav:'메뉴 영역',main:'주요 본문',footer:'하단 공통 영역',body:'본문 영역'};
export type GroundingRequest={title:string;current?:string;evidence?:string;keyword?:string;selectedKey?:string};
const norm=(s:string)=>s.replace(/\s+/g,' ').trim().toLocaleLowerCase();
const usable=(s:string)=>s.length>1&&!/^(없음|미확인|미저장|\(없음\)|n\/a|-)$/.test(s);
export function elementLocation(e:PageElement){return [REGION_NAMES[e.region||'body'],e.section?.label||(e.heading?`“${e.heading}” 관련 내용`:''),e.widget?`위젯 ${e.widget.type}`:''].filter(Boolean).join(' → ');}
export function matchGuideElements(elements:PageElement[],topic:GuideTopic,request:GroundingRequest){
 const isTopic=(e:PageElement)=>topic==='title'?e.kind==='title':topic==='description'?e.kind==='description':topic==='heading'?e.kind==='heading':topic==='cta'?e.kind==='cta':topic==='image'?e.kind==='image':topic==='form'?e.kind==='form':['content','trust','ai'].includes(topic)?['text','heading'].includes(e.kind):false;
 let pool=elements.filter(isTopic),mode:'exact'|'keyword'|'field'|'candidate'|'missing'='candidate';
 const originals=(request.current||'').split(/\n+/).map(norm).filter(usable);
 const exact=pool.filter(e=>originals.includes(norm(e.text))&&!e.truncated);
 const quotes=[...(request.evidence||'').matchAll(/[“「『"']([^”」』"']{4,300})[”」』"']/g)].map(m=>norm(m[1]));
 const quoted=pool.filter(e=>quotes.includes(norm(e.text))&&!e.truncated);
 const word=norm(request.keyword||'');
 if(exact.length){pool=exact;mode='exact';}
 else if(word){pool=pool.filter(e=>norm(e.text).includes(word));mode='keyword';}
 else if(quoted.length){pool=quoted;mode='exact';}
 else if(['title','description'].includes(topic)){mode='field';}
 else if(topic==='heading'&&/H1|대표 제목|메인 헤드라인/i.test(request.title)){pool=pool.filter(e=>e.tag==='h1');mode='field';}
 else {
  if(['content','trust','ai','heading'].includes(topic)){const body=pool.filter(e=>!['header','nav','footer'].includes(e.region||''));if(body.length)pool=body;}
  if(topic==='cta'){
   const score=(e:PageElement)=>(/신청|문의|상담|예약|구매|장바구니|시작|가입|다운로드|견적|제출|보내기|buy|contact|book|sign.?up|get started|download|submit/i.test(e.text)?3:0)+(e.tag==='button'?2:0)-(['header','nav','footer'].includes(e.region||'')?1:0);
   const actions=pool.filter(e=>score(e)>0);pool=(actions.length?actions:pool).slice().sort((a,b)=>score(b)-score(a)||a.order-b.order);
  }
  if(topic==='image')pool=pool.slice().sort((a,b)=>Number(b.attributes?.alt===undefined)-Number(a.attributes?.alt===undefined)||a.order-b.order);
 }
 if(!pool.length)mode='missing';
 const focus=pool.find(e=>e.key===request.selectedKey)||pool[0];
 const label=mode==='exact'?'현재 문구와 일치':mode==='keyword'?'해당 표현이 있는 원문':mode==='field'?'해당 HTML 필드 확인':mode==='candidate'?'위치 후보 · 사용자 대조 필요':'일치 위치 미확인';
 const reason=mode==='exact'?'전달된 현재 문구와 수집 원문을 공백 정규화 후 대조했습니다.':mode==='keyword'?'수집 범위에서 해당 표현이 포함된 요소를 연결했습니다.':mode==='field'?'진단 대상의 HTML 태그를 연결했습니다. 실제 화면의 역할을 함께 확인하세요.':mode==='candidate'?'원문과 개선안의 직접 일치를 확인하지 못해 관련 요소를 후보로 표시합니다. 선택한 위치가 적합한지 먼저 확인하세요.':'누락·동적 생성·수집 범위 제한을 구분할 수 없습니다. 위치가 확인되기 전에는 수정 대상을 확정하지 않습니다.';
 return {targets:pool,focus,mode,label,reason};
}
export function matchingSettings(site:SiteEditing|undefined,topic:GuideTopic,title:string){
 const settings=site?.settings||[];
 return settings.filter(s=>topic==='social'?s.name.startsWith('og:'):topic==='viewport'?s.name==='viewport':topic==='canonical'?s.name==='canonical':topic==='schema'?s.name==='JSON-LD':topic==='crawl'?/robots|googlebot/i.test(s.name):false);
}
export type EditField={label:string;before:string;action:string;done:string};
export function editFields(topic:GuideTopic,e:PageElement|undefined,settings:ReturnType<typeof matchingSettings>):EditField[]{
 const before=e?.text||'수집된 현재 값 없음',setting=settings.map(s=>`${s.name}: ${s.value}${s.truncated?' (일부 발췌)':''}`).join('\n')||'해당 설정의 저장값 없음';
 switch(topic){
 case 'title':return [{label:'SEO 제목 / title',before,action:'이 URL의 제목 입력란에서 기존 문구를 교체합니다. 실제 서비스와 브랜드를 담고 본문에 없는 내용을 추가하지 않습니다. 공통 제목을 편집하면 다른 페이지도 바뀌는지 확인하세요.',done:'페이지 소스의 title과 저장한 제목이 일치하며 다른 URL의 제목을 덮어쓰지 않음'}];
 case 'description':return [{label:'SEO 설명 / meta description',before,action:'이 URL의 설명 입력란에서 대상·제공 범위·조건·다음 행동을 본문과 일치하게 작성합니다. 여러 description이 있다면 실제 출력하는 설정을 찾아 중복을 정리합니다.',done:'최종 HTML의 meta description content와 입력 문구 일치 · 검색 반영은 별도 관찰'}];
 case 'heading':return [{label:'제목 문구',before,action:'선택한 제목 블록에서 아래 TO-BE를 사실에 맞게 검토해 입력합니다. 제목 아래 설명과 중복되는 주장만 정리하고 제공 조건은 남깁니다.',done:'대상 고객과 페이지 주제를 설명하며 본문과 의미가 일치'}, {label:'제목 수준 / H 태그',before:e?.tag.toUpperCase()||'대표 제목 위치 확인 필요',action:'대표 제목을 실제로 담당하는 블록인지 먼저 확인한 뒤 제목 수준을 지정합니다. 본문 소제목을 무조건 H1으로 바꾸거나 글자 크기만 키우지 않습니다. 테마가 출력하는 기존 제목도 확인하세요.',done:'주요 제목과 하위 제목 관계가 맞고 PC·모바일에서 의도한 위계로 표시'}];
 case 'cta':return [{label:'버튼에 표시할 문구',before,action:'안내된 편집 경로에서 선택한 버튼의 표시 문구를 수정합니다. 행동과 다음 단계를 설명하고, 같은 문구의 모든 버튼을 일괄 치환하지 않습니다. 코드 위젯이면 해당 링크·버튼 요소의 표시 텍스트를 수정합니다.',done:'문구를 읽고 클릭 후의 화면·행동을 예상할 수 있음'}, {label:'클릭 시 동작 / 링크',before:e?.href||'목적지 URL 미확인 · 모달·전화·스크립트 동작 여부 확인',action:'링크·전화·모달·제출 중 현재 동작을 확인합니다. 문구가 상담 신청이면 실제 상담 경로로 이어지는지 열어 보고, URL을 임의로 만들거나 #만 입력하지 않습니다.',done:'PC·모바일에서 문구 → 실제 목적지 → 완료 상태가 일치'}];
 case 'image':return [{label:'이미지 대체 텍스트 / alt',before:e?.attributes?.alt===undefined?'alt 속성 저장값 없음':e.attributes.alt===''?'빈 alt=""':e.attributes.alt,action:'이미지 역할을 먼저 구분합니다. 정보 이미지에는 필요한 내용을, 링크 이미지에는 이동 목적을 설명합니다. 장식 이미지는 빈 alt를 유지할 수 있습니다. 이미지에 없는 정보·키워드는 넣지 않습니다.',done:'실제 이미지 목적과 alt가 일치하고 장식 이미지를 누락 오류로 오판하지 않음'}, {label:'수정할 이미지 파일',before:e?.attributes?.src||'파일 URL 미저장',action:'편집 화면의 파일과 이 경로·소속 구역을 대조합니다. CSS 배경이나 동적 이미지라면 해당 설정은 별도 확인합니다.',done:'수정한 alt가 의도한 이미지에 반영됨'}];
 case 'form':return (e?.fields?.length?e.fields.map(f=>({label:`입력 항목 · ${f.label||f.type}`,before:`${f.label||'레이블 미확인'} · ${f.required?'필수':'required 속성 없음'}\n${f.selector}`,action:'안내된 편집 경로에서 이 항목의 이름·필수 여부·안내 문구를 확인합니다. placeholder만으로 이름을 대신하지 않고 실제 입력 요소에 연결된 레이블을 제공합니다. 코드로 관리하면 label과 입력 요소의 연결 및 required 속성을 대조합니다. 필요하지 않은 정보는 수집하지 않습니다.',done:'항목명·오류 안내를 이해할 수 있고 키보드 입력 및 테스트 제출 완료'})):[{label:'폼 항목과 레이블',before,action:'안내된 편집 경로에서 폼의 항목 목록 또는 해당 HTML을 열어 이름·필수 여부·오류 문구를 확인합니다. 수집된 필드 정보가 없어 현재 항목을 단정하지 않습니다.',done:'항목과 레이블 연결 · 오류 안내 · 테스트 제출 완료 확인'}]);
 case 'viewport':return [{label:'모바일 viewport',before:setting,action:'head 또는 이를 출력하는 프레임워크 설정에서 width=device-width, initial-scale=1 구성을 검토합니다. 사용자 확대를 막는 설정을 추가하지 않습니다. CMS가 자동 출력하면 중복 삽입 대신 원래 설정을 수정합니다.',done:'최종 viewport와 반응형 CSS를 함께 확인 · 320px부터 가로 넘침·확대·입력 동작 점검'}];
 case 'social':return [{label:'공유 제목·설명·이미지 / Open Graph',before:setting,action:'공유 미리보기 설정의 제목·설명·대표 이미지·대표 URL을 이 페이지에 맞춥니다. og:title, og:type, og:image, og:url을 확인하고 이미지는 실제로 접근 가능한 파일을 사용합니다.',done:'최종 og 태그와 실제 공유 미리보기 대조 · 캐시로 인한 지연 여부 확인'}];
 case 'canonical':return [{label:'대표 URL / canonical',before:setting,action:'중복 페이지인지 먼저 확인하고 실제 대표 URL을 결정합니다. 해당 페이지의 canonical 출력값과 내부 링크·사이트맵이 같은 의도를 가리키도록 수정합니다. 서로 다른 내용을 홈으로 통합하지 않습니다.',done:'대표 URL이 공개 응답하며 의도한 내용과 일치 · Search Console의 선택 대표 URL 별도 확인'}];
 case 'crawl':return [{label:'검색 허용·미리보기 지시',before:setting,action:'공개할 URL인지 먼저 확인합니다. noindex·nosnippet·robots.txt는 역할이 다르므로 원래 진단이 지목한 지시만 수정합니다. HTTP X-Robots-Tag도 담당자가 확인하고 관리자·회원 페이지는 제한을 유지합니다.',done:'공개 의도와 HTML·응답 헤더·robots 규칙 일치 · 수집/색인/노출은 각각 확인'}];
 case 'schema':return [{label:'기존 구조화 데이터 원본 / JSON-LD',before:setting,action:'수집 원본과 CMS의 구조화 데이터 출력을 대조합니다. 실제 보이는 정보와 맞는 지원 유형·필수 속성을 수정하고 기존 데이터에 중복 코드를 덧붙이지 않습니다. 없는 리뷰·가격을 만들지 않습니다.',done:'공식 검사 도구에서 유형·오류 확인 후 페이지 내용과 대조 · 유효성은 노출 보장이 아님'}];
 case 'speed':return [{label:'측정에서 확인된 리소스·레이아웃',before:'이 진단의 HTML만으로 병목 위치를 확정할 수 없음',action:'대상 URL을 PageSpeed Insights로 측정하고 보고된 LCP 요소·지연 스크립트·레이아웃 이동 원인부터 찾습니다. 리소스 하나를 수정한 뒤 같은 기기 조건으로 다시 측정합니다.',done:'병목 원인과 수정 내역 기록 · LCP·INP·CLS의 실측/실험실 결과 구분'}];
 case 'measurement':return [{label:'이벤트 이름·조건·수신',before:'계정 내 이벤트 수신 상태 미확인',action:'클릭과 완료 이벤트의 이름·발생 조건을 정하고 태그 담당 계정에서 설정합니다. 테스트 동작 후 디버그 화면의 수신·중복·완료 상태를 대조합니다.',done:'한 번의 의도한 동작이 한 번의 해당 이벤트로 수신 · 클릭을 완료로 집계하지 않음'}];
 default:return [{label:topic==='trust'?'사례·근거 블록':topic==='ai'?'질문·답변·조건 블록':'본문 문장·내용 블록',before,action:topic==='trust'?'실제 수행 상황·방법·확인 가능한 결과를 구분하고 출처·기준일·공개 가능 여부를 확인해 보완합니다. 없는 성과나 인증을 만들지 않습니다.':topic==='ai'?'고객 질문 바로 아래에 직접 답변을 쓰고 대상·조건·예외·근거를 연결합니다. 답변과 무관한 반복 문구를 정리하되 필요한 상세 설명은 남깁니다.':'선택한 문장과 앞뒤 내용을 함께 읽고 아래 제안을 실제 제공 범위·절차·조건으로 완성합니다. 의미가 같은 반복만 정리하고 다른 정보·부정·예외는 보존합니다.',done:'임시 괄호·검증되지 않은 수치가 없고 원문의 의미·조건·근거를 보존'}];
 }
}
