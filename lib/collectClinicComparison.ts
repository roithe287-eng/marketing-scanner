import * as cheerio from 'cheerio';
import {websiteHttp,publicUrl} from './security/safeFetch';
import {AccessError} from './security/request';
import {diagnosticPageUrl} from './collectSiteDiagnostics';
import {evaluateRobots} from './robotsRules';
import {getScannerContactUrl} from './siteConfig';
import {decodeHtml} from './extractWebsite';
import {captureSiteDiagnosticSeed} from './siteDiagnostics';
import {compactText,clinicPageFactsSchema,type ClinicPageFacts} from './clinicPlaceInsights';

const domainBlock=/(?:^|\.)(?:naver\.com|naver\.me|naver\.net|pstatic\.net|kakao\.com|daum\.net|google\.[a-z.]+|goo\.gl|youtube\.com|youtu\.be|instagram\.com|facebook\.com|t\.co|bit\.ly)$/i;
const headers={'User-Agent':'JinjjaScanner/1.0 (+'+getScannerContactUrl()+')'};

export function clinicWebsite(input:string) {
  const value=input.trim();
  const url=publicUrl(/^[a-z][\w+.-]*:/i.test(value)?value:'https://'+value);
  let path:string;
  try {path=decodeURIComponent(url.pathname);}catch{throw new AccessError(400,'공식 홈페이지 주소를 확인하세요.');}
  const decoded=new URL(url);
  decoded.pathname=path;
  if(domainBlock.test(url.hostname.replace(/\.$/,''))||!diagnosticPageUrl(decoded.href,url.origin)||
     /\/(?:admin|api|auth|account|private|patient|records?|consult|counsel|reviews?|cases?|bookings?|reservations?|예약|상담|환자)(?:[\/._-]|$)/i.test(path)||
     /%(?:2f|5c|25|3f|23|0[0-9a-f]|1[0-9a-f]|7f)/i.test(url.pathname)) throw new AccessError(400,'병원 공식 홈페이지의 공개 진료 안내 주소를 입력하세요.');
  url.hash='';
  for(const k of [...url.searchParams.keys()])if(/^utm_|^(?:fbclid|gclid)$/i.test(k))url.searchParams.delete(k);
  return url;
}

async function robotsText(origin:string) {
  const response=await websiteHttp.fetch(origin+'/robots.txt',{headers,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(3500)});
  if(response.status===404||response.status===410) return '';
  if(!response.ok||/html/i.test(response.headers.get('content-type')||''))throw new AccessError(422,'홈페이지의 수집 허용 범위를 확인할 수 없습니다.');
  const text=await response.text();
  if(text.length>262144||/^\s*</.test(text))throw new AccessError(422,'홈페이지의 수집 허용 범위를 확인할 수 없습니다.');
  return text;
}

/** Fetch only site HTML, never Place/Maps, media files, or redirect destinations on another host. */
export async function collectClinicPage(input:string):Promise<ClinicPageFacts> {
  let target=clinicWebsite(input);
  const host=target.hostname.replace(/^www\./,'');
  const policies=new Map<string,string>();
  for(let hop=0;hop<4;hop++) {
    if(!policies.has(target.origin))policies.set(target.origin,await robotsText(target.origin));
    if(evaluateRobots(policies.get(target.origin)!,'JinjjaScanner',target.pathname+target.search).allowed!==true)
      throw new AccessError(422,'홈페이지의 수집 지침에 따라 이 페이지를 건너뛰었습니다.');
    const response=await websiteHttp.fetch(target.href,{headers:{...headers,Accept:'text/html,application/xhtml+xml'},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(6000)});
    const location=response.headers.get('location');
    if(response.status>=300&&response.status<400&&location) {
      const next=clinicWebsite(new URL(location,target).href);
      if(next.hostname.replace(/^www\./,'')!==host || target.protocol==='https:'&&next.protocol!=='https:')
        throw new AccessError(422,'다른 사이트로 이동합니다. 병원의 최종 공식 주소를 입력하세요.');
      target=next;continue;
    }
    const contentType=response.headers.get('content-type')||'';
    if(!response.ok||!/text\/html|application\/xhtml/i.test(contentType))throw new AccessError(422,'공개 HTML을 읽지 못했습니다. 병원 홈페이지 주소를 확인하세요.');
    if(/(?:^|[\s,:])(?:none|noindex|noarchive|nosnippet|noai)(?:$|[\s,])/i.test(response.headers.get('x-robots-tag')||''))throw new AccessError(422,'홈페이지의 공개·수집 설정에 따라 비교에서 제외했습니다.');
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength>1_500_000)throw new AccessError(422,'페이지가 수집 범위를 초과했습니다. 더 작은 공식 진료 안내 페이지를 입력하세요.');
    const {html}=decodeHtml(bytes,contentType);
    const $=cheerio.load(html);
    const directives=$('meta[name="robots" i],meta[name="JinjjaScanner" i]').map((_,el)=>$(el).attr('content')||'').get().join(',');
    if(/(?:^|[\s,])(?:none|noindex|noarchive|nosnippet|noai)(?:$|[\s,])/i.test(directives)) throw new AccessError(422,'홈페이지의 공개·수집 설정에 따라 비교에서 제외했습니다.');
    const page=captureSiteDiagnosticSeed(html,target.href).page;
    if(page.noindex)throw new AccessError(422,'홈페이지의 공개·수집 설정에 따라 비교에서 제외했습니다.');
    if(!page.medicalEvidence?.place?.facility)throw new AccessError(422,'페이지에서 병의원명과 진료 근거를 함께 확인하기 어렵습니다. 병원 공식 홈페이지를 입력하세요.');
    return clinicPageFactsSchema.parse({url:target.href,title:compactText(page.title,110),description:compactText(page.description,160),
      terms:page.medicalEvidence.place.terms,media:page.medicalEvidence.place.media??null});
  }
  throw new AccessError(422,'리디렉션이 많습니다. 병원의 최종 주소를 입력하세요.');
}
