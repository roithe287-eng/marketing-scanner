import {PLACE_CATEGORIES,placeTermKey,type PlaceCategory,type PlaceTerm} from './hospitalPlace';

// A bounded vocabulary for unlabeled clinic copy. Explicit category lists can include other terms.
// These are page-text matches, not a catalogue of terms approved by SmartPlace.
const vocabulary:Record<PlaceCategory,string[]> = {
  증상:'어지럼증 현기증 코막힘 콧물 재채기 이명 기침 가래 쉰목소리 인후통 귀통증 두통 복통 속쓰림 소화불량 설사 변비 흉통 호흡곤란 불면 손저림 발저림 가려움 부종 요통 허리통증 무릎통증 어깨통증 발뒤꿈치통증 생리통 치통 안구통증 시력저하'.split(' '),
  질병:'이석증 족저근막염 중이염 비염 부비동염 편도염 난청 천식 당뇨병 고혈압 위염 역류성식도염 아토피피부염 두드러기 편평사마귀 사마귀 주사피부염 지루성피부염 여드름 대상포진 건선 백내장 녹내장 안구건조증 치주염 충치 허리디스크 척추관협착증 회전근개파열 오십견 관절염 손목터널증후군 자궁근종 다낭성난소증후군'.split(' '),
  시술:'도수치료 고막절개술 체외충격파치료 물리치료 신경차단술 관절주사 추나요법 침치료 약침치료 부항치료 레이저치료 레이저토닝 보톡스 필러 스케일링 임플란트 신경치료 라식 라섹'.split(' '),
  검진:'청력검사 알레르기검사 수면다원검사 건강검진 국가건강검진 영유아검진 암검진 위내시경 대장내시경 복부초음파 유방초음파 갑상선초음파 심전도검사 골밀도검사 혈액검사 안저검사 시력검사 구강검진'.split(' ')
};
const knownTerms = PLACE_CATEGORIES.flatMap(category=>vocabulary[category].map(term=>({category,term,key:placeTermKey(term)})));
const termLookup = new Map(knownTerms.map(t=>[t.key,t]));
const alternatives = knownTerms.map(t=>t.key).sort((a,b)=>b.length-a.length).map(key=>[...key].join('\\s*')).join('|');
// Match complete Korean terms with optional spacing and particles, taking the longest first.
const termPattern = new RegExp('(?:^|[^가-힣a-z0-9])('+alternatives+')(?=$|[^가-힣a-z0-9]|에서|으로|관련|진료|검사|치료|센터|클리닉|[은는이가을를와과도의에])','giu');
const categoryHeading = /^(?:주요\s*|진료\s*|대상\s*|관련\s*)?(증상|질병|질환|시술|검진|검사)(?:명| 목록| 항목)?$/u;
const labelled = /^(?:주요\s*|진료\s*|대상\s*|관련\s*)?(증상|질병|질환|시술|검진|검사)(?:명| 목록| 항목)?\s*[:：]\s*(.+)$/u;
const excluded = /하지\s*않|하지\s*못|하지\s*않는|시행\s*안\s*함|미취급|진료\s*제외|제외\s*항목|(?:진료|시행|제공|취급|치료|실시|검사)(?:를|는|을|하지|하지는|하지도)?\s*(?:않|못|안\s*(?:함|합|해|하)|불가|중단)|(?:미제공|미시행|타\s*병원|다른\s*(?:병원|의원)|전원\s*(?:안내|의뢰)|의뢰\s*(?:안내|기관)|후기|환자명|생년월일|개인정보|전화번호|사례|보장|비교\s*광고)/u;
export function findPlaceTerms(units:{text:string;context?:string}[]):PlaceTerm[] {
  const terms:PlaceTerm[] = [];
  const add = (category:PlaceCategory,term:string) => {
    if (terms.filter(t=>t.category===category).length>=12 || terms.some(t=>t.category===category && placeTermKey(t.term)===placeTermKey(term))) return;
    terms.push({category,term});
  };
  for (const {text,context=''} of units) {
    if (excluded.test(text+' '+context)) continue;
    const declaration = text.match(labelled);
    const label = declaration?.[1] || context.match(categoryHeading)?.[1];
    if (label) {
      const category = label==='질환'?'질병':label==='검사'?'검진':label as PlaceCategory;
      for (const name of (declaration?.[2] || text).split(/[,，·;、/]/u)) {
        const term = name.trim();
        if (/^[가-힣A-Za-z][가-힣A-Za-z0-9 -]{1,23}$/u.test(term) && !/(합니다|입니다|하세요|문의|예시|담당|환자|성명|보호자)/.test(term)) add(category,term);
      }
      continue;
    }
    for (const match of text.normalize('NFKC').matchAll(termPattern)) {
      const word=termLookup.get(placeTermKey(match[1]));
      if (word) add(word.category,word.term);
    }
  }
  return terms;
}
