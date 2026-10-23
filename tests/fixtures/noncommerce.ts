/** Synthetic non-commerce pages plus mixed/unknown controls. */
const page=(title:string,description:string,body:string,head='')=>`<!doctype html><html lang="ko"><head><title>${title}</title><meta name="description" content="${description}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta name="viewport" content="width=device-width">${head}</head><body><main>${body}</main><footer>이용약관 <a href="/contact">상담 문의</a></footer></body></html>`;
export const noncommerceCases=[
  {id:'service',kind:'service',goal:'contact',url:'https://consulting.example.com/',html:page('브랜드 컨설팅','브랜드 컨설팅의 제공 범위와 진행 절차','<h1>브랜드 컨설팅</h1><p>브랜드 컨설팅은 운영 담당자를 위한 서비스입니다. 기본 제공 범위와 제외 업무를 설명하고 실제 프로젝트 사례와 담당자 경력을 안내합니다.</p><h2>상담 절차</h2><p>상담 후 업무 범위와 고객 준비사항을 함께 확인합니다.</p><a href="/consult">상담 문의</a>')},
  {id:'organization',kind:'organization',goal:'download',url:'https://manufacturer.example.org/',html:page('공정장비 제조 회사소개','연구개발과 제조 역량·사업 분야 안내','<h1>공정장비 제조 역량</h1><p>사업 분야는 산업 센서 연구개발입니다. 프로젝트 사례와 담당 조직을 확인하고 회사소개서에서 실제 제공 역량을 검토할 수 있습니다.</p><a href="/company.pdf">회사소개서 다운로드</a>','<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"산업 센서 모델 A","description":"공정 측정용 장치"}</script>')},
  {id:'education',kind:'education',goal:'application',url:'https://academy.example.net/',html:page('데이터 분석 교육','데이터 분석 교육의 대상과 커리큘럼 안내','<h1>데이터 분석 교육</h1><p>데이터 분석 교육은 실무 입문자를 위한 무료 교육입니다. 커리큘럼은 자료 정리와 분석 원리를 포함하며 선수 조건은 기본 컴퓨터 활용입니다.</p><h2>일정과 신청</h2><p>온라인 학습 일정과 준비사항은 모집 안내에서 확인하세요.</p><a href="/apply">수강 신청</a>')},
  {id:'content',kind:'content',goal:'read',url:'https://journal.example.com/column',html:page('전자상거래 연구 칼럼','연구 자료의 원출처와 적용 범위 안내','<h1>전자상거래 연구 칼럼</h1><p>작성자: 연구 편집팀. 원출처: 공개 연구 자료. 수정 날짜와 원문 링크를 함께 안내합니다.</p><p>장바구니와 상품 배송은 이 칼럼의 연구 주제입니다. 이 페이지에서 상품을 판매하거나 결제를 받지 않습니다. 개념의 적용 범위와 해석 시 예외를 설명합니다.</p><a href="/source">원출처 읽기</a>')},
  {id:'public',kind:'public_service',goal:'application',url:'https://support.example.org/program',html:page('지역 지원사업 신청 자격','지원사업 대상과 신청 절차·공식 공고 안내','<h1>지역 지원사업 안내</h1><p>지원 대상과 제외 조건은 운영 기관의 공식 공고에서 확인하세요. 신청 절차와 준비 서류·접수 기간은 현재 공고 기준으로 안내합니다.</p><p>변경 사항과 운영 기관 문의 경로를 확인한 뒤 신청할 수 있습니다.</p><a href="/apply">지원사업 신청</a>')},
  {id:'booking',kind:'service',goal:'booking',url:'https://clinic.example.co.kr/',html:page('방문 진료 상담','진료 상담 서비스와 예약 절차','<h1>방문 진료 상담</h1><p>이용 대상과 진료 범위는 담당 의료진과 상담해 확인합니다. 방문 전 준비사항과 실제 예약 절차를 안내합니다.</p><a href="/reserve">진료 예약</a>')},
  {id:'mixed',kind:'mixed',goal:'purchase',url:'https://design.example.com/',html:page('공간 설계 서비스와 상품','설계 서비스와 조명 상품 안내','<h1>공간 설계 서비스</h1><p>상담을 통해 설계 범위를 정합니다. 조명 상품은 별도 판매하며 구매 조건을 확인하세요.</p><a href="/products/light">조명 보기</a><a href="/checkout">구매하기</a><a href="/consult">상담 문의</a>')},
  {id:'unknown',kind:'unknown',goal:'unknown',url:'https://preview.example.net/',html:page('새로운 공간','안내','<p>안내 페이지입니다.</p>')},
] as const;
export function noncommerceResponse(input:string|URL){
  const url=new URL(String(input));if(url.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /');
  const item=noncommerceCases.find(c=>new URL(c.url).href===url.href);
  if(!item)return new Response('Not found',{status:404});
  const response=new Response(item.html,{headers:{'content-type':'text/html;charset=utf-8'}});Object.defineProperty(response,'url',{value:url.href});return response;
}
