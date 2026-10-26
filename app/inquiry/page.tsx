import AccessShell from "@/components/access/AccessShell";
import InquiryForm from "@/components/access/InquiryForm";
import InquiryPreview from "@/components/access/InquiryPreview";
import { inquiryPlanLabel } from '@/lib/pricing';
import './inquiry.css';

export const metadata = { title: '마케팅스캐너 이용 문의 | 진단 결과 미리보기' };
export default async function InquiryPage({ searchParams }: { searchParams: Promise<{ plan?: string | string[] }> }) {
  const { plan } = await searchParams;
  const selectedPlan = inquiryPlanLabel(typeof plan === 'string' ? plan : undefined);
  return (
    <AccessShell
      eyebrow="START WITH YOUR GOAL"
      title="광고비를 늘리기 전, 바꿀 곳부터 찾으세요."
      description="검색·AI 노출부터 경쟁사 비교, 바로 바꿀 문장까지. 어떤 결과를 받는지 먼저 확인하고, 우리 사이트의 진단을 문의하세요."
      wide
      className="inquiry-page"
    >
      <div className="inquiry-layout">
        <InquiryPreview />
        <div id="inquiry-request" className="inquiry-request" tabIndex={-1}>
          <InquiryForm selectedPlan={selectedPlan} selectedPlanId={selectedPlan && typeof plan === 'string' ? plan : undefined} />
        </div>
      </div>
    </AccessShell>
  );
}
