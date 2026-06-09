export const metadata = {
  title: "접근 제한 | 진짜마케팅 마케팅스캐너",
  description: "공유 링크를 통해서만 접근 가능한 진단 리포트입니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RestrictedPage() {
  const brandUrl =
    process.env.NEXT_PUBLIC_BRAND_URL || "https://prorealmkt.com";

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <header
        className="border-b border-jm-border bg-white"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="jm-container flex h-16 md:h-20 items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 cursor-default select-none">
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

      <section className="flex-1 jm-container py-20 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-jm-light-gray">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="mt-6 text-xs font-black tracking-widest text-jm-red">
            PRIVATE ACCESS
          </p>
          <h1 className="mt-3 text-3xl md:text-5xl font-black leading-tight">
            공유 링크를 통해서만
            <br />
            접근 가능한 페이지입니다
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base md:text-lg leading-8 text-jm-gray">
            진짜마케팅 마케팅스캐너는 진짜마케팅 고객 및 파트너 전용 진단
            도구입니다. 진단 리포트를 받으셨다면 전달받은 공유 링크로 접속해
            주세요.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 max-w-xl mx-auto text-left">
            <div className="rounded-2xl border border-jm-border p-5">
              <p className="text-xs font-black tracking-wider text-jm-red">
                FOR CLIENT
              </p>
              <p className="mt-2 font-black">광고주·고객 안내</p>
              <p className="mt-2 text-sm text-jm-gray leading-6">
                전달받은 진단 리포트 링크(예:&nbsp;
                <span className="font-mono text-xs">/r/xxxxxx</span>)로 접속해
                주세요.
              </p>
            </div>
            <div className="rounded-2xl border border-jm-border p-5">
              <p className="text-xs font-black tracking-wider text-jm-red">
                FOR PARTNER
              </p>
              <p className="mt-2 font-black">진짜마케팅 컨설팅 문의</p>
              <p className="mt-2 text-sm text-jm-gray leading-6">
                마케팅스캐너 진단을 받고 싶으시다면 진짜마케팅에 문의해 주세요.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <a
              href={brandUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-jm-black px-8 py-4 text-base font-bold text-white hover:bg-jm-charcoal transition"
            >
              진짜마케팅 알아보기 →
            </a>
          </div>
        </div>
      </section>

      <footer
        className="border-t border-jm-border bg-jm-light-gray py-10"
        style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="jm-container flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-jm-gray">
          <div>
            © {new Date().getFullYear()} 진짜마케팅 · 마케팅스캐너
          </div>
          <div className="flex gap-4">
            <a
              href={brandUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-jm-black"
            >
              prorealmkt.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
