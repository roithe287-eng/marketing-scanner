export type Features = {
  competitor: boolean;
  deepdive: boolean;
  reports: boolean;
};
export type Account = {
  id: string;
  email: string;
  name: string;
  company: string;
  role: "admin" | "customer";
  status: "approved" | "suspended";
  expiresAt: number;
  monthlyLimit: number;
  features: Features;
  passwordHash: string | null;
  version: number;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
};
export type Principal =
  | { kind: "internal" }
  | { kind: "account"; account: Account };
export type UsageAction = "analyze" | "competitor" | "deepdive";
export type Inquiry = {
  id: string;
  name: string;
  company: string;
  email: string;
  contact: string;
  url: string;
  message: string;
  consent: true;
  createdAt: number;
  status: "pending" | "approved" | "closed";
  accountId?: string;
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
  return safe;
}
export function canReadOwner(
  ownerId: string | undefined,
  principal: Principal,
) {
  return (
    principal.kind === "internal" ||
    principal.account.role === "admin" ||
    (!!ownerId &&
      principal.account.id === ownerId &&
      principal.account.features.reports)
  );
}
