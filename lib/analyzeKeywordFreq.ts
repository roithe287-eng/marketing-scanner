/**
 * v46-W2: 키워드 빈도 분석 (네이버 애드부스트 '키워드 요약' 대응)
 * - 개별 키워드 / 구문(Phrase) 키워드 각 상위 30개
 * - 빈도수·빈도율·타이틀/메타디스크립션 포함 여부
 * - 자체 경량 토크나이저 사용 (한국어 형태소 분석기 미사용 → 근사치)
 * - AI 호출 없음 (비용 0 · 지연 0)
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

/** 한글 2자 이상 연속 시퀀스 / 영숫자 2자 이상 토큰 추출 */
function tokenize(text: string): string[] {
  const matches =
    text.toLowerCase().match(/[가-힣]{2,}|[a-z0-9][a-z0-9_-]{1,}/g) || [];
  return matches.filter((t) => !STOPWORDS.has(t));
}

export function analyzeKeywordFrequency(
  data: ExtractedWebsiteData
): KeywordFrequency {
  // 타이틀·메타·헤딩·본문을 하나의 코퍼스로 (네이버는 페이지 전체 텍스트 대상)
  const source = [
    data.title,
    data.description,
    data.h1.join(" "),
    data.h2.join(" "),
    data.bodyText,
  ].join(" ");

  const tokens = tokenize(source);
  const totalTokens = tokens.length;

  // 개별 키워드 빈도
  const singleMap = new Map<string, number>();
  for (const t of tokens) singleMap.set(t, (singleMap.get(t) || 0) + 1);

  // 구문(2-gram) 빈도 — 인접 토큰 쌍
  const phraseMap = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const p = `${tokens[i]} ${tokens[i + 1]}`;
    phraseMap.set(p, (phraseMap.get(p) || 0) + 1);
  }

  const titleLc = data.title.toLowerCase();
  const descLc = data.description.toLowerCase();

  const toItems = (
    map: Map<string, number>,
    minCount: number
  ): KeywordFreqItem[] =>
    [...map.entries()]
      .filter(([, c]) => c >= minCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([keyword, count]) => ({
        keyword,
        count,
        density:
          totalTokens > 0
            ? Math.round((count / totalTokens) * 10000) / 100
            : 0,
        inTitle: titleLc.includes(keyword),
        inMetaDescription: descLc.includes(keyword),
      }));

  return {
    totalTokens,
    uniqueSingles: singleMap.size,
    uniquePhrases: phraseMap.size,
    singles: toItems(singleMap, 2),
    phrases: toItems(phraseMap, 2),
  };
}
