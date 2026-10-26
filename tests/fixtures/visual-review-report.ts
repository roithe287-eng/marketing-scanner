import {MarketingReportSchema} from '../../lib/reportSchema';
import fixture from './usability-report.json';
import {answerPlan} from './answer-content';
/** No customer data. Preview-only view and automated preservation tests. */
export function visualReviewReport(){
 const report=MarketingReportSchema.parse({...fixture,answerContentPlan:answerPlan()});
 report.llmCitationTest!.results[0].sources!.push({url:'https://reference.example.org/guide',title:'가상 외부 출처 · 비용과 이용 안내',ownership:'external'});
 return report;
}
