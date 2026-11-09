/** Declared training crawlers and user-initiated AI page fetchers.
 * Search crawlers (Yeti, Googlebot, Bingbot, OAI-SearchBot,
 * Claude-SearchBot, PerplexityBot) and advertising/link-preview bots are
 * intentionally not denied. A User-Agent is not proof of identity:
 * this policy reduces known collection, but is not authentication or DRM.
 */
export const RESTRICTED_AI_COLLECTORS = [
  'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User',
  'anthropic-ai', 'claude-web', 'Perplexity-User', 'CCBot',
  'Bytespider', 'cohere-ai', 'meta-externalagent', 'meta-externalfetch',
  'Amazonbot', 'AI2Bot', 'Diffbot',
] as const;

const collectorPattern = new RegExp(
  `(^|[^a-z0-9_-])(${RESTRICTED_AI_COLLECTORS.join('|')})(?=[^a-z0-9_-]|$)`,
  'i',
);

export function isRestrictedAiCollector(userAgent: string | null): boolean {
  return !!userAgent && collectorPattern.test(userAgent);
}

// These are robots.txt policy tokens, not separate HTTP User-Agents.
// Googlebot / Applebot remain available for their search functions.
export const AI_ROBOTS_POLICY_TOKENS = [
  ...RESTRICTED_AI_COLLECTORS, 'Google-Extended', 'Applebot-Extended',
];
