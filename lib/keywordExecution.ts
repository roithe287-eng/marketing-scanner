import type {MarketingReport} from './reportSchema';
import {buildKeywordRewrites,type KeywordRewrite} from './keywordRewrite';
import {canonicalPage} from './geoComparison';
import {safeHttpUrl} from './citationMeasurement';

type Evidence={label:string;text:string;location:'title'|'description'|'heading'|'body'|'cta'|'legacy'};
export type RewriteField={token:string;label:string;hint:string};
export type RewriteGuide={url:string|null;site:string;coverage:string;evidence:Evidence[];location:string;steps:{title:string;detail:string}[];fields:RewriteField[];checks:string[]};
export type ExecutableRewrite=KeywordRewrite&{guide:RewriteGuide};
export type RewriteValues=Record<string,string>;

export function rewriteFields(template:string):RewriteField[] {
  return [...new Set(template.match(/\[[^\]\n]+\]/g)||[])].map(token=>{
    const label=token.slice(1,-1);
    const hint=/주기|기간|시간/.test(label)?'실제 운영 일정이나 계약에서 정한 시점·기간을 적으세요.':
      /고객|고객 상황/.test(label)?'실제로 서비스를 제공하는 고객과 해결하려는 상황을 좁혀 적으세요.':
      /브랜드|주체/.test(label)?'사업자·브랜드 안내에 쓰는 정확한 명칭을 확인해 적으세요.':
      /출처|근거|사례|확인 방식|지표/.test(label)?'담당자가 확인할 수 있는 자료·사례·지표 또는 전달 방식을 적으세요.':
      /제외|않는|미포함|조건|예외/.test(label)?'계약·정책의 제한과 별도 협의 조건을 확인하세요. 없다고 임의로 단정하지 마세요.':
      /행동|절차|단계/.test(label)?'고객이나 담당자가 실제로 수행하는 행동을 순서대로 적으세요.':
      /전달물|항목|범위|업무/.test(label)?'실제로 제공하는 업무나 결과물을 적고, 포함되지 않는 업무는 빼세요.':
      '현재 페이지와 실제 상품·서비스에서 확인한 내용으로 채우세요.';
    return {token,label,hint};
  });
}
export function fillRewriteTemplate(template:string,values:RewriteValues):string {
  return template.replace(/(\[[^\]\n]+\])((?:은\(는\)|으로|로|은|는|이|가|을|를|와|과)(?=\s|[.,!?]|$))?/g,(original,token:string,particle:string|undefined)=>{
    const value=values[token]?.trim();if(!value)return original;
    if(!particle)return value;
    const last=value.charCodeAt(value.length-1),hangul=last>=0xac00&&last<=0xd7a3;
    if(!hangul)return value+particle;
    const final=(last-0xac00)%28;
    const ending=particle==='으로'||particle==='로'?(final!==0&&final!==8?'으로':'로'):
      particle==='을'||particle==='를'?(final?'을':'를'):
      particle==='이'||particle==='가'?(final?'이':'가'):
      particle==='와'||particle==='과'?(final?'과':'와'):(final?'은':'는');
    return value+ending;
  });
}
function excerpt(text:string,word:string,max=300) {
  if(text.length<=max)return text;
  const at=text.toLowerCase().indexOf(word.toLowerCase()),start=Math.max(0,at-85),end=Math.min(text.length,start+max);
  return `${start?'…':''}${text.slice(start,end)}${end<text.length?'…':''}`;
}
function evidenceFor(report:MarketingReport,plan:KeywordRewrite):{evidence:Evidence[];coverage:string;url:string|null} {
  const page=report.pageEvidence,target=canonicalPage(report.url);
  const current=page&&target&&canonicalPage(page.requestedUrl)===target?page:null;
  const candidates:Evidence[]=current?[
    {label:'페이지 제목',text:current.title,location:'title'},
    {label:'검색 설명',text:current.description,location:'description'},
    ...current.h1.map((text,i)=>({label:`H1 제목 ${i+1}`,text,location:'heading' as const})),
    ...current.h2.map((text,i)=>({label:`H2 제목 ${i+1}`,text,location:'heading' as const})),
    ...current.ctaButtons.map((text,i)=>({label:`버튼 문구 ${i+1}`,text,location:'cta' as const})),
    {label:'본문 텍스트 발췌',text:current.bodyText,location:'body'},
  ]:[
    {label:'저장된 제목 · OG/페이지 제목 구분 없음',text:report.meta?.ogTitle||'',location:'legacy'},
    {label:'저장된 설명 · OG/검색 설명 구분 없음',text:report.meta?.ogDescription||'',location:'legacy'},
  ];
  let matches=candidates.filter(e=>e.text.toLowerCase().includes(plan.item.keyword.toLowerCase()));
  if(plan.kind==='구체화'||plan.kind==='정리')matches=[...matches.filter(e=>e.location==='heading'||e.location==='body'),...matches.filter(e=>e.location!=='heading'&&e.location!=='body')];
  return {evidence:matches.slice(0,3).map(e=>({...e,text:excerpt(e.text,plan.item.keyword)})),
    url:safeHttpUrl(current?.finalUrl||report.url),
    coverage:current?`진단 시점 ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(current.capturedAt))+' KST'}의 입력 페이지 발췌입니다. 본문 ${current.bodyText.length.toLocaleString('ko-KR')}자 범위${current.bodyTruncated?'(일부 저장)':''}이며 위치와 최신 내용은 원문에서 확인하세요.`:
      '이 보고서에는 본문·제목 계층별 원문이 저장되지 않았습니다. 저장된 제목·설명만 연결하며, 새 진단부터 본문 근거도 함께 저장합니다.'};
}
export function attachRewriteGuide(report:MarketingReport,plan:KeywordRewrite):ExecutableRewrite {
  const {evidence,coverage,url}=evidenceFor(report,plan),word=plan.item.keyword;
  const fields=rewriteFields(plan.template),first=evidence[0];
  const location=plan.kind==='배치'?'해당 URL의 페이지 제목·검색 설명 편집 항목':first?.location==='title'?'페이지 제목 편집 항목':first?.location==='description'?'검색 설명 편집 항목':first?.location==='heading'?'원문에서 일치하는 제목이 있는 콘텐츠 블록':first?.location==='cta'?'원문에서 일치하는 버튼':first?.location==='body'?'원문에서 해당 표현이 있는 본문 블록':`편집 화면의 ${plan.placement} · 실제 위치 확인 필요`;
  const root=word.replace(/(?:에서|을|를|이|가|는|은|의)$/,'');
  const how=plan.kind==='구체화'?`“${word}”만 다른 단어로 바꾸기보다 ${fields.map(f=>f.label).join(' → ')} 순서로 설명을 보완하세요. ${root==='범위'?'포함·제외·별도 협의 항목을 구분합니다.':'기존 문장과 같은 정보를 반복하면 두 문장을 합치고, 다른 정보라면 바로 다음 문장에 추가합니다.'}`:
    plan.kind==='배치'?`“${word}” 표현이 핵심 서비스인지 먼저 확인하세요. 맞으면 대표 제목에는 서비스와 브랜드를, 검색 설명에는 대상·범위·다음 행동을 배치합니다. 이미 같은 의미가 있으면 추가하지 않습니다.`:
    plan.kind==='정리'?`“${word}”가 들어간 문장을 앞뒤와 함께 읽고, 같은 주장을 하는 문장만 합치세요. 기능·절차·사례·조건이 서로 다르면 각각 남깁니다. 일괄 찾아 바꾸기는 하지 마세요.`:
    plan.kind==='유지'?`“${word}”로 브랜드를 식별하는 첫 소개·제목·문의 정보는 유지하세요. 같은 문단에서 브랜드명만 되풀이한 문장은 주체를 알 수 있는 범위에서 합칩니다.`:
    `“${word}”의 앞뒤에서 부정·예외·적용 범위를 먼저 확인하세요. 같은 내용만 한곳으로 모으고, 제한 조건이나 다른 의미의 문장은 그대로 보존합니다.`;
  const steps=[
    {title:'수정할 위치 찾기',detail:`${location}을 여세요. ${first?.location==='legacy'?'아래 제목·설명은 찾기 실마리이며 본문 위치를 뜻하지 않습니다. ':''}${first?`아래 “${first.label}”의 발췌와 현재 원문을 대조한 다음 `:''}페이지 또는 편집 화면에서 “${word}” 표현을 검색하세요.${!first?' 연속어구는 집계용 토큰 조합일 수 있으므로 구성 단어도 각각 검색하세요.':''}`},
    {title:'바꿀 범위 정하기',detail:how},
    {title:'사실로 문장 완성하기',detail:`${fields.map(f=>`[${f.label}]`).join(' · ')}를 실제 정보로 채우세요. 보고서 화면의 작성 도우미에서 문장을 미리 보고, 원문과 대조한 뒤 해당 편집 항목에 옮기세요.`},
    {title:'저장 후 다시 확인하기',detail:'미리보기에서 PC·모바일 줄바꿈과 문맥을 확인하고 게시하세요. 해당 URL을 다시 열어 반영 여부를 확인합니다. 제목·검색 설명은 관리 화면의 저장 값도 대조하세요. 새 진단은 수집 결과를 확인하는 용도이며 검색 노출·AI 인용 상승을 보장하지 않습니다.'},
  ];
  const checks=[plan.check,'대괄호와 임시 문구가 남지 않고, 가격·수치·부정·예외 조건이 원문 및 실제 운영 내용과 같은가','수정한 URL에서 제목·설명·본문·버튼의 의미가 서로 맞고, PC·모바일에서 읽히는가'];
  return {...plan,source:first?.text||null,sourceLabel:first?.label||'문장 원문 미저장',guide:{url,site:report.meta?.siteName||report.meta?.domain||report.url,coverage,evidence,location,steps,fields,checks}};
}
export function buildExecutableRewrites(report:MarketingReport) {
  const plans=buildKeywordRewrites(report.keywordFrequency,report.meta);
  return {singles:plans.singles.map(p=>attachRewriteGuide(report,p)),phrases:plans.phrases.map(p=>attachRewriteGuide(report,p))};
}
export function rewriteInstruction(plan:ExecutableRewrite,values:RewriteValues={}):string {
  const g=plan.guide,preview=fillRewriteTemplate(plan.template,values),remaining=rewriteFields(preview).length;
  return [`수정 작업 지시서 · ${g.site}`,`검토 URL: ${g.url||'유효한 URL 미확인'}`,`대상 표현: ${plan.item.keyword} · ${plan.kind}`,`권장 위치: ${g.location}`,`근거 범위: ${g.coverage}`,
    ...g.evidence.map(e=>`${e.label}: ${e.text}`),...(!g.evidence.length?['일치하는 문장 원문 없음 · 위치 확인 후 수정']:[]),
    ...g.steps.map((s,i)=>`${i+1}. ${s.title}\n${s.detail}`),
    `작성 ${Object.keys(values).length?'초안 (사용자 입력 · 사실 확인 후 사용)':'틀 (사실 확인 후 사용)'} · 남은 괄호 ${remaining}개\n${preview}`,
    '작성 도움말',...g.fields.map(f=>`${f.token}: ${f.hint}`),'완료 확인',...g.checks.map(c=>`□ ${c}`)].join('\n\n');
}
