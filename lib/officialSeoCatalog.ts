import catalog from './officialSeoGuideData.json';
import type {OfficialSeoGuide,OfficialSeoEngine} from './officialSeoSchema';
export const OFFICIAL_SEO_GUIDES=catalog as OfficialSeoGuide[];
export const OFFICIAL_SEO_SCOPE='입력 URL의 정적 HTML·응답·robots 관측입니다. 사이트 전체·렌더링·실제 파일·계정·정책 심사는 직접 확인합니다. 문서 반영 수는 사이트 통과 수가 아닙니다.';
export function officialSeoSources(topic:string,engines:OfficialSeoEngine[]=['naver','google']) {
 return OFFICIAL_SEO_GUIDES.filter(g=>g.topic===topic&&engines.includes(g.engine));
}
export const OFFICIAL_SEO_COVERAGE={
 total:OFFICIAL_SEO_GUIDES.length,
 naver:OFFICIAL_SEO_GUIDES.filter(g=>g.engine==='naver').length,
 google:OFFICIAL_SEO_GUIDES.filter(g=>g.engine==='google').length,
 reviewed:OFFICIAL_SEO_GUIDES.filter(g=>g.status==='reviewed').length,
 unavailable:OFFICIAL_SEO_GUIDES.filter(g=>g.status==='unavailable').length,
};
export const OFFICIAL_SEO_EDUCATION=[
 {title:'네이버 웹 검색의 기초 · 교육 PDF',url:'https://searchadvisor.naver.com/doc/wmt_guide_ps_websearch.pdf'},
 {title:'웹마스터도구 활용 · 교육 PDF',url:'https://searchadvisor.naver.com/doc/wmt_guide_ps_quality.pdf'},
];

// Direct source anchors for observed checks; broad topic collections remain available below.
const CHECK_SOURCES:Record<string,string[]>={
 'http':['google-essentials-technical','naver-seo-basic-http'],
 'google-document-size':['google-crawling-indexing-googlebot'],
 'head-title':['google-crawling-indexing-valid-page-metadata','google-appearance-title-link','naver-markup-content'],
 'google-description':['google-appearance-snippet'],
 'naver-h1':['naver-seo-help'],
 'google-index':['google-crawling-indexing-robots-meta-tag','google-crawling-indexing-block-indexing'],
 'google-snippet':['google-crawling-indexing-robots-meta-tag','google-appearance-snippet','google-appearance-ai-features'],
 'google-robots':['google-crawling-docs-robots-txt-robots-txt-spec'],
 'naver-robots':['naver-seo-basic-robots'],
 'google-resources':['google-crawling-docs-robots-txt-robots-txt-spec','google-crawling-indexing-javascript-javascript-seo-basics'],
 'naver-resources':['naver-resource-and-link','naver-seo-advanced-javascript'],
 'google-canonical':['google-crawling-indexing-consolidate-duplicate-urls','google-crawling-indexing-canonicalization-troubleshooting'],
 'html-links':['google-crawling-indexing-links-crawlable','naver-seo-advanced-url','naver-resource-and-link'],
 'anchor-text':['google-crawling-indexing-links-crawlable','google-crawling-indexing-qualify-outbound-links','naver-resource-and-link'],
 'naver-protocol':['naver-resource-and-link'],
 'image-source':['google-appearance-google-images','naver-seo-help'],
 'naver-favicon':['naver-markup-favicon'],
 'google-favicon':['google-appearance-favicon-in-search'],
 'hreflang':['google-specialty-international-localized-versions'],
 'rendering':['google-crawling-indexing-javascript-javascript-seo-basics','google-crawling-indexing-javascript-lazy-loading','naver-seo-advanced-javascript'],
 'schema-syntax':['naver-structured-data-intro','google-appearance-structured-data-sd-policies'],
 'google-schema-fields':['google-appearance-structured-data-search-gallery','google-appearance-structured-data-sd-policies'],
 'naver-video-partner':['naver-structured-data-video'],
};
export function officialSeoCheckSources(check:{id:string;topic:string;engines:OfficialSeoEngine[]}) {
 const ids=CHECK_SOURCES[check.id];return ids?ids.map(id=>OFFICIAL_SEO_GUIDES.find(g=>g.id===id)).filter((g):g is OfficialSeoGuide=>!!g):officialSeoSources(check.topic,check.engines);
}
