import type {MarketingReport,ChecklistItem} from './reportSchema';
type GuidePage={title:string;description:string;h1:string[];ctaButtons:string[]};
const quote=(s:string)=>`「${s.replace(/\s+/g,' ').trim().slice(0,180)}」`;
/** Instructions use saved observations, never claim an unobserved CMS menu or live outcome. */
export function actionableGuide(item:Pick<ChecklistItem,'id'|'status'>,page?:GuidePage,goal='문의·신청'){
 const topic=page?.h1[0]||page?.title||'[페이지의 실제 서비스명]';
 const title=quote(topic),description=page?.description?quote(page.description):'[대상 고객]에게 [실제 제공 내용]을 안내합니다. [이용 조건]과 [다음 행동]을 확인하세요.';
 const button=page?.ctaButtons[0]?quote(page.ctaButtons[0]):`「${goal}」`;
 const rules:Record<string,string>={
  title:`페이지의 검색 제목 설정 또는 head > title을 수정해야 합니다. 본문 대표 주제 ${title}에 [업체명]을 연결하고 같은 단어의 반복을 제거해야 합니다. 저장 후 해당 URL의 HTML에 비어 있지 않은 title이 1개이며 작성한 문구와 일치하는지 확인해야 합니다.`,
  meta_description:`페이지의 검색 설명 설정 또는 head > meta[name="description"]의 content를 작성해야 합니다. ${page?.description?'현재 설명 '+description+'에서 본문에 없는 표현을 빼고 대상·제공 내용·이용 조건을 1~2문장으로 정리해야 합니다.':'작성 형식: '+description+' 대괄호는 본문에서 확인한 사실로 바꿔야 합니다.'} 저장 후 description이 1개이며 다른 서비스 페이지와 같은 설명을 반복하지 않는지 대조해야 합니다.`,
  og_tags:`페이지의 공유 설정에서 og:title은 이 페이지의 서비스명·업체명으로, og:description은 대상·제공 내용 1~2문장으로 작성해야 합니다. og:image에는 해당 서비스를 보여주는 공개 이미지 URL을 지정해야 합니다. 저장 후 동일 URL을 공유해 제목·설명·이미지가 수정값과 일치하는지 확인하고, 이전 값이 보이면 공유 채널의 미리보기 캐시를 갱신해야 합니다.`,
  h1:`본문의 대표 제목 요소를 H1으로 지정하고 ${title}이 실제 화면의 대표 제목인지 대조해야 합니다. 하위 주제는 H2로 구분하고 PC·모바일에서 제목이 숨겨지거나 잘리지 않게 수정해야 합니다. 저장 후 HTML의 H1 문구와 두 화면의 제목을 각각 확인해야 합니다.`,
  image_alt:'img:not([alt])에 해당하는 이미지를 하나씩 열어 역할을 구분해야 합니다. 정보성 이미지는 alt에 실제 보이는 대상·특징을 쓰고, 순수 장식 이미지는 alt=""로 설정해야 합니다. 이미지에만 있는 가격·절차·연락처는 본문 텍스트로도 제공해야 합니다. 저장 후 alt 속성 누락 이미지가 0개인지 재진단해야 합니다.',
  viewport:'head의 meta[name="viewport"]를 content="width=device-width, initial-scale=1"로 설정해야 합니다. 너비 360px·390px에서 가로 넘침, 글자 잘림, 버튼 겹침을 점검하고 원인이 되는 고정 너비를 수정해야 합니다. 확대를 막지 않고 입력·버튼을 끝까지 조작할 수 있어야 합니다.',
  cta_clarity:`대표 버튼 ${button}의 문구를 클릭 후 진행되는 실제 행동으로 써야 합니다. 버튼의 href 또는 클릭 이벤트를 해당 서비스의 예약·문의·이용 화면에 연결해야 합니다. PC·모바일에서 클릭부터 완료 안내까지 실행해 다른 서비스나 빈 화면으로 이동하지 않는지 확인해야 합니다.`,
  cta_repeat:`첫 서비스 설명 아래와 마지막 조건 안내 아래에 ${button}을 배치해야 합니다. 같은 행동의 버튼은 같은 연결 주소를 사용하고 모바일 고정 버튼이 본문·입력칸을 가리지 않게 해야 합니다. 각 위치의 클릭과 실제 완료를 별도 이벤트로 기록해야 합니다.`,
  contact_info:'연락 안내에 현재 사용하는 전화·이메일·예약·상담 경로를 명시해야 합니다. 전화는 tel:, 이메일은 mailto: 링크로 연결하고 외부 상담 링크는 해당 업체 계정으로 열려야 합니다. 테스트 문의를 보내 접수 화면과 담당자 수신을 모두 확인해야 합니다.',
  trust_review:'사례·담당자 소개 바로 옆에 [실제 역할·진행 범위·확인일]과 해당 원자료 링크를 넣어야 합니다. 공개할 수 없는 사례는 익명화하고 공개 가능한 사실만 써야 합니다. 각 주장과 근거 문서의 대상·날짜가 일치하는지 담당자가 확인해야 합니다.',
  trust_certification:'인증·경력 소개를 [기관명·자격/인증명·대상·유효기간]으로 구분해 써야 합니다. 해당 기관의 확인 페이지나 공개 증빙을 연결하고 만료되었거나 다른 사람·사업장에 해당하는 표기는 수정해야 합니다.',
  price_info:'가격·이용 조건 영역에 [항목명·금액 또는 산정 기준·포함 범위·별도 비용·적용일]을 표로 작성해야 합니다. 개별 견적 항목은 금액 대신 산정에 필요한 조건과 실제 문의 경로를 써야 합니다. 홈페이지와 운영 중인 예약·안내 화면의 금액·조건을 일치시켜야 합니다.',
 };
 if(item.status==='not_applicable')return undefined;
 const guide=rules[item.id];
 return guide&&(item.status==='pass'?'현재 태그 존재 기준은 충족했습니다. 아래 내용과 현재 설정이 다를 때 수정해야 합니다. '+guide:guide);
}
export function applyActionableGuides(report:MarketingReport):MarketingReport{
 if(!report.checklist?.length)return report;
 if(report.checklist.some(c=>/HTML 원문 미수집|자체 수집 로봇 차단/.test(c.currentValue||'')))return report;
 const checklist=report.checklist.map(item=>{const guide=actionableGuide(item,report.pageEvidence,report.sitePurpose?.goal.label);return guide?{...item,guide}:item;});
 return {...report,checklist};
}
