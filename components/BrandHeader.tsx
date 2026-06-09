type Props = {
  /** true면 좌측 로고가 메인('/')으로 이동하지 않음 (공유 페이지용) */
  lockHome?: boolean;
};

export default function BrandHeader({ lockHome = false }: Props) {
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
      <span className="ml-1 hidden md:inline-flex items-center rounded-full bg-jm-light-gray px-2.5 py-1 text-[10px] font-black tracking-wider text-jm-gray">
        MARKETING SCANNER
      </span>
    </div>
  );

  return (
    <header
      className="border-b border-jm-border bg-white sticky top-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="jm-container flex h-16 md:h-20 items-center justify-between gap-3">
        {lockHome ? (
          // 공유 페이지: 메인으로 이동 불가
          <div className="cursor-default select-none">{logoContent}</div>
        ) : (
          <a href="/" className="cursor-pointer">
            {logoContent}
          </a>
        )}
        <a
          href={brandUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center bg-jm-black text-white rounded-full font-bold whitespace-nowrap text-xs md:text-base px-3 md:px-5 py-2 md:py-3.5 hover:bg-jm-charcoal transition"
        >
          진짜마케팅 바로가기
        </a>
      </div>
    </header>
  );
}
