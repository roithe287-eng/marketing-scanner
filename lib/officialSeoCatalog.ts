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
