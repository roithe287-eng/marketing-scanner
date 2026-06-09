/**
 * v23: 면책 문구 컴포넌트
 * - 공유 페이지 하단에 표시
 * - PDF 다운로드 시에도 포함 (data-hide-on-export 없음)
 * - 진짜마케팅의 책임 범위를 명확히 함
 */
export default function Disclaimer() {
  return (
    <div className="mt-10 rounded-2xl border border-jm-border bg-jm-light-gray p-5 md:p-6">
      <p className="text-xs font-black tracking-wider text-jm-gray">
        DISCLAIMER · 면책 안내
      </p>
      <div className="mt-3 space-y-2 text-xs md:text-sm text-jm-gray leading-6 md:leading-7">
        <p>
          · 본 진단은 AI 자동 분석 결과로 <strong>참고용</strong>으로 제공됩니다.
          정확한 마케팅 컨설팅은 진짜마케팅 전문 컨설턴트에게 문의해 주세요.
        </p>
        <p>
          · 분석은 공개된 사이트 정보(meta, 헤딩, 본문, og 태그 등) 기반으로
          수행되며, 경쟁사 비교는 검색 결과 상위 노출 사이트의{" "}
          <strong>사실 정보 인용</strong>을 중심으로 합니다.
        </p>
        <p>
          · 본 리포트는 진짜마케팅 내부 컨설팅 자료이며,{" "}
          <strong>광고주 외부 임의 공개·재배포를 권하지 않습니다</strong>. 외부
          공유로 인해 발생하는 사안에 대해 진짜마케팅은 책임지지 않습니다.
        </p>
        <p>
          · 분석 결과는 생성 시점의 사이트 상태를 반영하며, 실제 사이트 운영
          상황과 차이가 있을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
