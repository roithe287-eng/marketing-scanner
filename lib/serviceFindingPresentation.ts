import type {ServiceStrategy} from './serviceStrategy';
/** Old reports use the same concise rendering; never turn an uncaptured field into absence. */
export function serviceFindingPresentation(f:ServiceStrategy['findings'][number]){
  const boilerplate=/완결성·최신성·동작|미확인은 실제 부재|정적 수집만으로|관련 문구의 존재는|현재 수집한 제목·설명에서|실제 폼의 선택 항목/;
  const observed=f.evidence.length?f.observed:'수집된 근거 없음';
  return {...f,observed,interpretation:boilerplate.test(f.interpretation)?'':f.interpretation,
    action:f.action.replace(/ 수정 위치: 관련 상세 본문과 다음 행동 안내 사이\. 완료 확인: 원문 조건과 화면·연결 경로를 함께 대조합니다\.$/,'')};
}
