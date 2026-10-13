import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inquirySchema } from '../lib/saas/validation';
import { inquiryServiceLabels } from '../lib/inquiry';

const base = { name: '문의 테스트', email: 'inquiry@example.com', contact: 'test only', consent: true };

test('inquiries accept zero, one or both services without making advertising mandatory', () => {
  assert.deepEqual(inquirySchema.parse(base).services, []);
  for (const services of [[], ['naver-ads'], ['meta-ads'], ['naver-ads', 'meta-ads']]) {
    assert.deepEqual(inquirySchema.parse({ ...base, services }).services, services);
  }
  assert.deepEqual(inquirySchema.parse({ ...base, services: ['naver-ads', 'naver-ads'] }).services, ['naver-ads']);
});

test('inquiries reject unknown, oversized and malformed selections', () => {
  for (const services of ['naver-ads', null, ['unknown'], ['naver-ads', 'meta-ads', 'naver-ads'], [{}]]) {
    assert.equal(inquirySchema.safeParse({ ...base, services }).success, false);
  }
  assert.equal(inquirySchema.safeParse({ ...base, services: ['naver-ads'], consent: false }).success, false);
});

test('pricing selections are validated separately from editable message text', () => {
  for (const planId of ['agency', 'single', 'single-pdf', 'monthly-15', 'monthly-30', 'monthly-100', 'volume']) {
    const parsed = inquirySchema.parse({ ...base, planId, message: '' });
    assert.equal(parsed.planId, planId);
    assert.equal(parsed.message, '');
  }
  for (const planId of ['unknown', '', ['agency']]) {
    assert.equal(inquirySchema.safeParse({ ...base, planId }).success, false);
  }
});

test('admin labels preserve both channels and support historical inquiries without selections', () => {
  assert.deepEqual(inquiryServiceLabels(['meta-ads', 'naver-ads']), ['네이버 광고대행 문의', '메타 광고대행 문의']);
  assert.deepEqual(inquiryServiceLabels(undefined), []);
  assert.deepEqual(inquiryServiceLabels([]), []);
});
