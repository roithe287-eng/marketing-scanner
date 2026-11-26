export type KpiInputs={impressions:string;clicks:string;sessions:string;converted:string;targetImpressions:string;targetCtr:string;targetSessions:string;targetCvr:string};
export const EMPTY_KPI:KpiInputs={impressions:'',clicks:'',sessions:'',converted:'',targetImpressions:'',targetCtr:'',targetSessions:'',targetCvr:''};
export const DEMO_KPI:KpiInputs={impressions:'10000',clicks:'300',sessions:'240',converted:'6',targetImpressions:'12000',targetCtr:'4',targetSessions:'360',targetCvr:'3'};
export type SimpleGoalInputs={opportunities:string;completed:string;targetCompleted:string};
export function calculateSimpleGoal(input:SimpleGoalInputs){
  const errors:Partial<Record<keyof SimpleGoalInputs,string>>={};
  const values={} as Record<keyof SimpleGoalInputs,number|null>;
  for(const key of Object.keys(input) as (keyof SimpleGoalInputs)[]){
    const raw=input[key].trim(),n=Number(raw);
    values[key]=raw&&Number.isFinite(n)&&n>=0&&n<=1e12&&Number.isInteger(n)?n:null;
    if(raw&&values[key]===null)errors[key]='0 이상 1조 이하의 정수를 입력하세요.';
  }
  if(values.opportunities!==null&&values.completed!==null&&values.completed>values.opportunities)errors.completed='완료 횟수가 전체 횟수보다 큽니다. 같은 기간의 수치인지 확인하세요.';
  const valid=!Object.keys(errors).length;
  const rate=!errors.completed&&values.opportunities!==null&&values.opportunities>0&&values.completed!==null?values.completed/values.opportunities:null;
  let required:number|null=null;
  if(valid&&values.targetCompleted===0)required=0;
  else if(valid&&values.targetCompleted!==null&&values.opportunities!==null&&values.completed){
    // Divide integer counts directly so an exact target cannot round up one extra visit.
    const completed=BigInt(values.completed);
    const numerator=BigInt(values.targetCompleted)*BigInt(values.opportunities);
    const visits=(numerator+completed-BigInt(1))/completed;
    if(visits<=BigInt(Number.MAX_SAFE_INTEGER))required=Number(visits);
    else errors.targetCompleted='필요 횟수가 정확히 표시할 수 있는 범위를 초과합니다. 목표를 낮춰 주세요.';
  }
  return {values,errors,rate,required,additional:required!==null&&values.opportunities!==null?required-values.opportunities:null};
}
export function formatGoalRate(rate:number|null){
  if(rate===null)return '미산출';
  if(rate>0&&rate<0.0001)return '0.01% 미만';
  if(rate<1&&rate>0.9999)return '99.99% 초과';
  return (rate*100).toLocaleString('ko-KR',{maximumFractionDigits:2})+'%';
}

export function describeGoal(result:ReturnType<typeof calculateSimpleGoal>,unit:string,done:string){
  const {values,errors,rate,required,additional}=result;
  if(Object.keys(errors).length)return '표시된 입력 오류를 먼저 확인해 주세요.';
  if(required===0)return '목표가 0회이므로 필요한 '+unit+'도 0회입니다.';
  if(values.opportunities===0)return unit+'이 0회여서 현재 비율을 산출할 수 없습니다.';
  if(rate===0&&values.targetCompleted!==null)return done+' 0회로 측정됐습니다. 현재 비율로 양수 목표에 필요한 '+unit+' 횟수를 계산할 수 없습니다.';
  if(additional!==null)return additional>0?'현재보다 '+additional.toLocaleString('ko-KR')+'회가 더 필요합니다.':additional===0?'현재와 같은 횟수가 필요합니다.':'입력한 현재 횟수보다 낮은 목표입니다.';
  return rate!==null?'목표 횟수를 입력하면 필요한 '+unit+'을 계산합니다.':'같은 기간의 현재 실적과 목표 횟수를 입력하세요.';
}

const names:Record<keyof KpiInputs,string>={impressions:'현재 노출수',clicks:'현재 클릭수',sessions:'현재 세션 수',converted:'현재 전환 세션 수',targetImpressions:'목표 노출수',targetCtr:'목표 CTR',targetSessions:'목표 세션 수',targetCvr:'목표 세션 전환율'};
export function calculateGrowthKpi(input:KpiInputs) {
  const errors:Partial<Record<keyof KpiInputs,string>>={};
  const values={} as Record<keyof KpiInputs,number|null>;
  for(const key of Object.keys(names) as (keyof KpiInputs)[]) {
    const raw=input[key].trim(),rate=key==='targetCtr'||key==='targetCvr';
    if(!raw){values[key]=null;continue;}
    const value=Number(raw);
    if(!Number.isFinite(value)||value<0||value>(rate?100:1e12)||(!rate&&!Number.isInteger(value))) {
      errors[key]=`${names[key]}: ${rate?'0~100 사이의 비율':'0 이상인 정수(최대 1조)'}를 입력하세요.`;values[key]=null;
    }else values[key]=value;
  }
  if(values.impressions!==null&&values.clicks!==null&&values.clicks>values.impressions)errors.clicks='클릭수가 노출수보다 큽니다. 같은 기간·같은 보고서인지 확인하세요.';
  if(values.sessions!==null&&values.converted!==null&&values.converted>values.sessions)errors.converted='전환 세션은 전체 세션을 초과할 수 없습니다. 이벤트 횟수를 입력하지 않았는지 확인하세요.';
  const valid=Object.keys(errors).length===0;
  const ctr=valid&&values.impressions&&values.clicks!==null?values.clicks/values.impressions*100:null;
  const cvr=valid&&values.sessions&&values.converted!==null?values.converted/values.sessions*100:null;
  const clicks=valid&&values.targetImpressions!==null&&values.targetCtr!==null?values.targetImpressions*values.targetCtr/100:null;
  const converted=valid&&values.targetSessions!==null&&values.targetCvr!==null?values.targetSessions*values.targetCvr/100:null;
  return {values,errors,ctr,cvr,clicks,converted,clickDelta:clicks!==null&&values.clicks!==null?clicks-values.clicks:null,conversionDelta:converted!==null&&values.converted!==null?converted-values.converted:null};
}
