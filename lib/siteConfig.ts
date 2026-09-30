const DEFAULT_SITE_URL = "https://www.mktscanner.com";

/** An absolute origin, without a trailing slash, for shared-report metadata. */
export function getSiteUrl(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
    if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
  } catch {
    // A malformed optional setting must not break the shared report.
  }
  return DEFAULT_SITE_URL;
}

export function getScannerContactUrl(): string {
  const candidate = process.env.SCANNER_CONTACT_URL;
  if (candidate) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {
      // Fall back to the configured service origin.
    }
  }
  return getSiteUrl();
}
