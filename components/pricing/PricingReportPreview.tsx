import type { ReactNode } from 'react';
import DiagnosisRadarGraphic from '@/components/DiagnosisRadarGraphic';
import styles from './PricingReportPreview.module.css';

// Public, illustrative excerpts only. Never import customer reports or share URLs here.
const exampleScores = [78, 48, 64, 84, 52, 61, 88, 70] as const;

function Excerpt({ number, category, title, description, included, children }: {
  number: string; category: string; title: string; description: string; included: string; children: ReactNode;
}) {
  return (
    <article className={styles.row} aria-labelledby={`pricing-preview-${number}`}>
      <div className={styles.copy}>
        <p className={styles.chapter}><span>{number}</span>{category}</p>
        <h3 id={`pricing-preview-${number}`}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <p className={styles.included}><span aria-hidden="true">↳</span>{included}</p>
      </div>
      <div className={styles.sheet}>
        <div className={styles.sheetHead}><span><i aria-hidden="true" />{category}</span><span>결과 일부 · 예시</span></div>
        <div className={styles.sheetBody}>{children}</div>
      </div>
    </article>
  );
}

export default function PricingReportPreview() {
  return (
    <section id="report-preview" className={styles.preview} aria-labelledby="pricing-preview-heading">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>REPORT PREVIEW</p><h2 id="pricing-preview-heading">어떤 결과를 받는지,<br />먼저 살펴보세요.</h2></div>
        <p>실제 보고서 구성에서 골라 담은 7가지 맛보기.<br />업체명과 URL 없이, 예시 데이터로 보여드립니다.</p>
      </header>

      <Excerpt number="01" category="종합 진단" title="강점과 약점을 한눈에." description="첫 화면부터 검색까지 8개 영역을 살펴보고, 먼저 손볼 곳을 짚어드립니다." included="영역별 점수 · 진단 근거 · 개선 방향">
        <div className={styles.radarLayout}>
          <div className={styles.radar}><p className={styles.smallLabel}>커머스 페이지 진단 예시</p><DiagnosisRadarGraphic scores={exampleScores} selected={1} example /></div>
          <div className={styles.scoreFocus}>
            <div className={styles.scorePair}><div><span>강점 · 모바일</span><strong>88<small>점</small></strong></div><div><span>보완 · CTA</span><strong>48<small>점</small></strong></div></div>
            <div className={styles.callout}><span className={styles.smallLabel}>우선 확인할 내용</span><h4>버튼을 누른 뒤,<br />무엇이 시작되나요?</h4><p>‘자세히 보기’를 구체적인 행동으로 바꾸고, 다음 화면과 연결해 보세요.</p></div>
          </div>
        </div>
      </Excerpt>

      <Excerpt number="02" category="핵심 요약" title="무엇부터 바꿀지 명확하게." description="홈페이지 내용과 고객의 궁금증을 연결해, 우선 보완할 정보부터 정리합니다." included="홈페이지 내용 · 고객 질문 · 우선 할 일">
        <div className={styles.finding}><span className={styles.tag}>핵심 발견</span><h4>서비스 소개는 있지만,<br />신청 후 과정이 보이지 않습니다.</h4></div>
        <div className={styles.questionFlow}>
          <div><span className={styles.smallLabel}>고객이 궁금한 것</span><p>“신청하면 어떤 순서로 진행되나요?”</p></div>
          <span className={styles.flowArrow} aria-hidden="true">→</span>
          <div><span className={styles.smallLabel}>페이지에 보완할 정보</span><p>진행 단계와 준비 사항을<br /><strong>문의 버튼 가까이에 안내</strong></p></div>
        </div>
        <p className={styles.sheetFoot}>수정 위치 예시 <span>서비스 소개 하단 → 문의 버튼 위</span></p>
      </Excerpt>

      <Excerpt number="03" category="AI 답변·출처" title="AI는 우리를 어떻게 읽을까요?" description="브랜드 이름이 나오는지, 우리 페이지가 출처로 쓰이는지 나누어 살펴봅니다." included="질문별 답변 관측 · 출처 확인 · 콘텐츠 보강">
        <div className={styles.aiQuestion}><span className={styles.smallLabel}>고객 질문 예시</span><p>“우리 업종에 맞는 서비스를 추천해 줘.”</p></div>
        <div className={styles.observations}>
          <div><span className={styles.observationIcon} aria-hidden="true">“ ”</span><h4>브랜드 언급</h4><p>답변에 이름이 등장</p><span className={styles.statusGood}>언급 예시</span></div>
          <div><span className={styles.observationIcon} aria-hidden="true">↗</span><h4>자사 출처 인용</h4><p>우리 페이지가 근거로 연결</p><span className={styles.statusCheck}>미확인 예시</span></div>
        </div>
        <div className={styles.actionNote}><span>다음 행동</span><p>질문에 바로 답하는 설명과 확인 가능한 근거를 페이지에 보강합니다.</p></div>
      </Excerpt>

      <Excerpt number="04" category="검색·페이지 점검" title="검색에 필요한 기본도 꼼꼼하게." description="네이버·구글 검색을 위한 페이지 구조와 제목, 설명, 기술 항목을 점검합니다." included="검색 점검 · 원문 근거 · 플랫폼별 적용 안내">
        <div className={styles.auditHead}><h4>페이지 점검 항목</h4><span>일부 항목 예시</span></div>
        <ul className={styles.auditList}>
          <li><span className={styles.statusGood}>확인</span><div><strong>대표 제목과 본문 주제</strong><p>페이지가 다루는 핵심 주제가 연결되어 있습니다.</p></div></li>
          <li><span className={styles.statusCheck}>보완</span><div><strong>검색 결과에 표시될 설명</strong><p>추상적인 소개를 대상·제공 범위가 담긴 문장으로 다듬습니다.</p></div></li>
          <li><span className={styles.statusNeutral}>별도 확인</span><div><strong>실제 검색 노출·색인 여부</strong><p>페이지 구성만으로 단정하지 않고 검색 도구에서 확인합니다.</p></div></li>
        </ul>
        <p className={styles.sheetFoot}>확인한 사실과 추가 점검이 필요한 부분을 구분합니다.</p>
      </Excerpt>

      <Excerpt number="05" category="문구 개선" title="지적에서 끝나지 않는 수정안." description="현재 문구와 개선 방향을 나란히 보여드리고, 어느 위치를 바꿀지도 안내합니다." included="AS-IS / TO-BE · 수정 위치 · 실행 방법">
        <div className={styles.rewrite}>
          <div className={styles.before}><span className={styles.smallLabel}>AS-IS · 현재 표현 예시</span><p>최고의 서비스로<br />성공을 함께합니다.</p><small>대상과 제공 범위가 모호함</small></div>
          <span className={styles.flowArrow} aria-hidden="true">→</span>
          <div className={styles.after}><span className={styles.smallLabel}>TO-BE · 사실을 채울 작성 틀</span><p><mark>[고객 유형]</mark>을 위한<br /><mark>[서비스 범위]</mark>를 제공합니다.</p><small>확인 가능한 사실로 구체화</small></div>
        </div>
        <div className={styles.location}><div className={styles.wireframe} aria-hidden="true"><i /><b /><i /><span /></div><div><span className={styles.smallLabel}>바꿀 위치까지 함께</span><strong>첫 화면 제목 아래 소개 문장</strong><p>문구를 바꾼 뒤 주요 버튼과 자연스럽게 이어지는지 확인하세요.</p></div></div>
      </Excerpt>

      <Excerpt number="06" category="비교 후보 분석" title="비교하면, 빠진 정보가 보입니다." description="같은 검색어에서 찾은 비교 후보와 메시지·선택 정보를 대조합니다." included="비교 지도 · 표현 차이 · 후보 페이지 근거">
        <div className={styles.comparisonWrap}>
          <table className={styles.comparison}>
            <caption>선택 정보 비교 예시</caption>
            <thead><tr><th scope="col">확인 항목</th><th scope="col">우리 페이지</th><th scope="col">비교 A</th><th scope="col">비교 B</th></tr></thead>
            <tbody><tr><th scope="row">서비스 범위</th><td>확인</td><td>확인</td><td>확인</td></tr><tr><th scope="row">진행 과정</th><td><span className={styles.tableGap}>보완</span></td><td>확인</td><td>확인</td></tr><tr><th scope="row">선택 근거</th><td><span className={styles.tableGap}>보완</span></td><td>확인</td><td>보완</td></tr></tbody>
          </table>
        </div>
        <div className={styles.actionNote}><span>찾은 기회</span><p>고객이 비교할 때 필요한 진행 과정과 확인 가능한 사례를 보강합니다.</p></div>
        <p className={styles.comparisonNote}>표는 구성 예시이며, 비교 후보와 정보 범위는 수집 결과에 따라 달라집니다.</p>
      </Excerpt>

      <Excerpt number="07" category="실행 과제" title="보고 나서, 바로 할 일이 남도록." description="확인한 문제를 담당 업무와 순서로 정리하고, 수정 후 확인할 지표까지 연결합니다." included="담당자별 작업 · 실행 일정 · 목표 지표">
        <ol className={styles.timeline}>
          <li><span className={styles.step}>1</span><div><p className={styles.smallLabel}>먼저 · 기획 / 카피</p><h4>첫 화면 문구 구체화</h4><p>누구에게 무엇을 제공하는지 한 문장으로.</p></div></li>
          <li><span className={styles.step}>2</span><div><p className={styles.smallLabel}>다음 · 디자인 / 개발</p><h4>문의 앞에 진행 과정 안내</h4><p>고객이 다음 단계를 이해하고 누를 수 있도록.</p></div></li>
          <li><span className={styles.step}>3</span><div><p className={styles.smallLabel}>적용 후 · 운영 / 마케팅</p><h4>버튼 클릭·문의 완료 확인</h4><p>실제 지표와 재진단으로 변화 확인.</p></div></li>
        </ol>
      </Excerpt>

    </section>
  );
}
