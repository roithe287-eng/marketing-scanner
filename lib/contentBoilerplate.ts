/** Embedded consent copy is evidence about data handling, not the site's service. */
export const CONSENT_WIDGET_SELECTOR='.form-group.privacy,.form-group.agreement,.form_privacy,.privacy_box,.privacy-wrap,.privacy_wrap,.agreement_wrap,[data-role="privacy-consent"]';

export function isConsentBoilerplate(text:string):boolean {
  return /회원\s*가입\s*의사\s*확인|회원제\s*서비스.{0,100}본인\s*(?:식별|확인)|(?:물품\s*배송|요금\s*결제\s*및\s*정산).{0,160}개인정보|개인정보.{0,120}(?:처리합니다|처리하고\s*있|보유합니다|처리\s*목적)|정보\s*주체.{0,100}(?:열람\s*요구|권리.{0,30}행사)|^제\s*\d+조\s*\(개인정보/.test(text.replace(/\s+/g,' '));
}
