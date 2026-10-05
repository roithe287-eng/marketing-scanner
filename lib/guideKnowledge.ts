export const GUIDE_REVIEWED_AT='2026-10-05';
export const GUIDE_SOURCES={
 title:{title:'Google · 검색 제목',url:'https://developers.google.com/search/docs/appearance/title-link'},
 description:{title:'Google · 검색 설명 생성',url:'https://developers.google.com/search/docs/appearance/snippet'},
 headings:{title:'W3C · 제목 계층과 탐색',url:'https://www.w3.org/WAI/tutorials/page-structure/headings/'},
 links:{title:'W3C · 링크 목적 이해',url:'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html'},
 forms:{title:'W3C · 입력 항목 레이블',url:'https://www.w3.org/WAI/tutorials/forms/labels/'},
 images:{title:'W3C · 이미지 대체 텍스트',url:'https://www.w3.org/WAI/tutorials/images/decision-tree/'},
 content:{title:'Google · 신뢰할 수 있는 유용한 콘텐츠',url:'https://developers.google.com/search/docs/fundamentals/creating-helpful-content'},
 ai:{title:'Google · AI 검색의 페이지 요건',url:'https://developers.google.com/search/docs/appearance/ai-features'},
 crawl:{title:'Google · 크롤링 가능한 링크',url:'https://developers.google.com/search/docs/crawling-indexing/links-crawlable'},
 schema:{title:'Google · 구조화 데이터 정책',url:'https://developers.google.com/search/docs/appearance/structured-data/sd-policies'},
 speed:{title:'Google · Core Web Vitals',url:'https://developers.google.com/search/docs/appearance/core-web-vitals'},
 naver:{title:'네이버 · 콘텐츠 마크업',url:'https://searchadvisor.naver.com/guide/markup-content'},
 imwebSeo:{title:'아임웹 · SEO 항목별 설정 위치',url:'https://www.imweb.me/qna?mode=faq&q=71763'},
 imwebText:{title:'아임웹 · 텍스트 위젯',url:'https://www.imweb.me/qna?mode=faq&q=71142'},
 imwebButton:{title:'아임웹 · 버튼 위젯',url:'https://www.imweb.me/qna?mode=faq&q=71149'},
 cafe24Design:{title:'카페24 · 디자인 편집',url:'https://support.cafe24.com/hc/ko/articles/8466402024985'},
 cafe24Seo:{title:'카페24 · 페이지 제목·설명 설정',url:'https://support.cafe24.com/hc/ko/articles/8465663101721'},
 wordpress:{title:'WordPress · 제목 블록',url:'https://wordpress.org/documentation/article/heading-block/'},
 wordpressBlocks:{title:'WordPress · 블록 편집',url:'https://wordpress.org/documentation/article/work-with-blocks/'},
 shopifySeo:{title:'Shopify · 페이지별 SEO 설정',url:'https://help.shopify.com/en/manual/promoting-marketing/seo/adding-keywords'},
 shopifyTheme:{title:'Shopify · 테마 편집',url:'https://help.shopify.com/en/manual/online-store/themes/customizing-themes'},
 wixSeo:{title:'Wix · 페이지 SEO 패널',url:'https://support.wix.com/en/article/customizing-your-pages-seo-settings-in-the-seo-panel'},
} as const;
export type GuideSourceId=keyof typeof GUIDE_SOURCES;
export type GuideTopic='title'|'description'|'heading'|'cta'|'form'|'image'|'content'|'trust'|'ai'|'crawl'|'schema'|'speed'|'measurement';
export type GuideEffect={mechanism:string;expected:string;limit:string;metric:string;check:string;sources:GuideSourceId[]};
export const GUIDE_EFFECTS:Record<GuideTopic,GuideEffect>={
 title:{mechanism:'검색엔진은 title과 페이지의 주요 제목 등을 검색 결과 제목을 만드는 자료로 사용합니다.',expected:'페이지의 주제와 브랜드가 검색 단계에서 더 명확히 전달되도록 정돈할 수 있습니다.',limit:'표시 제목을 검색엔진이 바꿀 수 있습니다. 순위·CTR 상승 폭은 사전 검증되지 않았습니다.',metric:'같은 URL·검색어·기기의 노출수, 클릭수, CTR',check:'게시된 title 반영 → 재수집 확인 → 같은 조건의 검색 실적 비교',sources:['title','naver']},
 description:{mechanism:'검색 설명은 주로 본문에서 만들어지며 적합한 meta description도 사용될 수 있습니다.',expected:'본문과 일치하는 요약을 제공해 방문 전 서비스 범위와 조건을 이해하는 데 도움을 줄 수 있습니다.',limit:'입력 문구의 그대로 노출이나 클릭 증가를 보장하지 않습니다.',metric:'검색 설명 반영 여부와 같은 URL·검색어 CTR',check:'meta description 저장값과 최종 HTML을 대조한 뒤 실제 검색 설명 관찰',sources:['description','naver']},
 heading:{mechanism:'내용에 맞는 제목 계층은 페이지 구조를 전달하고 보조기술 이용자의 섹션 탐색을 돕습니다.',expected:'고객이 주제와 하위 내용을 파악하기 쉬운 구조를 만들 수 있습니다.',limit:'H1 추가만으로 순위나 문의가 상승한다는 뜻은 아닙니다. 화면 디자인과 실제 내용도 함께 확인합니다.',metric:'제목 계층·원문 일치 여부, 주요 콘텐츠 탐색·CTA 클릭',check:'대표 제목과 하위 제목의 관계를 HTML 및 PC·모바일에서 확인',sources:['headings','title']},
 cta:{mechanism:'링크 문구와 문맥이 이동 목적을 설명하면 사용자가 다음 행동을 판단하는 데 도움이 됩니다.',expected:'버튼을 누른 뒤 무엇이 나오는지 알기 쉬워져 잘못된 클릭과 행동의 혼선을 줄이는 방향을 기대합니다.',limit:'문의·구매 증가 여부는 별도 실험이 필요한 가설입니다. 클릭 증가와 완료 증가는 다릅니다.',metric:'CTA 클릭 세션 / 대상 세션, 완료 세션 / CTA 클릭 세션',check:'버튼 문구 → 목적지 → 완료 상태를 실제로 테스트하고 이벤트 중복 확인',sources:['links']},
 form:{mechanism:'입력 항목에 연결된 레이블은 무엇을 입력해야 하는지 이해하고 조작하는 데 도움을 줍니다.',expected:'요구 정보와 입력 오류를 이해하기 쉬운 폼을 만들 수 있습니다.',limit:'필드 축소나 레이블 변경만으로 전환율 향상을 예측할 수 없습니다.',metric:'입력 시작·오류·제출 성공 수, 시작 세션 대비 완료 세션',check:'필수 항목·오류 안내·키보드 접근·실제 제출 완료를 테스트',sources:['forms']},
 image:{mechanism:'정보 이미지의 alt는 대체 정보를 제공합니다. 장식 이미지는 빈 alt가 적합할 수 있습니다.',expected:'이미지를 보지 못하는 이용자에게 필요한 정보나 링크 목적을 전달할 수 있습니다.',limit:'모든 이미지에 키워드를 채우는 작업이 아닙니다. 이미지 검색 노출 상승은 보장되지 않습니다.',metric:'정보·기능·장식 구분에 맞는 대체 텍스트 적용 여부',check:'이미지 기능에 맞게 alt를 검토하고 화면의 중복 설명 여부 확인',sources:['images']},
 content:{mechanism:'고객 목적에 맞는 고유한 정보와 설명은 유용한 콘텐츠를 평가하는 공식 가이드의 핵심입니다.',expected:'추상적이거나 반복되는 설명을 구체적 범위·절차·조건으로 바꾸어 판단에 필요한 정보를 보완할 수 있습니다.',limit:'동의어 교체나 반복 횟수 감소 자체의 검색 효과를 단정하지 않습니다.',metric:'내용 누락·중복 검토, 관련 페이지 이동, 반복 상담 질문',check:'원문의 의미·부정·예외를 유지하고 담당자가 사실 확인',sources:['content']},
 trust:{mechanism:'명확한 출처, 작성 주체, 실제 경험과 근거는 콘텐츠의 신뢰성을 판단하는 자료가 됩니다.',expected:'방문자가 서비스의 주장과 사례를 직접 확인할 수 있는 근거를 갖출 수 있습니다.',limit:'후기나 자격의 존재만으로 진실성·성과를 검증하지 않습니다. 허위 수치·후기는 추가하지 않습니다.',metric:'근거 링크 정상 동작, 정보 일치, 상담에서 반복되는 확인 질문',check:'사례의 기간·대상·출처와 공개 가능 여부를 담당자가 확인',sources:['content']},
 ai:{mechanism:'Google AI 검색의 지원 링크 대상은 색인되고 검색 스니펫 표시 자격을 갖춰야 하며 기본 SEO 원칙이 적용됩니다.',expected:'답·조건·출처를 읽을 수 있게 정리해 답변의 근거로 검토될 수 있는 기반을 보완합니다.',limit:'AI 답변 인용·노출은 보장되지 않습니다. Google 문서의 조건을 모든 AI 서비스에 일반화하지 않습니다.',metric:'색인·미리보기 상태, 같은 질문·모델의 유효 응답과 실제 자사 출처',check:'콘텐츠의 실제 접근 여부와 질문별 답변·출처를 각각 다시 관측',sources:['ai','content']},
 crawl:{mechanism:'검색로봇은 접근 가능한 링크를 통해 다른 페이지를 발견하며, 검색 표시에는 수집·색인 요건이 필요합니다.',expected:'공개하려는 페이지의 읽기·연결 장벽을 찾아 정리할 수 있습니다.',limit:'관리·회원·개인정보 페이지는 공개 대상으로 바꾸지 않습니다. 수집 가능과 색인·노출 성공은 다릅니다.',metric:'URL 검사, 최종 응답·robots 지시, 대표 URL과 색인 상태',check:'운영 정책을 확인한 뒤 공개 대상만 수정하고 관리 도구에서 재검사',sources:['crawl','ai']},
 schema:{mechanism:'지원되는 구조화 데이터는 콘텐츠 의미를 전달하며 조건에 맞는 검색 표현의 자격을 갖추는 데 사용됩니다.',expected:'실제 페이지의 상품·사업 정보를 기계가 읽을 수 있는 일관된 형식으로 정리할 수 있습니다.',limit:'유효한 마크업이어도 리치 결과 노출은 보장되지 않습니다. 보이지 않는 허위 내용을 넣지 않습니다.',metric:'지원 유형·필수 속성·원문 일치 및 유효성 검사',check:'현재 지원되는 유형인지 확인하고 테스트 도구와 실제 페이지를 대조',sources:['schema']},
 speed:{mechanism:'Core Web Vitals는 로딩·상호작용·시각적 안정성을 측정하는 사용자 경험 지표입니다.',expected:'실제 병목을 확인해 늦게 뜨는 콘텐츠·반응 지연·레이아웃 이동을 줄이는 방향으로 개선할 수 있습니다.',limit:'HTML 수신 시간은 화면 로딩이나 실사용자 CWV가 아닙니다. 검색 순위·매출 상승률을 추정하지 않습니다.',metric:'실사용자 LCP·INP·CLS와 동일 기기 조건의 진단 결과',check:'PageSpeed Insights 및 현장 데이터로 병목을 확인하고 동일 조건 재측정',sources:['speed']},
 measurement:{mechanism:'페이지 HTML의 추적 코드 흔적만으로 계정의 이벤트 수신·전환 집계 성공을 판단할 수 없습니다.',expected:'버튼 클릭과 실제 완료를 구분하여 수정 이후 변화를 검증할 수 있는 기록을 갖춥니다.',limit:'사업 성과 향상이 검증된 작업으로 표시하지 않습니다. 담당 계정에서 직접 확인해야 합니다.',metric:'테스트 이벤트 수신·중복 여부와 완료 세션 정의',check:'태그 담당자가 테스트 환경에서 이벤트 전송·수신·집계까지 대조',sources:[]},
};
