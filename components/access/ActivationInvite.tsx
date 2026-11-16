"use client";

import { useEffect, useRef, useState } from 'react';
import type { AccountPlan } from '@/lib/saas/types';
import { koreanTime } from './activityFormat';

export type Activation = { link: string; expiresAt: number; plan: AccountPlan };

export default function ActivationInvite({ link, expiresAt, plan }: Activation) {
  const section = useRef<HTMLElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const guideInput = useRef<HTMLTextAreaElement>(null);
  const [feedback, setFeedback] = useState('');
  const expiry = koreanTime(expiresAt);
  const guide = plan === 'monthly' ? '' : [
    '안녕하세요. 진짜마케팅입니다.',
    `마케팅스캐너 1회 진단권(${plan === 'single-pdf' ? 'PDF 포함' : 'PDF 미포함'})을 발급해 드렸습니다.`,
    '',
    '계정 활성화 링크',
    link,
    `활성화 기한은 ${expiry}까지입니다. (한국시간)`,
    '',
    '• 링크에서 비밀번호를 설정해 주세요. 발급 후 최대 48시간 동안 한 번만 사용할 수 있고, 여러 기기에서 동시에 열어도 활성화는 한 번만 완료됩니다. 링크를 재발급하면 이전 링크와 로그인 세션은 무효화됩니다.',
    '',
    '• 발급받은 계정으로 종합 진단 1회를 이용할 수 있습니다. 종합 진단이 완료됐을 때만 1회가 차감됩니다. IP나 브라우저를 바꾸거나 월이 넘어가도 사용 횟수는 초기화되지 않습니다.',
    '',
    plan === 'single-pdf'
      ? '• 완료한 결과는 ‘내 계정’에 최대 7일간 자동 보관됩니다. 발급받은 계정으로 로그인하면 이용 기간 내에 같은 결과의 PDF를 다시 받을 수 있습니다. PDF 다운로드는 PDF 포함 이용권에서 제공됩니다.'
      : '• 완료된 진단 결과는 화면에서 확인할 수 있습니다. 이 이용권에는 PDF 다운로드가 포함되지 않습니다.',
  ].join('\n');

  useEffect(() => { section.current?.focus(); }, []);

  async function copy(withGuide: boolean) {
    try {
      await navigator.clipboard.writeText(withGuide ? guide : link);
      setFeedback(withGuide ? '링크와 이용 안내를 복사했습니다.' : '활성화 링크를 복사했습니다.');
    } catch {
      const field = withGuide ? guideInput.current : linkInput.current;
      field?.focus();
      field?.select();
      setFeedback(withGuide ? '선택된 안내문을 직접 복사해 주세요.' : '선택된 링크를 직접 복사해 주세요.');
    }
  }

  return <section ref={section} tabIndex={-1} className="access-invite" aria-labelledby="activation-invite-title">
    <h2 id="activation-invite-title">활성화 링크가 준비되었습니다</h2>
    <p>본인 확인을 마친 고객에게 전달해 주세요. {expiry}까지 한 번 사용할 수 있습니다. 재발급 시 이전 링크와 로그인 세션은 무효화됩니다.</p>
    <label>
      고객 전달용 링크
      <input ref={linkInput} readOnly value={link} onFocus={e => e.currentTarget.select()}/>
    </label>
    <div className="access-invite-actions">
      {guide && <button type="button" className="jm-button" onClick={() => void copy(true)}>링크와 이용 안내 복사</button>}
      <button type="button" className="access-secondary" onClick={() => void copy(false)}>링크 복사</button>
    </div>
    {guide && <label>
      고객 전달용 이용 안내
      <textarea ref={guideInput} rows={8} readOnly value={guide}/>
    </label>}
    <p role="status" className={feedback ? 'access-invite-feedback' : 'sr-only'}>{feedback}</p>
  </section>;
}
