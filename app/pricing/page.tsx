import type { Metadata } from 'next';
import Link from 'next/link';
import BrandHeader from '@/components/BrandHeader';
import PricingReportPreview from '@/components/pricing/PricingReportPreview';
import PricingJourney from '@/components/pricing/PricingJourney';
import { agencyBenefit, agencyPlanId, formatWon, planInquiryHref, scannerPlans } from '@/lib/pricing';

export const metadata: Metadata = {
  title: '이용요금 | 마케팅스캐너',
  description: '1회 진단 4,900원부터, 월 15회·30회·100회 이용권과 대량 이용 안내. 진짜마케팅 네이버/메타 광고 대행 시 마케팅스캐너 무료 제공.',
};

const questions = [
  { title: '진단 1회는 어떤 기준인가요?', answer: 'URL 1개를 새로 분석해 종합 진단 결과를 만드는 기준입니다. 같은 사이트라도 다른 페이지를 진단하거나, 수정 후 새로 진단하면 각각 1회에 해당합니다. 분석 실패는 진단 횟수에서 차감하지 않습니다.' },
  { title: 'PDF는 어떤 이용권에 포함되나요?', answer: 'PDF 포함 1회 진단권과 모든 월 이용권에 포함됩니다. PDF 미포함 1회 진단권은 화면에서 결과를 확인하는 상품입니다. 기존 보고서의 PDF 재다운로드는 새 진단 횟수에 포함되지 않습니다.' },
  { title: '월 이용권은 어떻게 시작하나요?', answer: '필요한 이용권으로 문의해 주세요. 이용 기간과 제공 횟수를 확인한 뒤 계정 승인 절차를 안내합니다. 문의 접수만으로 결제가 진행되지는 않습니다.' },
  { title: '광고 대행 고객은 무료로 이용할 수 있나요?', answer: '진짜마케팅에서 네이버/메타 광고를 대행하는 고객에게 마케팅스캐너를 무료로 제공합니다. 이용 계정과 제공 범위는 담당자를 통해 안내받으실 수 있습니다.' },
  { title: '보고서는 얼마나 보관되나요?', answer: '공유 보고서는 최초 보관 후 최대 7일간 열람할 수 있습니다. 이전 보고서와 비교한 결과는 두 보고서 중 더 이른 만료일을 따릅니다. PDF 포함 이용권은 보관 기간 내 필요한 보고서를 다운로드해 주세요.' },
];

