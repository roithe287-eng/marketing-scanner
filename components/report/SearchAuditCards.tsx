import type {InternalLinkAudit,ProductOfferAudit} from '@/lib/searchEvidenceSchema';
import {RoleBox} from './ReportRole';
import ReportJumpLink from './ReportJumpLink';

export const linkStatus={broken:'연결 오류',redirect:'주소 이동',review:'확인 필요',ok:'응답 확인'};
export const offerStatus={match:'일치',mismatch:'값 불일치',missing:'마크업 미감지',review:'직접 확인'};
const hrefProps={target:'_blank',rel:'noopener noreferrer'};

export function InternalLinkAuditCard({audit}:{audit?:InternalLinkAudit}){
  if(!audit)return null;
  const broken=audit.rows.filter(r=>r.status==='broken').length;
  const moved=audit.rows.filter(r=>r.status==='redirect').length;
  return <details className="naver-check search-evidence-card" open={broken?true:undefined}>
    <summary><strong>내부 링크 실제 응답</strong><span className="naver-badge">{audit.checked}개 주소 표본</span><span aria-hidden="true">+</span></summary>
    <div className="naver-check-body">
      <div className="naver-counts">
        <div data-state="observed"><span>확인한 연결 주소</span><strong>{audit.checked}<small>개</small></strong></div>
        <div data-state="action"><span>오류가 있는 연결 위치</span><strong>{broken}<small>곳</small></strong></div>
        <div data-state="manual"><span>주소가 이동한 위치</span><strong>{moved}<small>곳</small></strong></div>
      </div>
      {audit.rows.length?<div className="site-diagnostics-scroll" tabIndex={0} role="region" aria-label="내부 링크 확인 결과">
        <table><caption className="sr-only">출발 페이지와 연결 주소의 응답</caption>
          <thead><tr><th scope="col">출발 페이지</th><th scope="col">클릭 문구</th><th scope="col">연결 주소·응답</th><th scope="col">수정할 일</th></tr></thead>
          <tbody>{audit.rows.map(row=><tr key={[row.source,row.target,row.anchor].join('|')}>
            <th scope="row"><a href={row.source} {...hrefProps}>{row.source} ↗</a></th>
            <td>{row.anchor||'문구 미감지'}</td>
            <td><strong>{linkStatus[row.status]}{row.http?' · HTTP '+row.http:''}</strong><small>{row.target}</small>
              {row.redirects.length>0&&<small>이동 {row.redirects.join(' → ')} → {row.final}</small>}
              {row.canonical&&<small>대표 주소 선언 · {row.canonical}</small>}
            </td>
            <td>{row.status==='broken'?'해당 링크의 주소를 실제 제공 중인 대체 페이지로 수정':
              row.status==='redirect'?'원문에서 의도한 최종 주소로 직접 연결':
              row.status==='review'?'실제 브라우저에서 접근 조건과 링크 동작 확인':
              row.canonical?'이동 목적과 대표 주소가 일치하는지 확인':'버튼 클릭 시 의도한 화면이 열리는지 확인'}</td>
          </tr>)}</tbody>
        </table>
      </div>:<p className="report-empty">확인할 수 있는 내부 링크 표본이 없습니다.</p>}
      <RoleBox role="verify" label="수정 후 확인"><p>출발 페이지에서 지목한 문구를 눌러 의도한 주소가 열리는지 확인한 뒤 같은 URL을 재진단하세요. 결과는 수집한 공개 HTML의 표본입니다.</p></RoleBox>
    </div>
  </details>;
}
export function ProductOfferAuditCard({audit,url}:{audit?:ProductOfferAudit;url:string}){
  if(!audit)return null;
  const mismatch=audit.fields.some(f=>f.state==='mismatch');
  return <details className="naver-check search-evidence-card" open={mismatch?true:undefined}>
    <summary><strong>상품 판매 정보와 구조화 데이터 대조</strong><span className="naver-badge">{mismatch?'값 불일치':'원문 표본'}</span><span aria-hidden="true">+</span></summary>
    <div className="naver-check-body">
      <p><a href={url} {...hrefProps}>{audit.product} 원문 열기 ↗</a></p>
      <div className="site-diagnostics-scroll" tabIndex={0} role="region" aria-label="상품 표시값과 구조화 데이터 대조"><table>
        <caption className="sr-only">실제 상품 HTML과 Offer 비교</caption>
        <thead><tr><th scope="col">비교 항목</th><th scope="col">상품 HTML 표시값</th><th scope="col">JSON-LD Offer</th><th scope="col">진단</th></tr></thead>
        <tbody>{audit.fields.map(field=><tr key={field.id}>
          <th scope="row">{field.label}</th><td>{field.page||'미확인'}</td><td>{field.markup||'미확인'}</td>
          <td><strong data-evidence-state={field.state}>{offerStatus[field.state]}</strong></td>
        </tr>)}</tbody>
      </table></div>
      <p className="report-note">단일 상품·판매 조건의 정적 원문 기준입니다. 옵션별 가격과 재고, 렌더링 후 값은 실제 페이지에서 확인합니다.</p>
      <RoleBox role="proposal" label="수정·검증 순서"><ol className="search-evidence-steps">
        <li>상품 관리에서 실제 판매가·통화·재고와 화면의 선택 옵션을 대조합니다.</li>
        <li>화면과 구조화 데이터를 출력하는 상품 설정·스킨·앱을 찾아 같은 판매 조건을 반영합니다.</li>
        <li>같은 상품 페이지를 재진단하고 Google 리치 결과 테스트에서 출력값을 확인합니다.</li>
      </ol></RoleBox>
      <div className="naver-sources"><ReportJumpLink id="report-view-search-platforms">플랫폼별 수정 위치</ReportJumpLink><a href="https://search.google.com/test/rich-results" {...hrefProps}>리치 결과 테스트 ↗</a></div>
    </div>
  </details>;
}
