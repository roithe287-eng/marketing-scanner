import type {LlmCitationTest, MarketingReport} from './reportSchema';
import {aggregateCitation, buildActionPlan} from './citationMeasurement';

/** Read-time projection: archived observations remain untouched in storage. */
export function activeCitation(value:LlmCitationTest):LlmCitationTest {
  const results=value.results.filter(row=>row.engine==='chatgpt');
  if(results.length===value.results.length) {
    if(value.engineScores.gemini===undefined)return value;
    return {...value,engineScores:{chatgpt:value.engineScores.chatgpt}};
  }
  const {grade: _grade, ...rest}=value;
  if(value.measurementVersion!==2) {
    const totalCited=results.filter(row=>row.cited).length;
    const rate=results.length?Math.round(100*totalCited/results.length):0;
    return {...rest,results,totalTests:results.length,totalCited,overallScore:rate,citationRate:rate,
      engineScores:{chatgpt:rate},actionPlan:undefined,priorityActions:undefined,
      summary:'OpenAI의 저장된 구버전 브랜드 언급 관측입니다. 실제 URL 출처 인용률은 측정하지 않았습니다.'};
  }
  const metrics=aggregateCitation(results);
  const target=value.targetUrl||'';
  const hasContent=!!target&&!!value.actionPlan?.some(a=>a.action==='improve_candidate'&&a.targetUrl===target);
  return {...rest,...metrics,results,engineScores:{chatgpt:metrics.engineScores.chatgpt},
    summary:`OpenAI ${metrics.totalTests}건 중 정상 답변 ${metrics.validTests}건, 출처 판정 ${metrics.citationValidTests}건. 저장된 관측에서 다시 집계했으며 신규 API 측정이 아닙니다.`,
    priorityActions:undefined,actionPlan:buildActionPlan(results,target,hasContent)};
}

export function activeCitationReport(report:MarketingReport):MarketingReport {
  return {...report,llmCitationTest:report.llmCitationTest?activeCitation(report.llmCitationTest):report.llmCitationTest,
    geoBaseline:report.geoBaseline?{...report.geoBaseline,citation:activeCitation(report.geoBaseline.citation)}:report.geoBaseline};
}
