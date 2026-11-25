import { randomUUID } from 'node:crypto';
import { emailSchema } from './validation';
import { db, key, decode, getAccount, INQUIRY_SECONDS } from './store';
import type { Inquiry, InquiryNotification } from './types';
import { inquiryServiceLabels } from '../inquiry';
import { inquiryPlanLabel } from '../pricing';
import { scannerEmailConfigured, sendScannerEmail } from './scannerEmail';

export function inquiryEmailSettings(ownerEmail: string) {
  const recipient = process.env.INQUIRY_NOTIFY_TO?.trim() || ownerEmail;
  const configured = scannerEmailConfigured() && emailSchema.safeParse(recipient).success;
  return { configured, enabled: configured && process.env.VERCEL_ENV === 'production', recipient };
}

export function inquiryEmailContent(inquiry: Inquiry) {
  const oneLine = (text: string) => text.replace(/[\r\n\t]+/g, ' ').trim();
  return {
    subject: `[마케팅스캐너] 새 이용 문의 · ${oneLine(inquiry.name).slice(0, 80)}`,
    text: [
      '새 이용 문의가 접수되었습니다.', '',
      `접수 시간: ${new Date(inquiry.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국시간)`,
      `이름: ${oneLine(inquiry.name)}`,
      `회사명: ${oneLine(inquiry.company) || '미입력'}`,
      `광고대행 상담 선택: ${inquiryServiceLabels(inquiry.services).join(' · ') || '미선택'}`,
      `이용 안내: ${inquiryPlanLabel(inquiry.planId) || '일반 이용 문의'}`, '',
      '연락처와 전체 문의 내용은 관리자 화면에서 확인해 주세요.',
      'https://www.mktscanner.com/manage#admin-inquiries', '',
      `문의 번호: ${inquiry.id}`,
    ].join('\n'),
  };
}

/** Server-only, fixed provider/destination. A mail failure never reverses an accepted inquiry. */
export async function notifyInquiry(id: string): Promise<InquiryNotification['status']> {
  const lockKey = key('inquiry-email-lock:' + id);
  const lockToken = randomUUID();
  let locked = false;
  try {
    const r = db();
    locked = !!await r.set(lockKey, lockToken, { nx: true, ex: 60 });
    if (!locked) return 'pending';
    const inquiry = decode<Inquiry>(await r.get(key('inquiry:' + id)));
    if (!inquiry) return 'failed';
    const remainingSeconds = Math.floor((inquiry.createdAt + INQUIRY_SECONDS * 1000 - Date.now()) / 1000);
    if (remainingSeconds < 1) return 'failed';
    const statusKey = key('inquiry-email:' + id);
    const previous = decode<InquiryNotification>(await r.get(statusKey));
    if (previous?.status === 'sent') return 'sent';
    let attempts = previous?.attempts || 0;
    const record = async (status: InquiryNotification['status']) => {
      const now = Date.now();
      await r.set(statusKey, { status, attempts, updatedAt: now, ...(status === 'sent' ? { sentAt: now } : {}) }, { ex: remainingSeconds });
      return status;
    };
    if (process.env.VERCEL_ENV !== 'production') return await record('disabled');
    const ownerId = await r.get<string>(key('admin-initialized'));
    const owner = ownerId ? await getAccount(ownerId) : null;
    if (!owner || owner.role !== 'admin' || owner.status !== 'approved') return await record('unconfigured');
    const settings = inquiryEmailSettings(owner.email);
    if (!settings.enabled) return await record('unconfigured');
    attempts += 1;
    await record('pending');
    const sent = await sendScannerEmail(settings.recipient, inquiryEmailContent(inquiry), `scanner-inquiry/${id}`);
    return await record(sent ? 'sent' : 'failed');
  } catch {
    console.warn('[inquiry-email] Notification could not be completed; inquiry remains saved.');
    return 'failed';
  } finally {
    if (locked) {
      try {
        await db().eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end;return 0", [lockKey], [lockToken]);
      } catch { /* Lock expires independently. */ }
    }
  }
}
