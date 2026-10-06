import { clientIp, digest } from './request';

// Explicit owner-approved login-free network, separate from administrator networks.
// Store a digest so the public repository does not display the office address.
const DEFAULT_LOGIN_FREE_IP_HASHES = '0948f2e0be0aa713bb384a67a7b6743eb2b2251671cd612a308d51ded453019c';

export function isLoginFreeNetwork(headers: Headers, env: NodeJS.ProcessEnv = process.env) {
  const ip = clientIp(headers, env);
  if (!ip) return false;
  const allowed = (env.LOGIN_FREE_IP_HASHES ?? DEFAULT_LOGIN_FREE_IP_HASHES)
    .split(',').map(value => value.trim().toLowerCase()).filter(value => /^[a-f0-9]{64}$/.test(value));
  return allowed.includes(digest(ip));
}
