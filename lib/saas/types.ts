import type { InquiryService } from '../inquiry';

export type Features = {
  competitor: boolean;
  deepdive: boolean;
  reports: boolean;
};
export const ACCOUNT_PLANS = ['monthly', 'single', 'single-pdf'] as const;
export type AccountPlan = typeof ACCOUNT_PLANS[number];
export type Account = {
  id: string;
  email: string;
  name: string;
  company: string;
  role: "admin" | "customer";
  status: "approved" | "suspended";
  expiresAt: number;
  monthlyLimit: number;
  plan?: AccountPlan;
  features: Features;
  passwordHash: string | null;
  version: number;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
};
export type Grant = Pick<Account, 'expiresAt' | 'monthlyLimit' | 'features' | 'plan'>;
export type Principal =
  | { kind: "internal" }
  | { kind: "account"; account: Account };
export type UsageAction = "analyze" | "competitor" | "deepdive";
export type InquiryNotification = {
  status: 'pending' | 'sent' | 'failed' | 'unconfigured' | 'disabled';
  updatedAt: number;
  attempts: number;
  sentAt?: number;
};
export type Inquiry = {
  id: string;
  name: string;
  company: string;
  email: string;
  contact: string;
  url: string;
  message: string;
  services?: InquiryService[];
  planId?: string;
  consent: true;
  createdAt: number;
  status: "pending" | "approved" | "closed";
  accountId?: string;
  notification?: InquiryNotification;
};
export const DEFAULT_FEATURES: Features = {
  competitor: true,
  deepdive: true,
  reports: true,
};
export const MULTIPLIER: Record<UsageAction, number> = {
  analyze: 1,
  competitor: 1,
  deepdive: 5,
};
export function isActive(account: Account, now = Date.now()) {
  return (
    account.status === "approved" &&
    (account.role === "admin" || account.expiresAt > now)
  );
}
export function safeAccount(account: Account) {
  const { passwordHash: _, ...safe } = account;
  return { ...safe, plan: accountPlan(account), features: planFeatures(account) };
}
export function accountPlan(account?: Pick<Account, 'role' | 'plan'> & Partial<Pick<Account, 'monthlyLimit'>>): AccountPlan {
  if (!account || account.role === 'admin') return 'monthly';
  return account.plan ?? (account.monthlyLimit === 1 ? 'single-pdf' : 'monthly');
}
export function planFeatures(account: Pick<Account,'role'|'plan'|'features'> & Partial<Pick<Account,'monthlyLimit'>>): Features {
  const plan = accountPlan(account);
  return plan === 'monthly' ? account.features : { competitor:false, deepdive:false, reports:plan==='single-pdf' };
}
export function canShareReports(principal: Principal) {
  return principal.kind === 'internal' || (accountPlan(principal.account) === 'monthly' && principal.account.features.reports);
}
export function canReadOwner(
  ownerId: string | undefined,
  principal: Principal,
) {
  if (principal.kind === 'internal') return ownerId === 'internal';
  return (
    principal.account.role === "admin" ||
    (!!ownerId &&
      principal.account.id === ownerId &&
      planFeatures(principal.account).reports)
  );
}
