import React from 'react';
import ReadingDisclosure from '../ReadingDisclosure';
import DiagnosisIcon from './DiagnosisIcon';
import {reportReadingPoints} from '@/lib/conciseReport';
import SourceSketch from './PageModelGraphic';
export {SourceSketch};

/** Source quotations stay verbatim. A short sentence or authored summary can lead longer commentary. */
export function CompactText({text,summary,verbatim=false,className='',label}:{text:string;summary?:string;verbatim?:boolean;className?:string;label?:string}){
  if(!text)return null;
  const long=text.trim().length>220 || text.trim().split(/\n+/).length>4;
  if(verbatim || !long)return <p className={`report-compact-text ${className}`}>{verbatim?text:summary||text}</p>;

  const points=reportReadingPoints(text);
  const first=points[0]||text.trim();
  const preview=summary || (first.length<=110?first:Array.from(first).slice(0,100).join('').trimEnd()+'…');
  return <ReadingDisclosure title={label||'상세 설명'} preview={preview} className={`prose-reading ${className}`}>
    {points.length>1
      ? <ul className="report-compact-text report-reading-points">{points.map((point,i)=><li key={i}>{point}</li>)}</ul>
      : <p className="report-compact-text">{text}</p>}
  </ReadingDisclosure>;
}

type Axis=React.ComponentProps<typeof DiagnosisIcon>['axis'];
type Step={title:string;detail:string;icon:Axis};
const guides={
  questions:[{title:'질문 선택',detail:'고객이 궁금한 내용',icon:'seo'},{title:'페이지 연결',detail:'인용 URL 또는 검토 후보',icon:'conversionFlow'},{title:'답변 보강',detail:'사실·조건·근거 정리',icon:'copywriting'}],
  brand:[{title:'브랜드 확인',detail:'업체명·서비스 대조',icon:'firstView'},{title:'조건 확인',detail:'가격·범위·최신 정보',icon:'trust'},{title:'출처 확인',detail:'원문 업체와 일치 여부',icon:'seo'}],
  geo:[{title:'페이지 준비',detail:'읽을 수 있는 정보',icon:'copywriting'},{title:'브랜드 언급',detail:'답변에 이름이 있는지',icon:'firstView'},{title:'자사 출처',detail:'우리 URL이 연결됐는지',icon:'seo'}],
  editing:[{title:'현재 내용',detail:'수집한 문구 확인',icon:'seo'},{title:'수정 제안',detail:'핵심·조건·행동 정리',icon:'copywriting'},{title:'완료 확인',detail:'적용 뒤 결과 대조',icon:'cta'}],
  keywords:[{title:'대표 표현',detail:'실제 사업과 맞는 단어',icon:'seo'},{title:'문장 구성',detail:'제목·설명에 자연스럽게',icon:'copywriting'},{title:'본문 대조',detail:'제공하는 내용과 일치',icon:'trust'}],
  execution:[{title:'담당 배정',detail:'권한·업무 범위 확인',icon:'firstView'},{title:'페이지 수정',detail:'근거와 수정안 전달',icon:'copywriting'},{title:'결과 확인',detail:'같은 URL로 재진단',icon:'cta'}],
  sources:[{title:'질문 확인',detail:'어떤 답변에 쓰였는지',icon:'seo'},{title:'원문 대조',detail:'우리 주제와 관련 있는지',icon:'trust'},{title:'구성 참고',detail:'유용한 배치만 활용',icon:'copywriting'}],
} satisfies Record<string,Step[]>;
export function VisualSteps({kind,items,label}:{kind?:keyof typeof guides;items?:Step[];label?:string}){
 const steps=items||(kind?guides[kind]:[]);
 return <ol className="report-visual-steps" aria-label={label||'확인 순서'}>{steps.map((step,i)=><li key={step.title}><span className="report-visual-icon"><DiagnosisIcon axis={step.icon}/></span><span className="report-visual-step-number">{String(i+1).padStart(2,'0')}</span><strong>{step.title}</strong><small>{step.detail}</small></li>)}</ol>;
}

const sourceCards=[
 {type:'cost',title:'비용 구성',detail:'기본 비용 / 추가 비용'},
 {type:'faq',title:'질문과 답변',detail:'질문 바로 아래 답변'},
 {type:'proof',title:'사례와 증빙',detail:'주장 옆에 확인 근거'},
 {type:'action',title:'문의 동선',detail:'설명 다음에 문의 버튼'},
] as const;
export function SourceReferenceDiagram({details}:{details:React.ReactNode}){
 return <aside className="report-source-reference" aria-label="외부 출처 활용 안내">
  <div className="report-source-rule"><div data-kind="use"><span>참고할 것</span><strong>정보를 보여주는 구성</strong></div><div data-kind="skip"><span>업종이 다르면 비교 제외</span><strong>상품·가격·경쟁력</strong></div></div>
  <div className="report-source-patterns">{sourceCards.map(c=><div key={c.type}><SourceSketch type={c.type}/><strong>{c.title}</strong><small>{c.detail}</small></div>)}</div>
  <VisualSteps kind="sources" label="외부 출처 검토 순서"/>
  <p className="report-visual-caution">경쟁사·추천 사례로 검증한 목록이 아닙니다. 무관한 출처는 건너뛰세요.</p>
  <details open className="report-text-detail"><summary>활용 기준 자세히 보기</summary><div>{details}</div></details>
 </aside>;
}
