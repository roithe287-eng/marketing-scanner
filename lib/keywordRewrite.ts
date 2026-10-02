import type {KeywordFreqItem,KeywordFrequency,MarketingReport} from './reportSchema';
export const rewriteKinds=['유지','구체화','정리','배치','문맥 검토'] as const;
export type RewriteKind=typeof rewriteKinds[number];
export const KEYWORD_REWRITE_NOTE='저장된 빈도와 제목·설명을 바탕으로 만든 검토 제안입니다. 반복 횟수만으로 과잉이나 적정 밀도를 판정하지 않습니다. 문장 원문이 없는 항목은 작성 틀을 제안하며, 괄호 안을 사실로 채워 사용하세요.';
const common=new Set(['필요한','필요합니다','함께','없습니다','있습니다','현재','가능한','가능합니다','통해','통한','위한','위해','대한','대해','이러한','이런','있는','없는','하는','하여','그리고','또한','합니다','됩니다','입니다','모든','여러','다양한','보다','가장','더욱','바로','않습니다','따라','실제','먼저','다시','이를','경우','이후','이전']);
export function isGenericKeyword(word:string){return common.has(word.trim())||/^(?:the|and|with|this|that|from|your|our)$/i.test(word.trim());}
const concreteTemplates:Record<string,string>={
  운영:'[운영 대상]의 [업무 항목]을 [주기]마다 실행하고 [결과 확인 방식]으로 안내합니다.',
  진행:'[시작 조건] 확인 → [실제 진행 단계] → [완료 시 전달물] 순서로 진행합니다.',
  제공:'[대상 고객]에게 [제공 항목]을 전달합니다. [포함·미포함 범위]를 확인해 주세요.',
  지원:'[지원 대상]의 [구체적인 문제]를 [지원 방식·시간] 안에서 돕습니다.',
  관리:'[관리 대상]을 [점검 주기]마다 확인하고 [문제 발생 시 조치]를 수행합니다.',
  분석:'[분석 지표]를 [비교 기준·기간]과 대조해 [판단할 내용]을 정리합니다.',
  서비스:'[고객 상황]에 맞춰 [실제 수행 업무]와 [제공 범위]를 안내합니다.',
  범위:'포함: [실제 제공 항목] / 제외: [제공하지 않는 항목] / 별도 협의: [조건]',
};
const tidy=(s:string)=>s.toLowerCase().replace(/[\s·|.,!?]/g,'');
function brandMatch(word:string,brand:string){const a=tidy(word),b=tidy(brand);return b.length>=2&&(a===b||['은','는','이','가','을','를','의','에서','와','과'].some(p=>a===b+p));}
export type KeywordRewrite={id:string;item:KeywordFreqItem;kind:RewriteKind;reason:string;action:string;template:string;placement:string;check:string;source:string|null;sourceLabel:string;isPhrase:boolean};
export function keywordRewrite(item:KeywordFreqItem,meta:MarketingReport['meta'],isPhrase=false):KeywordRewrite {
  const word=item.keyword.trim(),brand=meta?.siteName||'';
  const entry=([['저장된 제목',meta?.ogTitle],['저장된 설명',meta?.ogDescription]] as const).find(([,v])=>v&&v.toLowerCase().includes(word.toLowerCase()));
  const base={id:`${isPhrase?'phrase':'word'}:${word}`,item,isPhrase,source:entry?.[1]||null,sourceLabel:entry?.[0]||'문장 원문 미저장'};
  if(brandMatch(word,brand))return {...base,kind:'유지',reason:'등록된 사이트명과 일치하는 표현입니다. 브랜드 식별에 필요한 반복일 수 있습니다.',action:'첫 소개·제목·연락처에는 정확한 브랜드명을 유지하세요. 같은 문단에서 주어만 되풀이한 부분은 문장을 합칠지 검토하세요.',template:`${brand}은(는) [대상 고객]에게 [실제 제공 서비스]를 제공합니다.`,placement:'제목·첫 소개·문의 정보',check:'줄인 문장에서도 업체의 주체가 분명하고 공식 명칭이 유지되는가'};
  if(/않습니다|없습니다|불가|금지|제외|않는/.test(word))return {...base,kind:'문맥 검토',reason:'부정·제외 조건이 들어 있어 기계적으로 삭제하면 의미가 달라질 수 있습니다.',action:'같은 제한을 여러 번 설명하는 경우 조건 안내에 모으되, 부정 표현과 예외 조건을 보존하세요.',template:'[해당 조건]에서는 [제공하지 않는 항목]이 적용되지 않습니다. [예외 조건]을 확인해 주세요.',placement:'이용 조건·예외 안내',check:'부정·예외·제공 범위가 원문과 같은가'};
  if(word.split(/\s+/).every(isGenericKeyword))return {...base,kind:'정리',reason:'핵심 서비스명보다 문장 연결·수식에 쓰이는 일반 표현입니다.',action:'문장마다 반복되는 수식·연결어를 덜고 하나의 문장에 하나의 정보를 남기세요. 이 표현을 제목에 추가할 필요는 없습니다.',template:'[핵심 주체]가 [구체적인 행동]을 수행합니다. [필요한 조건]을 이어서 설명합니다.',placement:'본문의 반복 문장',check:'삭제 전후의 의미와 필요한 조건이 유지되는가'};
  if(/^(?:운영|진행|제공|지원|관리|분석|서비스|범위)(?:을|를|이|가|는|은|의|에서)?$/.test(word))return {...base,kind:'구체화',reason:'여러 업무를 가리킬 수 있는 넓은 표현입니다. 고객이 실제로 받는 내용을 함께 설명할 여지가 있습니다.',action:`“${word}”의 반복을 [무엇을]·[어떻게]·[어떤 산출물로 확인하는지]로 풀어 쓰세요. 제공하지 않는 업무는 추가하지 마세요.`,template:concreteTemplates[word.replace(/(?:에서|을|를|이|가|는|은|의)$/,'')]||concreteTemplates.서비스,placement:'서비스 설명·업무 범위',check:'대상·업무·제공 범위를 실제 계약·운영 내용으로 확인했는가'};
  if(!isPhrase&&(!item.inTitle||!item.inMetaDescription))return {...base,kind:'배치',reason:`저장된 집계에서 제목 ${item.inTitle?'포함':'미포함'}, 설명 ${item.inMetaDescription?'포함':'미포함'}입니다. 사업의 핵심 표현인지 먼저 판단해야 합니다.`,action:'핵심 서비스나 고객의 실제 질문과 맞으면 대표 제목·설명에 자연스럽게 연결하세요. 조사 붙은 형태와 띄어쓰기를 정리하고 무관하면 본문에만 두세요.',template:`[핵심 서비스명] | [확인된 브랜드명]\n[대상 고객]을 위한 [제공 범위]와 [다음 행동]을 안내합니다.`,placement:'대표 제목·메타 설명 후보',check:'동의어나 조사 차이로 이미 포함된 표현은 아닌지, 페이지 주제와 실제로 맞는지 확인했는가'};
  return {...base,kind:isPhrase?'정리':'문맥 검토',reason:isPhrase?'같은 연속어구가 집계됐습니다. 집계용 토큰 연결이므로 원문 문장·반복 위치를 먼저 확인해야 합니다.':'반복 빈도만으로 수정 필요 여부를 정할 수 없습니다.',action:isPhrase?'원문에서 같은 주장을 되풀이하는 문장만 합치세요. 이후 문단에는 사례·절차·조건 등 서로 다른 정보를 배치하세요.':'페이지 주제를 설명하는 핵심 용어는 유지하고, 문장별 정보가 겹치는 부분만 구체화하세요.',template:'[서비스 핵심 설명] → [확인된 근거·사례] → [진행 절차·조건] → [다음 행동]',placement:'본문·FAQ',check:'단순 단어 치환을 넘어 각 문단이 새로운 정보를 제공하는가'};
}
export function buildKeywordRewrites(frequency:KeywordFrequency|null|undefined,meta?:MarketingReport['meta']) {
  const make=(items:KeywordFreqItem[],phrase:boolean)=>items.filter(k=>k.keyword.trim()&&Number.isFinite(k.count)&&k.count>=2).map(k=>keywordRewrite(k,meta,phrase));
  return {singles:make(frequency?.singles||[],false),phrases:make(frequency?.phrases||[],true)};
}
export function rewriteClipboard(plan:KeywordRewrite){return `검토 표현: ${plan.item.keyword} (${plan.item.count}회)\n수정 방향: ${plan.kind}\n현재 근거: ${plan.source||'문장 원문 미저장 · 빈도 집계만 확인'}\nTO-BE: ${plan.action}\n작성 틀 (사실 확인 후 사용): ${plan.template}\n권장 위치: ${plan.placement}\n완료 확인: ${plan.check}`;}
