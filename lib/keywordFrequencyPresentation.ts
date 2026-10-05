import type {KeywordFrequency} from './reportSchema';

export function keywordFrequencyScope(frequency:KeywordFrequency):string {
  if(frequency.methodVersion!==2) return '이전 집계 방식: 제목·설명·헤딩·본문을 합친 저장값입니다. 중복 합산과 문장 경계를 넘은 어구가 포함될 수 있으므로, 본문 빈도 확인과 수정 판단에는 다시 진단한 값을 사용하세요.';
  const range=frequency.bodyTruncated?'수집 본문 앞부분':'수집 본문';
  return `${range}${frequency.sourceLength!==undefined?` ${frequency.sourceLength.toLocaleString()}자`:''} 기준입니다. 제목·메타 설명을 추가 합산하지 않으며, 메뉴·푸터 등 HTML 본문에 포함된 텍스트도 집계합니다. 화면에만 동적으로 표시되는 문구는 누락될 수 있습니다.`;
}
export function keywordDensityNote(frequency:KeywordFrequency,phrases:boolean):string {
  if(frequency.methodVersion!==2) return '이전 집계의 저장 비중입니다. 새 방식과 직접 비교하지 마세요.';
  return phrases?'비중 = 어구 등장 횟수 ÷ 집계 대상인 인접 단어쌍 수. 문장·블록 경계와 제외 단어를 건너 이어 붙이지 않습니다.':'비중 = 단어 등장 횟수 ÷ 집계 대상 단어 수. 조사·동의어를 통합한 형태소 분석이 아닌 규칙 기반 근사치입니다.';
}
