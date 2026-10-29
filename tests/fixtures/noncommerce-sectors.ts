/** Synthetic source pages, not measurements or claims about real businesses. */
export const sectorCases=[
  {id:'legal',category:'legal',title:'법무법인 해봄 | 법률 상담',description:'형사·민사 사건 업무와 담당 변호사, 법률 상담 안내',action:'법률 상담 문의',body:['취급 업무는 형사·민사 사건이며 제공 범위와 제외 업무를 안내합니다.','담당 변호사 소개와 공개 가능한 수행 사례는 각 안내 페이지에서 확인합니다.','상담 절차는 사건 검토와 준비 서류 확인으로 진행합니다. 수임 비용은 검토 후 안내합니다.']},
  {id:'medical',category:'medical',title:'해봄의원 | 진료 안내',description:'의료진·진료 과목·진료 시간과 예약 접수 안내',action:'진료 예약',body:['진료 과목과 대상은 실제 진료 안내에서 확인합니다. 의료진의 역할과 이력을 안내합니다.','초진 내원 준비사항과 비급여 비용의 적용 조건은 별도 자료에서 확인합니다.','진료 시간·휴진과 오시는 길, 주차 안내를 확인한 뒤 예약 접수를 진행합니다.']},
  {id:'property_sales',category:'realestate',title:'해봄 아파트 분양 안내',description:'해봄 단지 공급 개요·입주자 모집공고와 방문 예약',action:'견본주택 방문 예약',body:['단지 주택형·평면과 공급 규모는 해당 모집공고에서 확인하세요. 사업지 주소와 견본주택 위치는 서로 다릅니다.','청약 신청 자격과 특별 공급·일반 공급 조건은 현재 모집공고에 연결합니다.','분양가·계약금·중도금·잔금과 청약 일정은 공고 원문과 대조합니다. 시행·시공 주체와 입주 예정 정보도 확인합니다.']},
  {id:'insurance',category:'finance',title:'해봄 보험 상담',description:'보험 보장 범위·가입 조건·보험료 기준과 상담 안내',action:'보험 상담 신청',body:['보장 내용·특약과 가입 조건, 면책·감액·제외 사항은 실제 상품 설명과 약관에서 확인합니다.','보험료 산정 조건과 갱신·납입 기준을 안내합니다. 보험사와 상담 대리점의 역할을 구분합니다.','보험금 청구·변경 절차와 개인정보 동의·연락 방법을 확인하고 상담을 신청합니다.']},
  {id:'rehabilitation',category:'legal',title:'해봄 법무법인 | 개인회생·개인파산',description:'개인회생과 파산의 대상·비용·준비 서류 상담',action:'개인회생 상담',body:['개인회생·개인파산·채무조정의 업무 범위를 안내합니다. 소득·채무·재산과 신청 자격·제외 조건은 개별 검토합니다.','담당 변호사와 법률사무소의 역할을 확인합니다. 필요 서류와 접수·보정·변제 계획의 진행 절차를 안내합니다.','수임료·송달료 등 비용과 포함 항목을 안내하고 상담 접수 시 개인정보 처리 안내를 제공합니다.']},
  {id:'startup',category:'consulting',title:'해봄 창업 컨설팅',description:'예비 창업자를 위한 사업 개설·멘토링 상담',action:'창업 상담 문의',body:['창업 컨설팅의 제공 범위는 사업 개설 준비와 멘토링입니다. 실제 지원 범위와 제외 항목을 설명합니다.','참여 대상과 모집 요건·제외 조건을 안내하고 신청 절차와 사업 계획 준비 자료를 설명합니다.','컨설팅 비용과 별도 부담 조건을 구분합니다. 담당 전문가의 경력과 실제 지원 사례를 안내합니다.']},
  {id:'franchise',category:'consulting',title:'해봄 프랜차이즈 창업 | 가맹 모집',description:'가맹점 개설 비용·본부 운영 지원과 가맹 상담 안내',action:'가맹 상담 문의',body:['브랜드 가맹 운영 방식과 점포 면적·입지·상권 검토 조건을 안내합니다.','가맹비·교육비·보증금·로열티와 별도 인테리어 비용의 기준을 안내합니다.','개설 절차는 상담·입지 검토·계약·개점 순서입니다. 본부의 교육·물류·운영 지원과 정보 공개서 확인 경로를 제공합니다.']},
] as const;
export function sectorHtml(item:typeof sectorCases[number],extra=''){
  return `<!doctype html><html lang="ko"><head><title>${item.title}</title><meta name="description" content="${item.description}"><meta name="viewport" content="width=device-width"></head><body><nav><a href="/blog">교육 칼럼</a></nav><main><h1>${item.title}</h1>${item.body.map((text,i)=>`<section><h2>안내 ${i+1}</h2><p>${text}</p></section>`).join('')}<a href="/consult">${item.action}</a>${extra}</main><footer>개인정보 처리방침 · 법무 검토 · 보험 안내</footer></body></html>`;
}
export const sectorIntegrationCases=sectorCases.map(item=>({...item,url:`https://${item.id}.example.com/`,html:sectorHtml(item),sector:item.id}));
export function sectorResponse(input:string|URL){
  const url=new URL(String(input));if(url.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /');
  const item=sectorIntegrationCases.find(c=>new URL(c.url).href===url.href);
  if(!item)return new Response('Not found',{status:404});
  const r=new Response(item.html,{headers:{'content-type':'text/html;charset=utf-8'}});Object.defineProperty(r,'url',{value:url.href});return r;
}
