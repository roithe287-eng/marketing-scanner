import AccessShell from "@/components/access/AccessShell";
import InquiryForm from "@/components/access/InquiryForm";
export default function InquiryPage() {
  return (
    <AccessShell
      eyebrow="START WITH YOUR GOAL"
      title="우리 사이트의 다음 변화를 함께 정합니다"
      description="사이트와 고민을 알려 주세요. 필요한 진단 범위와 이용 조건을 안내해 드립니다."
    >
      <ol className="access-steps">
        <li>
          <b>01</b> 이용 문의
        </li>
        <li>
          <b>02</b> 상담·승인
        </li>
        <li>
          <b>03</b> 계정 활성화
        </li>
      </ol>
      <InquiryForm />
    </AccessShell>
  );
}
