/**
 * 수집 본문 기준의 규칙 기반 키워드 빈도 분석
 * - 개별 키워드 / 구문(Phrase) 키워드 각 상위 30개
 * - 빈도수·빈도율·타이틀/메타디스크립션 포함 여부
 * - 자체 경량 토크나이저 사용 (한국어 형태소 분석기 미사용 → 근사치)
 * - AI 호출 없음 (외부 API 비용 없음)
 */

import type { ExtractedWebsiteData } from "./extractWebsite";
import type { KeywordFrequency, KeywordFreqItem } from "./reportSchema";

const STOPWORDS = new Set([
  // 한국어 빈출 기능어·UI어
  "있습니다",
  "입니다",
  "합니다",
  "됩니다",
  "위한",
  "대한",
  "통한",
  "통해",
  "관련",
  "제공",
  "다양한",
  "최고의",
  "경우",
  "때문",
  "이상",
  "부터",
  "까지",
  "에서는",
  "으로",
  "하는",
  "있는",
  "없는",
  "같은",
  "또는",
  "그리고",
  "하지만",
  "그러나",
  "또한",
  "이제",
  "바로",
  "지금",
  "여기",
  "저희",
  "우리",
  "여러분",
  "클릭",
  "더보기",
  "자세히",
  "메뉴",
  "닫기",
  "열기",
  "이전",
  "다음",
  "공유",
  "홈페이지",
  "바로가기",
  // 영어 빈출 기능어
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "our",
  "are",
  "not",
  "this",
  "that",
  "from",
  "all",
  "can",
  "has",
  "have",
  "was",
  "were",
  "will",
  "about",
  "more",
  "new",
  "use",
  "via",
  "out",
  "get",
  "home",
  "menu",
  "click",
  "read",
  "view",
  "copyright",
  "rights",
  "reserved",
  "inc",
  "ltd",
  "com",
  "www",
  "http",
  "https",
]);

/** Preserve short/stop words and separators until adjacency has been checked. */
const rawTokens=(text:string)=>text.normalize('NFKC').toLowerCase().match(/[가-힣]+|[a-z0-9][a-z0-9_-]*/g)||[];
const meaningful=(token:string)=>token.length>=2&&!STOPWORDS.has(token);
const pairs=(text:string)=>{
  const source=text.normalize('NFKC').toLowerCase();
  const matches=[...source.matchAll(/[가-힣]+|[a-z0-9][a-z0-9_-]*/g)];
  return matches.slice(1).flatMap((next,i)=>{
    const previous=matches[i],gap=source.slice(previous.index!+previous[0].length,next.index);
    return meaningful(previous[0])&&meaningful(next[0])&&/^[^\S\r\n]+$/.test(gap)?[previous[0]+' '+next[0]]:[];
  });
};
export function analyzeKeywordFrequency(data:ExtractedWebsiteData):KeywordFrequency {
  // Headings already occur in bodyText. Never add them or metadata a second time.
  const tokens=rawTokens(data.bodyText).filter(meaningful), phrases=pairs(data.bodyText);
  const singles=new Map<string,number>(),bigrams=new Map<string,number>();
  for(const token of tokens)singles.set(token,(singles.get(token)||0)+1);
  for(const phrase of phrases)bigrams.set(phrase,(bigrams.get(phrase)||0)+1);
  const titleTokens=new Set(rawTokens(data.title)),descriptionTokens=new Set(rawTokens(data.description));
  const titlePairs=new Set(pairs(data.title)),descriptionPairs=new Set(pairs(data.description));
  function items(map:Map<string,number>,denominator:number,title:Set<string>,description:Set<string>):KeywordFreqItem[]{
    return [...map.entries()].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko')).slice(0,30).map(([keyword,count])=>({keyword,count,density:denominator?Math.round(count/denominator*10000)/100:0,inTitle:title.has(keyword),inMetaDescription:description.has(keyword)}));
  }
  return {methodVersion:2,scope:'body',sourceLength:data.bodyText.length,bodyTruncated:data.bodyTextLength>data.bodyText.length,totalTokens:tokens.length,totalPhrases:phrases.length,uniqueSingles:singles.size,uniquePhrases:bigrams.size,singles:items(singles,tokens.length,titleTokens,descriptionTokens),phrases:items(bigrams,phrases.length,titlePairs,descriptionPairs)};
}
