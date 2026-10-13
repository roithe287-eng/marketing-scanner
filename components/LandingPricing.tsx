import Link from 'next/link';
import { agencyBenefit, formatWon, scannerPlans } from '@/lib/pricing';

export default function LandingPricing() {
  return (
    <section className="scanner-pricing-summary" aria-labelledby="scanner-pricing-heading">
      <div className="scanner-pricing-summary-copy">
        <h2 id="scanner-pricing-heading">이용요금</h2>
        <p>1회 <strong>{formatWon(scannerPlans[0].price)}원</strong>부터 <span aria-hidden="true">·</span> 월 <strong>{formatWon(scannerPlans[2].price)}원</strong>부터</p>
        <small>부가세 포함 · 월 이용권 PDF 포함</small>
      </div>
      <p className="scanner-pricing-benefit"><span aria-hidden="true">✓</span>{agencyBenefit}</p>
      <Link className="scanner-pricing-summary-link" href="/pricing">이용요금 자세히 <span aria-hidden="true">↗</span></Link>
    </section>
  );
}
