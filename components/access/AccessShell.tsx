import BrandHeader from "@/components/BrandHeader";
export default function AccessShell({
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="access-page">
      <BrandHeader />
      <section className={`access-shell${wide ? " access-wide" : ""}`}>
        <a href="/" className="access-back">
          ← 마케팅스캐너
        </a>
        <p className="access-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="access-intro">{description}</p>
        {children}
      </section>
      <footer className="access-footer">
        <a href="/notice">진단 이용 안내</a>
        <a href="/privacy">개인정보·이용 기록 안내</a>
        <span>진짜마케팅 · 마케팅스캐너</span>
      </footer>
    </main>
  );
}
