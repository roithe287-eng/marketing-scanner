import type {MarketingReport} from '../../lib/reportSchema';
import {diagnosisAxes} from '../../lib/diagnosisVisuals';
import {serviceReviewReport} from './service-review-report';

/** Pure synthetic preview: no fetches, account state or analysis calls. */
export function radarReviewReport():MarketingReport{
 const report=serviceReviewReport(),page=report.pageEvidence;
 return {...report,evidenceReview:{version:1,sourceUrl:report.url,capturedAt:page.capturedAt,score:100,passed:2,assessed:2,unknown:0,
  note:'화면 검수용 가상 자료입니다. 저장된 제목·설명 두 항목을 충족한 예시이며 실제 고객의 분석 결과가 아닙니다.',
  criteria:[{id:'title',label:'페이지 제목',status:'pass',rule:'비어 있지 않은 제목',evidence:page.title,locator:'title'},{id:'meta_description',label:'검색 설명',status:'pass',rule:'비어 있지 않은 설명',evidence:page.description,locator:'meta[name="description"]'}],
  axes:diagnosisAxes.map(a=>({key:a.key,label:a.label,status:['firstView','conversionFlow','adLanding','mobileUx'].includes(a.key)?'unmeasured' as const:'review' as const,evidence:['firstView','conversionFlow','adLanding','mobileUx'].includes(a.key)?'실제 화면과 행동 데이터는 측정하지 않은 가상 검수 자료입니다.':`가상 페이지 원문: ${page.description}`,nextStep:a.check})),
 }};
}
