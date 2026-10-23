/** Synthetic public-page shapes. No production module imports these cases. */
const page=(title:string,description:string,body:string,extra='')=>`<!doctype html><html lang="ko"><head><title>${title}</title><meta name="description" content="${description}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta name="viewport" content="width=device-width, initial-scale=1">${extra}</head><body>${body}</body></html>`;
export const generalEvidenceCases=[
  {id:'service',url:'https://agency.example.com/service?campaign=one',keyword:'전략진단',html:page('브랜드 전략진단','전략진단과 운영 안내','<h1>브랜드 전략진단</h1><h1>브랜드 전략진단</h1><p>전략진단 전략진단 운영 안내</p><a href="https://agency.channel.io">상담 문의</a><img src="logo.png" alt="">')},
  {id:'commerce',url:'https://shop.example.org/products/vitamin',keyword:'비타민',html:page('매일 비타민','비타민 구성과 배송 안내','<h1>비타민</h1><p>비타민 비타민 구성과 배송을 확인하세요.</p><a href="/checkout">구매하기</a><img src="product.png" alt="비타민"><a href="https://channel.io.unrelated.example.org">구매 안내</a>')},
  {id:'english',url:'https://software.example.net/start',keyword:'analytics',html:page('Team analytics','Analytics for your team','<h1>Team analytics</h1><p>Analytics analytics for teams.</p><a href="/downloads">Download</a><img src="screen.png">')},
  {id:'subdomain',url:'https://branch.clinic.example.co.kr/reserve',keyword:'진료예약',html:page('방문 진료예약','진료예약 절차 안내','<h1>진료예약</h1><p>진료예약 진료예약 안내</p><a href="tel:0511234567">전화</a><a href="https://pf.kakao.com/_example">상담</a><form><input name="name"></form>')},
  {id:'sparse',url:'https://landing.example.com/go',keyword:'안내',html:'<!doctype html><html><head><title>페이지 안내</title></head><body><main>안내 안내</main></body></html>'},
  {id:'redirect',url:'https://old-brand.example.com/main',finalUrl:'https://www.destination.example.org/services',keyword:'설계상담',html:page('건축 설계상담','설계상담 절차','<h1>설계상담</h1><p>설계상담 설계상담 안내</p><a href="mailto:hello@example.org">이메일</a><img src="plan.png" alt="설계도">')},
  {id:'international-domain',url:'https://예시브랜드.한국/서비스',keyword:'생활관리',html:page('맞춤 생활관리','생활관리 서비스 안내','<h1>생활관리</h1><p>생활관리 생활관리 안내</p><a href="https://open.kakao.com/o/example">상담</a><img src="service.png" alt="서비스">')},
  {id:'long-html',url:'https://catalog.example.com/guides',keyword:'공정설계',html:page('긴제목'.repeat(8000)+' 공정설계','긴설명'.repeat(8000)+' 공정설계',`<p>공정설계 공정설계 안내</p><h1>${'공정안내'.repeat(8000)}</h1>${'<h1>공정설계</h1>'.repeat(11)}<a href="/guide">다운로드</a><img src="guide.png" alt="안내">`)},
] as const;
export type GeneralEvidenceCase=typeof generalEvidenceCases[number];
export function generalPageResponse(input:string|URL){
  const url=new URL(String(input));
  if(url.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /',{headers:{'content-type':'text/plain'}});
  const target=generalEvidenceCases.find(c=>new URL(c.url).href===url.href||('finalUrl' in c&&c.finalUrl===url.href));
  if(!target)return new Response('Not found',{status:404});
  if('finalUrl' in target&&url.href===new URL(target.url).href)return new Response(null,{status:301,headers:{location:target.finalUrl}});
  const response=new Response(target.html,{headers:{'content-type':'text/html; charset=utf-8'}});
  Object.defineProperty(response,'url',{value:url.href});
  return response;
}
