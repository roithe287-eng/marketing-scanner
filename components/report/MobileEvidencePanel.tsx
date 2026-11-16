'use client';
import {useRef,useState} from 'react';
import {requestJson} from '@/lib/client/request';
import {MobileEvidenceSchema,mobileThresholds,mobileNames,readLighthouse,labActions,type MobileEvidence} from '@/lib/mobileEvidence';
import {RoleBox} from './ReportRole';

const range=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:3});
const hrefProps={target:'_blank',rel:'noopener noreferrer'};
const metricIds=['lcp','inp','cls'] as const;
export default function MobileEvidencePanel({target}:{target:string}){
  const [data,setData]=useState<MobileEvidence|null>(null),[working,setWorking]=useState(false),[error,setError]=useState('');
  const inputRevision=useRef(0);
  async function measure(){
    if(working)return;
    ++inputRevision.current;
    setError('');setWorking(true);
    try{
      const response=await requestJson('/api/search-evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'mobile',target})},28000);
      setData(MobileEvidenceSchema.parse(response));
    }catch(error){setError(error instanceof Error?error.message:'모바일 측정값을 불러오지 못했습니다.');}
    finally{setWorking(false);}
  }
  async function importLab(file:File|undefined){
    if(!file||working)return;
    setError('');
    const revision=++inputRevision.current;
    try{
      if(file.size>5_000_000)throw Error('5MB 이하의 Lighthouse JSON을 선택해 주세요.');
      const lab=readLighthouse(JSON.parse(await file.text()),target,'Lighthouse JSON');
      if(revision!==inputRevision.current)return;
      if(!lab)throw Error('이 페이지를 모바일 조건으로 검사한 Lighthouse JSON을 선택해 주세요.');
      setData(current=>({...current,lab,notice:undefined}));
    }catch(error){if(revision===inputRevision.current)setError(error instanceof Error?error.message:'실험실 측정 파일을 읽지 못했습니다.');}
  }
  const psi=new URL('https://pagespeed.web.dev/');
  psi.searchParams.set('url',target);
  return <section className="report-card search-evidence-card">
    <details><summary><strong>모바일 속도 실측</strong></summary>
      <div className="search-evidence-stack">
        <p className="report-note">공개 페이지 URL을 Google PageSpeed Insights로 보내 모바일 속도를 확인합니다.</p>
        <div className="naver-sources">
          <button type="button" className="report-secondary-button" disabled={working} onClick={()=>void measure()}>{working?'모바일 측정 중…':data?'같은 페이지 다시 측정':'모바일 측정'}</button>
          <a href={psi.href} {...hrefProps}>PageSpeed Insights에서 보기 ↗</a>
        </div>
        {error&&<p className="access-error" role="alert">{error}</p>}
        {data?.notice&&<p className="report-note" role="status">{data.notice}</p>}
        {data&&<div>
          <h4>모바일 실사용 데이터</h4>
          <p className="report-note">{data.field?[
            data.field.source,data.field.scope==='url'?'해당 URL':'사이트 대표 주소 집계',data.field.address,data.field.period?data.field.period+' · 실사용자 75백분위':'실사용자 75백분위',
          ].join(' · '):'이 URL의 실사용 데이터 미확인'}</p>
          <div className="search-metrics">{metricIds.map(id=>{
            const value=data.field?.values[id],[good,poor]=mobileThresholds[id];
            const state=value===undefined?'unknown':value<=good?'good':value<=poor?'watch':'bad';
            return <div key={id} className="search-metric" data-state={state}>
              <span>{id.toUpperCase()} · {mobileNames[id]}</span>
              <strong>{value===undefined?'미확인':range(id==='lcp'?value/1000:value)+(id==='lcp'?'초':id==='inp'?'ms':'')}</strong>
              {value!==undefined&&<><div className="search-meter" aria-hidden="true"><i style={{width:Math.min(100,value/poor*100)+'%'}}/></div><small>{state==='good'?'양호':state==='watch'?'개선 필요':'기준 초과'}</small></>}
            </div>;
          })}</div>
        </div>}
        {data?.lab&&<div>
          <h4>모바일 실험실 결과 · {data.lab.source}</h4>
          <div className="naver-counts">
            <div><span>LCP · 주요 콘텐츠 표시</span><strong>{data.lab.lcp===undefined?'미확인':range(data.lab.lcp/1000)+'초'}</strong></div>
            <div><span>TBT · 메인 스레드 차단 시간</span><strong>{data.lab.tbt===undefined?'미확인':range(data.lab.tbt)+'ms'}</strong></div>
            <div><span>CLS · 화면 이동</span><strong>{data.lab.cls===undefined?'미확인':range(data.lab.cls)}</strong></div>
          </div>
          {data.lab.issues.length>0&&<RoleBox role="proposal" label="관측된 개선 작업"><ol className="search-evidence-steps">{data.lab.issues.flatMap(issue=>{
            const action=labActions[issue.id];
            return action?[<li key={issue.id}><strong>{action.label}{issue.detail?' · '+issue.detail:''}</strong><p>{action.steps}</p></li>]:[];
          })}</ol></RoleBox>}
          <p className="report-note">TBT는 실험실 지표입니다. 변경을 게시한 후 같은 모바일 조건으로 측정하고 실사용 변화는 집계 기간이 지난 뒤 비교하세요.</p>
        </div>}
        <label className="search-evidence-file">Chrome Lighthouse 모바일 JSON 가져오기<input type="file" accept=".json,application/json" disabled={working} onChange={e=>{void importLab(e.target.files?.[0]);e.currentTarget.value='';}}/></label>
        <details><summary>모바일 JSON 내보내는 방법</summary><ol className="search-evidence-steps">
          <li>Chrome에서 해당 페이지를 열고 개발자 도구의 Lighthouse 탭을 엽니다.</li>
          <li>모바일을 선택해 측정한 뒤 보고서 메뉴에서 JSON으로 저장합니다.</li>
          <li>위 파일 선택에 JSON을 넣으면 수치와 개선 작업을 확인할 수 있습니다.</li>
        </ol><a href="https://developer.chrome.com/docs/lighthouse/overview" {...hrefProps}>Chrome 공식 사용법 ↗</a></details>
      </div>
    </details>
  </section>;
}
