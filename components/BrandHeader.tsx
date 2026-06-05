export default function BrandHeader() {
  const brandUrl =
    process.env.NEXT_PUBLIC_BRAND_URL || "https://prorealmkt.com";

  return (
    <header className="border-b border-jm-border bg-white sticky top-0 z-30">
      <div className="jm-container flex h-20 items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <span className="inline-block h-9 w-9 rounded-full bg-jm-red" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold tracking-widest text-jm-gray">
              JINJJA MARKETING
            </span>
            <span className="text-lg font-black">마케팅스캐너</span>
          </div>
        </a>
        <a
          href={brandUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="jm-button-dark hidden sm:inline-flex"
        >
          진짜마케팅 바로가기
        </a>
      </div>
    </header>
  );
}