export default function PricingPage() {
  const singlePlan = scannerPlans.find(plan => plan.id === 'single')!;
  return (
    <main className="scanner-pricing-page">
      <BrandHeader showInquiry />
      <div className="jm-container scanner-pricing-content">
        <Link className="scanner-pricing-back" href="/">← 마케팅스캐너로 돌아가기</Link>
        <div className="scanner-pricing-hero">
        <header className="scanner-pricing-intro">
          <p className="scanner-pricing-eyebrow">FROM URL TO ACTION</p>
          <h1>URL 하나로,<br /><em>고칠 순서까지.</em></h1>
          <p>우리 사이트의 문제부터 수정 방법까지.<br />분석이 끝나면, 다음 행동이 보입니다.</p>
          <div className="scanner-pricing-entry"><span>한 번만 이용해도</span><strong>{formatWon(singlePlan.price)}<small>원</small></strong><span>1회 진단 · 부가세 포함 · PDF 미포함</span></div>
          <div className="scanner-pricing-intro-links"><a href="#report-preview">결과 맛보기 <span aria-hidden="true">↓</span></a><a href="#pricing-plans">이용요금 바로 보기 <span aria-hidden="true">↓</span></a></div>
          <span>문의만으로 결제되지 않습니다.</span>
        </header>
        <PricingJourney />
        </div>

        <PricingReportPreview />

        <header id="pricing-plans" className="scanner-pricing-plan-heading">
          <div className="scanner-pricing-plan-bridge">
            <div><p className="scanner-pricing-eyebrow">ONE SCAN. NEXT ACTION.</p><h2>한 번의 진단,<br /><em>실행할 순서까지.</em></h2></div>
            <ol className="scanner-pricing-value-flow" aria-label="한 번의 진단으로 확인하는 세 가지">
              <li><span aria-hidden="true">01</span><strong>문제 확인</strong><p>어디를 고칠지</p></li>
              <li><span aria-hidden="true">02</span><strong>수정 방법</strong><p>어떻게 바꿀지</p></li>
              <li><span aria-hidden="true">03</span><strong>완료 기준</strong><p>무엇을 확인할지</p></li>
            </ol>
          </div>
          <div className="scanner-pricing-plan-meta"><p><strong>1회부터, 필요한 만큼.</strong> 이용권을 선택하세요.</p><span>모든 금액 부가세 포함 · PDF는 이용권별 확인</span></div>
          <p className="scanner-pricing-example-note">위 보고서는 구성 예시이며, 실제 결과는 업종과 수집 가능한 정보에 따라 달라집니다.</p>
        </header>

        <aside className="scanner-pricing-agency" aria-labelledby="agency-benefit-heading">
          <div><span className="scanner-pricing-agency-label">광고 대행 고객 혜택</span><h2 id="agency-benefit-heading">{agencyBenefit}</h2><p>진짜마케팅 광고 대행 고객에게 마케팅스캐너를 함께 제공합니다.</p></div>
          <Link href={planInquiryHref(agencyPlanId)}>광고 대행 문의 <span aria-hidden="true">↗</span></Link>
        </aside>

        <section className="scanner-pricing-grid" aria-label="마케팅스캐너 이용권 6종">
          {scannerPlans.map(plan => (
            <article key={plan.id} className={`scanner-plan${plan.id === 'monthly-15' ? ' scanner-plan--recommended' : ''}`} aria-labelledby={`plan-${plan.id}`}>
              <div className="scanner-plan-top"><h2 id={`plan-${plan.id}`}>{plan.name}</h2><span>{plan.label}</span></div>
              <p className="scanner-plan-description">{plan.description}</p>
              <p className="scanner-plan-price">{plan.price === null ? <strong>별도 협의</strong> : <><strong>{formatWon(plan.price)}</strong><span>원{plan.monthly ? ' / 월' : ''}</span></>}</p>
              <p className="scanner-plan-unit">{plan.price !== null && plan.count !== null ? `진단 1회당 ${Number.isInteger(plan.price / plan.count) ? '' : '약 '}${formatWon(Math.round(plan.price / plan.count))}원${plan.monthly ? ' · 제공 횟수 모두 사용 시' : ''}` : '진단 횟수와 이용 범위를 함께 정합니다.'}</p>
              <ul>
                <li><span aria-hidden="true">✓</span><span>{plan.count === null ? '필요한 진단 횟수 협의' : `${plan.monthly ? '매월 ' : ''}${plan.count}회 진단`}</span></li>
                <li><span aria-hidden="true">✓</span><span>마케팅·SEO·GEO 종합 진단</span></li>
                <li><span aria-hidden="true">✓</span><span>{plan.pdf === null ? 'PDF 제공 범위 협의' : plan.pdf ? 'PDF 다운로드 포함' : '화면에서 진단 결과 확인 · PDF 미포함'}</span></li>
              </ul>
              <Link className="scanner-plan-link" href={planInquiryHref(plan.id)} aria-label={`${plan.name}${plan.id.startsWith('single') ? ` ${plan.label}` : ''} 이용 문의`}>{plan.id === 'volume' ? '대량 이용 문의' : '이용 문의'}<span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </section>

        <section className="scanner-pricing-faq" aria-labelledby="pricing-faq-heading">
          <div><p className="scanner-pricing-eyebrow">GOOD TO KNOW</p><h2 id="pricing-faq-heading">이용 전에 확인해 주세요.</h2></div>
          <div>{questions.map(question => <details key={question.title}><summary>{question.title}<span aria-hidden="true">＋</span></summary><p>{question.answer}</p></details>)}</div>
        </section>
      </div>
      <footer className="access-footer"><Link href="/">마케팅스캐너</Link><Link href="/notice">진단 이용 안내</Link><Link href="/privacy">개인정보·이용 기록 안내</Link><span>진짜마케팅 · 마케팅스캐너</span></footer>
    </main>
  );
}
