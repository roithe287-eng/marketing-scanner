import type {ExtractedWebsiteData} from './extractWebsite';
import type {OfficialSeoAudit,OfficialSeoCheck,OfficialSeoEngine} from './officialSeoSchema';
import {MANUAL_SEO_TOPICS,OFFICIAL_SEO_VERSION,type OfficialSeoTopic} from './officialSeoKnowledge';
import {googleDirectives} from './growthEvidence';
import {evaluateRobots} from './robotsRules';
import {inspectOfficialStructuredData} from './officialSeoStructuredData';

export function analyzeOfficialSeo(d:ExtractedWebsiteData|null,targetUrl=''):OfficialSeoAudit {
 const checks:OfficialSeoCheck[]=[];
 const audit:OfficialSeoAudit={version:1,catalogVersion:OFFICIAL_SEO_VERSION,targetUrl:(d?.url||targetUrl).slice(0,4000),observedAt:d?.seoEvidence?.capturedAt,mode:d?.seoEvidence&&d.officialSeoEvidence?'diagnosis':'guide',checks};
 const add=(id:string,title:string,topic:OfficialSeoTopic,engines:OfficialSeoEngine[],status:OfficialSeoCheck['status'],evidence:string,interpretation:string,steps?:string[])=>{
  const manual=MANUAL_SEO_TOPICS.find(t=>t.topic===topic)!;
  checks.push({id,title,topic,engines,status,evidence:evidence.slice(0,6000),interpretation,steps:steps||manual.steps,completion:manual.completion});
 };
 if(d?.seoEvidence&&d.officialSeoEvidence){
  const e=d.seoEvidence,o=d.officialSeoEvidence,u=new URL(d.finalUrl||d.url),r=e.robots;
  const both:OfficialSeoEngine[]=['naver','google'];
  add('http','최종 HTTP 응답·HTML','crawl',both,e.httpStatus===200&&d.contentTypeOk?'observed':'action',`HTTP ${e.httpStatus} · HTML 응답 ${d.contentTypeOk?'확인':'미확인'} · 최종 주소 ${u.href}`,'관측한 응답의 상태입니다. 오류를 200으로 내보내는 soft 404·실제 봇 차단·다른 URL의 상태는 별도 확인합니다.');
  add('google-document-size','Googlebot 문서 수집 범위','crawl',['google'],d.pageSizeBytes>2*1024*1024?'action':'observed',`수신한 문서 ${d.pageSizeBytes.toLocaleString('ko-KR')}바이트`,'Googlebot은 HTML·지원 텍스트의 압축 해제 첫 2MB를 수집합니다(PDF 64MB). 한도 이하는 색인·렌더링 성공을 뜻하지 않으며 외부 리소스도 별도로 확인합니다.',['중요한 본문·링크·메타데이터가 문서 앞부분에 있는지 확인합니다.','2MB를 넘는 HTML은 중복 코드·과도한 인라인 데이터 등을 줄이고 렌더링 결과를 검증합니다.']);
  add('head-title','검색 제목의 head 위치·개수','metadata',both,o.titleInHeadCount===1&&!!d.title.trim()?'observed':'action',`head title ${o.titleInHeadCount}개 · ${d.title.slice(0,400)||'제목 미감지'}`,'정적 HTML에서 한 개의 유효한 제목을 확인합니다. 사이트 전체 중복·제목의 정확성·실제 검색 제목은 직접 대조합니다.');
  add('google-description','Google 메타 설명','metadata',['google'],o.descriptionInHeadCount>1?'action':d.description&&o.descriptionInHeadCount===1?'observed':'manual',`head description ${o.descriptionInHeadCount}개 · ${d.description.slice(0,400)||'설명 미감지'}`,'설명은 검색 스니펫의 후보입니다. 미기재가 색인 자격의 필수 요건 위반은 아니며 고정 글자 수로 판정하지 않습니다.');
  add('naver-h1','네이버 H1 구조','metadata',['naver'],d.h1Count>1?'action':d.h1Count===1?'observed':'manual',`H1 ${d.h1Count}개`,'네이버 SEO 안내의 복수 H1 항목을 적용합니다. Google에 동일한 H1 개수 규칙을 강제하거나 H1 부재만으로 색인 불가로 보지 않습니다.');
  const directives=googleDirectives(o.allRobotsMeta,e.xRobotsTag);
  const noindex=directives.some(v=>/(?:^|\s)(?:noindex|none)(?:\s|$)/.test(v));
  const unavailable=directives.some(v=>v.startsWith('unavailable_after:'));
  add('google-index','Google 색인 지시·봇 범위','index',['google'],noindex?'action':unavailable?'manual':'observed',directives.join(' · ')||'적용되는 robots/Googlebot 색인 제한 지시 미감지','head와 body의 robots/Googlebot 메타 및 해당 HTTP 지시를 관측합니다. 검색 대상 페이지의 의도치 않은 noindex만 수정하며 실제 색인은 URL 검사에서 확인합니다.');
  const snippet=directives.filter(v=>/(?:nosnippet|max-snippet|max-image-preview|max-video-preview|notranslate|noimageindex|indexifembedded)/.test(v));
  add('google-snippet','스니펫·이미지·영상 노출 제한','appearance',['google'],snippet.length||o.dataNosnippetCount?'manual':'observed',`${snippet.join(' · ')||'관련 메타 지시 미감지'} · data-nosnippet ${o.dataNosnippetCount}곳`,'노출 제한은 운영 목적일 수 있습니다. indexifembedded는 noindex와의 조건, max-* 값과 nosnippet의 우선 적용을 확인하고 AI 기능·이미지 색인·본문 제외를 구분합니다.');
  for(const [agent,engine] of [['Googlebot','google'],['Yeti','naver']] as const){
   const result=r.status==='ok'?evaluateRobots(r.text||'',agent,u.pathname+u.search):null;
   add(`${engine}-robots`,`${agent}의 현재 URL robots 규칙`,'crawl',[engine],result?.allowed===false?'action':result?.allowed===true?'observed':'manual',`${r.status}${r.httpStatus?` · HTTP ${r.httpStatus}`:''} · ${result?.rule||'현재 규칙을 확정할 수 없음'}`,'수신한 robots 규칙과 대상 경로만 대조합니다. 이전 캐시·HTTP 오류 처리·실제 봇의 IP/네트워크 접근은 별도 확인합니다.');
   const same=o.resources.filter(x=>{try{return new URL(x.url).origin===u.origin;}catch{return false;}});
   const blocked=same.filter(x=>r.status==='ok'&&evaluateRobots(r.text||'',agent,new URL(x.url).pathname+new URL(x.url).search).allowed===false);
   const unknown=same.some(x=>r.status==='ok'&&evaluateRobots(r.text||'',agent,new URL(x.url).pathname+new URL(x.url).search).allowed===null);
   add(`${engine}-resources`,`${agent}의 리소스 접근 규칙`,'links',[engine],blocked.length?'action':r.status==='ok'&&!unknown&&same.length?'observed':'manual',`수집 목록 ${o.resources.length}/${o.resourceCount}개 중 동일 출처 ${same.length}개 · 차단 ${blocked.length}개${blocked.length?` · ${blocked.slice(0,3).map(x=>`${x.kind}: ${x.url}`).join(' / ')}`:''}`,'최대 100개 리소스 URL에 같은 출처의 robots만 적용했습니다. 외부 CDN·다른 프로토콜/포트·누락한 URL·실제 파일 응답은 검사하지 않았습니다.');
  }
  const headerCanonicals=[...o.canonicalHeader.matchAll(/<([^>]*)>\s*;([^<>]*)(?=<|$)/g)].filter(m=>/\brel\s*=\s*(?:"[^"\n]*\bcanonical\b[^"\n]*"|'[^'\n]*\bcanonical\b[^'\n]*'|canonical)(?:\s|;|,|$)/i.test(m[2])).map(m=>m[1]);
  const raw=[...o.headCanonicals,...headerCanonicals];const resolved:string[]=[],invalid:string[]=[];
  for(const v of raw){try{const url=new URL(v,o.baseUrl);if(!v.trim()||!/^https?:$/.test(url.protocol)||url.username||url.password||url.hash)invalid.push(v||'(빈 href)');else resolved.push(url.href);}catch{invalid.push(v);}}
  const unique=[...new Set(resolved)],cross=unique.some(v=>new URL(v).hostname!==u.hostname);
  add('google-canonical','Google 대표 URL·HTTP Link 일치','canonical',['google'],invalid.length||unique.length>1||o.canonicalOutsideHead?'action':!raw.length||cross?'manual':'observed',`head ${o.headCanonicals.length}개 · HTTP Link ${headerCanonicals.length}개 · head 밖 ${o.canonicalOutsideHead}개 · ${unique.slice(0,3).join(' / ')||'유효 후보 미감지'}${invalid.length?` · 잘못된 대상 ${invalid.length}개`:''}`,'Google은 상대 canonical도 해석하며 절대 주소를 권장합니다. 서로 다른 후보·fragment·head 밖 선언을 점검합니다. 부재나 의도한 외부 도메인 대표 주소만으로 실패 처리하지 않습니다.');
  add('html-links','탐색 링크와 JavaScript 주소','links',both,o.links.javascript||o.links.hashRoutes?'action':o.links.withoutHref||!o.links.crawlable?'manual':'observed',`HTTP 링크 ${o.links.crawlable}개 · href 없음 ${o.links.withoutHref}개 · JS 호출 ${o.links.javascript}개 · hash 경로 ${o.links.hashRoutes}개`,'페이지 이동용 링크는 실제 URL의 a[href]로 제공합니다. 버튼·페이지 내부 앵커 용도는 직접 구분하고 모든 href 없는 요소를 검색 오류로 보지 않습니다.');
  add('anchor-text','링크 설명·유료/UGC 표시','links',both,'manual',`텍스트·title·이미지 alt 미감지 링크 ${o.links.emptyText}개 · sponsored ${o.links.sponsored}개 · ugc ${o.links.ugc}개 · nofollow ${o.links.nofollow}개`,'링크의 유료·사용자 작성 여부와 문맥은 HTML 개수만으로 알 수 없습니다. 목적에 맞는 앵커·alt·rel을 확인합니다.');
  add('naver-protocol','네이버 내부 링크의 프로토콜','links',['naver'],o.links.insecureInternal?'action':'observed',`HTTPS 페이지에서 같은 호스트의 HTTP 링크 ${o.links.insecureInternal}개`,'내부 링크와 최종 대표 URL의 프로토콜을 맞춥니다. 다른 호스트의 http 링크를 이 검사에 합산하지 않습니다.');
  add('image-source','이미지 src·대체 텍스트','images',both,e.imagesMissingAlt||o.imagesWithoutSrc?'action':d.imageCount?'observed':'manual',`이미지 ${d.imageCount}개 · alt 속성 없음 ${e.imagesMissingAlt}개 · 빈 alt ${e.imagesEmptyAlt}개 · src 없음 ${o.imagesWithoutSrc}개`,'장식 이미지는 빈 alt가 적절할 수 있습니다. 핵심 이미지의 설명·src 대체 주소·반응형 로딩은 실제 용도와 렌더링을 확인합니다.');
  const relativeIcons=o.icons.filter(i=>!/^https?:\/\//i.test(i.href));
  add('naver-favicon','네이버 파비콘 명시 주소','images',['naver'],relativeIcons.length?'action':o.icons.length?'observed':'manual',`head 파비콘 ${o.icons.length}개 · 절대 HTTP(S) 주소 아님 ${relativeIcons.length}개`,'네이버 가이드의 절대 href 요건을 확인합니다. /favicon.ico 관행 경로를 추정한 값만으로 실제 파일·크기·반영을 통과 처리하지 않습니다.');
  add('google-favicon','Google 파비콘 파일·호스트','images',['google'],'manual',`명시 태그 ${o.icons.length}개 · 선언 sizes: ${o.icons.map(i=>i.sizes||'없음').join(', ')||'없음'}`,'Google은 상대 URL도 허용합니다. 실제 파일의 정사각형·8×8 이상·48×48 초과 권장, 안정된 주소·봇 접근과 홈페이지 적용은 파일/호스트에서 검증합니다.');
  const badAlternate=o.alternates.filter(a=>{try{const v=new URL(a.href);return !/^https?:$/.test(v.protocol)||!!v.username||!!v.password||!!v.hash;}catch{return true;}});
  const duplicateLanguage=o.alternates.some((a,i)=>o.alternates.some((b,j)=>i!==j&&a.language.toLowerCase()===b.language.toLowerCase()&&a.href!==b.href));
  add('hreflang','언어별 대체 URL 선언','international',['google'],badAlternate.length||duplicateLanguage?'action':'manual',`HTML hreflang ${o.alternateCount}개(최대 100개 확인) · 잘못된 절대 주소 ${badAlternate.length}개 · 같은 언어의 상충 주소 ${duplicateLanguage?'있음':'미감지'}`,'HTML 선언의 주소만 대조했습니다. 미기재는 오류가 아니며 HTTP Link·사이트맵 방식도 가능합니다. 지원 코드·자기 자신·양방향 연결은 각 언어 URL에서 확인합니다.');
  add('rendering','정적 HTML과 실제 렌더링','javascript',both,'manual',`본문 텍스트 ${d.bodyTextLength.toLocaleString('ko-KR')}자 · 스크립트 ${d.scriptCount}개 · meta refresh ${o.metaRefresh.length}개`,'본문 글자 수나 JS 사용만으로 실패를 판정하지 않습니다. 실제 렌더링·지연 콘텐츠·페이지네이션·모바일 동등성은 관리 도구와 브라우저에서 대조합니다.');
  add('schema-syntax','JSON-LD 구문·다른 마크업 형식','schema',both,e.jsonLdErrors?'action':'observed',`JSON-LD 파싱 오류 ${e.jsonLdErrors}개 · 감지 유형 ${[...new Set(d.schemaTypes)].slice(0,30).join(', ')||'없음'} · Microdata ${e.microdataCount}개 · RDFa ${e.rdfaCount}개`,'파싱 오류 관측이며 모든 마크업의 유형·필수값·의미·리치 결과 자격을 검사한 결과는 아닙니다. 마크업이 없는 일반 페이지를 실패 처리하지 않습니다.');
  const sd=inspectOfficialStructuredData(d);
  add('google-schema-fields','Google JSON-LD 기본 필드','schema',['google'],sd.issues.length?'action':'manual',`명시 객체 ${sd.checked.length}개 기본 필드 대조${sd.issues.length?` · ${sd.issues.join(' / ')}`:''}${sd.deferred.length?` · 직접 확인: ${sd.deferred.join(' / ')}`:''}`,'감지된 Recipe·VideoObject·SoftwareApplication·Product·LocalBusiness·Event·JobPosting·ProfilePage·Dataset의 일부 기본 필드 존재만 확인합니다. 타입별 전체 속성·값의 유효성·중첩·참조·Microdata/RDFa·현재 기능 제공 여부는 아래 문서 기준과 공식 도구에서 검증합니다.');
  add('naver-video-partner','네이버 동영상 제휴 필드','media',['naver'],sd.naverIssues.length?'action':'manual',`VideoObject ${sd.videos}개 · cid가 있는 제휴 후보 ${sd.partners}개${sd.naverIssues.length?` · ${sd.naverIssues.join(' / ')}`:''}`,'cid가 있는 영상의 일부 제휴 필드만 확인합니다. 일반 Google VideoObject에 네이버 제휴 필드를 강제하지 않으며 실제 제휴 자격·단일 최상위 객체·채널 Person·무료/유료 분류는 별도 확인합니다.');
 }
 for(const topic of MANUAL_SEO_TOPICS)add(`review-${topic.topic}`,topic.title,topic.topic,topic.engines,'manual',audit.mode==='guide'?'새 기준의 URL 관측이 없습니다. 재진단 후 확인하세요.':'계정·다른 URL·실제 파일·운영 목적 등 추가 근거가 필요한 기준입니다.','아래 전체 문서 기준에서 해당 페이지·유형·서비스의 상세 조건을 확인합니다.',topic.steps);
 return audit;
}
