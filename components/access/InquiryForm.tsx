"use client";
import { useState } from "react";
import { inquiryServices } from '@/lib/inquiry';
export default function InquiryForm({ selectedPlan, selectedPlanId }: { selectedPlan?: string; selectedPlanId?: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          services: form.getAll('services'),
          planId: selectedPlanId,
          consent: form.get("consent") === "on",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "접수하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="access-success" role="status">
        <span aria-hidden="true">✓</span>
        <h2>이용 문의가 접수되었습니다</h2>
        <p>
          입력한 연락처로 선택하신 서비스와 문의 내용을 확인한 뒤 안내해 드립니다.
          마케팅스캐너 이용 승인이 필요한 경우 계정 활성화 링크를 함께 안내합니다.
        </p>
        <p>문의 접수만으로 진단이나 결제가 시작되지 않습니다.</p>
        <a href="/" className="jm-button">
          소개 화면으로
        </a>
      </div>
    );
  return (
    <form onSubmit={submit} className="access-form">
      {selectedPlan ? <p className="scanner-inquiry-plan"><span>선택한 이용 안내</span><strong>{selectedPlan}</strong><a href="/pricing">다른 이용권 보기</a></p> : null}
      <fieldset className="access-inquiry-services" aria-describedby="inquiry-services-help">
        <legend>광고대행도 궁금하신가요?</legend>
        <p id="inquiry-services-help">선택 사항이며, 두 항목을 함께 선택할 수 있습니다.</p>
        <div>
          {inquiryServices.map(service => (
            <label key={service.id}>
              <input type="checkbox" name="services" value={service.id} />
              <span>{service.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="access-form-grid">
        <label>
          이름 <b>필수</b>
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label>
          회사명
          <input name="company" maxLength={120} autoComplete="organization" />
        </label>
        <label>
          이메일 <b>필수</b>
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="계정 안내를 받을 이메일"
          />
        </label>
        <label>
          연락처 <b>필수</b>
          <input
            name="contact"
            required
            minLength={3}
            maxLength={80}
            autoComplete="tel"
            inputMode="tel"
          />
        </label>
      </div>
      <label>
        진단을 원하는 웹사이트
        <input
          name="url"
          maxLength={2048}
          inputMode="url"
          placeholder="https://example.com (선택)"
        />
      </label>
      <label>
        어떤 부분이 궁금하신가요?
        <textarea
          name="message"
          rows={4}
          maxLength={2000}
          defaultValue={selectedPlan ? `[이용 문의] ${selectedPlan}\n` : ''}
          placeholder="검색 노출, AI 답변에서의 브랜드 언급, 경쟁사 비교 등"
        />
      </label>
      <label className="access-honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="access-consent">
        <p>
          수집 항목: 이름·이메일·연락처 및 입력한 회사명·URL·문의 내용·선택한 이용권과 광고대행 항목. 이용
          목적: 상담, 이용 심사 및 계정 안내. 문의 내용은 접수일부터 90일간 보관
          후 자동 삭제합니다. 동의하지 않을 수 있으나 문의 접수는 제한됩니다.
        </p>
        <label>
          <input type="checkbox" name="consent" required /> 개인정보 수집·이용에
          동의합니다. <b>필수</b>
        </label>
      </div>
      {error && (
        <p role="alert" className="access-error">
          {error}
        </p>
      )}
      <button className="jm-button" disabled={busy}>
        {busy ? "접수 중…" : "마케팅스캐너 이용 문의"}
      </button>
      <p className="access-muted">
        승인된 계정이 있나요? <a href="/login">로그인하기</a>
      </p>
    </form>
  );
}
