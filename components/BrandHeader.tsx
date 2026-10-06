type Props = {
  /** true면 좌측 로고가 메인('/')으로 이동하지 않음 (공유 페이지용) */
  lockHome?: boolean;
  /** 첫 화면 상단에 채널톡 문의 버튼 표시 */
  showInquiry?: boolean;
};

export default function BrandHeader({ lockHome = false, showInquiry = false }: Props) {
  const brandUrl =
    process.env.NEXT_PUBLIC_BRAND_URL || "https://prorealmkt.com";

  // 좌측 로고 + 칩 영역 공통 콘텐츠
  const logoContent = (
    <div className="flex items-center gap-2 min-w-0">
      {/* 진짜마케팅 로고 (정사각형 PNG) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-jinjja.png"
        alt="진짜마케팅"
        width={400}
        height={400}
        className="h-9 md:h-10 w-9 md:w-10 shrink-0 object-contain"
      />
      <span className="scanner-brand-name">마케팅스캐너<small>by 진짜마케팅</small></span>
    </div>
  );

  return (
    <header
      className="scanner-brand-header border-b border-jm-border bg-white sticky top-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className={`jm-container scanner-brand-bar flex h-16 md:h-20 items-center justify-between gap-3${showInquiry ? " scanner-brand-bar--with-inquiry" : ""}`}>
        {lockHome ? (
          // 공유 페이지: 메인으로 이동 불가
          <div className="cursor-default select-none">{logoContent}</div>
        ) : (
          <a href="/" className="cursor-pointer">
            {logoContent}
          </a>
        )}
        <nav className="scanner-brand-actions" aria-label="진짜마케팅 안내">
          <a
            href={brandUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center bg-jm-black text-white rounded-full font-bold whitespace-nowrap text-xs md:text-base px-3 md:px-5 py-2 md:py-3.5 hover:bg-jm-charcoal transition"
          >
            진짜마케팅 바로가기
          </a>
          {showInquiry && (
            <a
              href="https://qz86j.channel.io/home"
              target="_blank"
              rel="noopener noreferrer"
              className="scanner-inquiry-link shrink-0 inline-flex items-center justify-center rounded-full font-bold whitespace-nowrap transition"
              aria-label="1:1 마케팅 문의 (채널톡, 새 창)"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-3 3V11.5A7.5 7.5 0 0 1 9.5 4h3a7.5 7.5 0 0 1 7.5 7.5Z" />
                <path d="M7 10h8M7 14h5" />
              </svg>
              1:1 마케팅 문의
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
