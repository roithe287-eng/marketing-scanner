"use client";

import { useState } from "react";

export type LeadFormData = {
  name: string;
  company: string;
  contact: string;
  email: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void> | void;
  title?: string;
  description?: string;
  submitLabel?: string;
};

export default function LeadModal({
  open,
  onClose,
  onSubmit,
  title = "PDF 리포트를 받아보세요",
  description = "더 정확한 진단과 상담 안내를 위해 간단한 정보를 입력해주세요.",
  submitLabel = "PDF 다운로드 받기",
}: Props) {
  const [form, setForm] = useState<LeadFormData>({
    name: "",
    company: "",
    contact: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) {
      alert("이름과 연락처는 필수입니다.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black tracking-wider text-jm-red">
              JINJJA MARKETING
            </p>
            <h3 className="mt-2 text-xl font-black leading-snug">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-jm-gray hover:text-jm-black"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <p className="mt-3 text-sm text-jm-gray leading-6">{description}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs font-bold text-jm-gray">
              이름 <span className="text-jm-red">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-jm-border px-4 py-3 outline-none focus:border-jm-black"
              placeholder="홍길동"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-jm-gray">회사명</label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="mt-1 w-full rounded-xl border border-jm-border px-4 py-3 outline-none focus:border-jm-black"
              placeholder="(선택)"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-jm-gray">
              연락처 <span className="text-jm-red">*</span>
            </label>
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="mt-1 w-full rounded-xl border border-jm-border px-4 py-3 outline-none focus:border-jm-black"
              placeholder="010-0000-0000"
              required
              inputMode="tel"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-jm-gray">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-jm-border px-4 py-3 outline-none focus:border-jm-black"
              placeholder="(선택) you@example.com"
            />
          </div>

          <p className="pt-2 text-[11px] leading-5 text-jm-gray">
            입력하신 정보는 진짜마케팅의 상담/리포트 발송 외 다른 목적으로
            사용되지 않습니다.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="jm-button w-full mt-2"
          >
            {loading ? "처리 중..." : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
