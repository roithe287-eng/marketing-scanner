import { timingSafeEqual } from "node:crypto";
import { digest } from "../security/request";

export type RemoteRecoveryWindow = { grantHash: string; expiresAt: number };

// This release grants one external recovery. Only the digest is stored in source.
const release: RemoteRecoveryWindow = {
  grantHash: "f23af79f944b93c3cf137a89d5bda5a4d903c64bf68e47c486e32042a5cdb2ff",
  expiresAt: 1795607056839,
};

export function remoteRecoveryWindow() {
  if (process.env.VERCEL_ENV !== "production" || Date.now() >= release.expiresAt ||
      !/^[a-f0-9]{64}$/.test(release.grantHash)) return null;
  return release;
}

export function authorizeRemoteRecovery(value: string) {
  const window = remoteRecoveryWindow();
  if (!window || !timingSafeEqual(Buffer.from(window.grantHash, "hex"), Buffer.from(digest(value), "hex"))) {
    return null;
  }
  return window;
}
