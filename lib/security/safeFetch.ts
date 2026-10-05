import {scopedSignal} from '../runtime/budget';
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { gunzipSync, inflateSync, brotliDecompressSync } from "node:zlib";
import ipaddr from "ipaddr.js";
import { AccessError } from "./request";
const MAX_BYTES = 4 * 1024 * 1024;
export function publicAddress(value: string) {
  try {
    const address = ipaddr.parse(value);
    if (address.range() !== "unicast") return false;
    if (address.kind() === "ipv6") {
      const ipv6 = address as ipaddr.IPv6;
      // Only native global unicast; exclude transition/translation and documentation nets.
      return (
        ipv6.match(ipaddr.parseCIDR("2000::/3")) &&
        !ipv6.match(ipaddr.parseCIDR("3fff::/20"))
      );
    }
    return true;
  } catch {
    return false;
  }
}
export function publicUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AccessError(400, "올바른 웹사이트 URL을 입력해 주세요.");
  }
  const host = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    input.length > 2048 ||
    !host ||
    (!isIP(host) &&
      (!host.includes(".") ||
        /\.(localhost|local|internal|test|invalid|onion)$/.test(host))) ||
    (isIP(host) && !publicAddress(host))
  )
    throw new AccessError(
      400,
      "공개된 HTTP 또는 HTTPS 웹사이트만 진단할 수 있습니다.",
    );
  return url;
}
export async function resolvePublic(
  url: URL,
  resolver: typeof lookup = lookup,
) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await resolver(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new AccessError(
      400,
      "접근할 수 없는 주소입니다. 공개 웹사이트 주소를 확인해 주세요.",
    );
  return addresses.find((a) => a.family === 4) || addresses[0];
}
// Resolve once, validate ALL answers, then pin that address in the actual socket lookup.
// This closes the DNS-rebinding gap between a preflight DNS check and a normal fetch.
async function pinnedRequest(
  url: URL,
  init: RequestInit,
  signal: AbortSignal,
): Promise<Response> {
  const target = await resolvePublic(url);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const headers = new Headers(init.headers);
    for (const name of [
      "authorization",
      "cookie",
      "host",
      "proxy-authorization",
    ])
      headers.delete(name);
    headers.set("accept-encoding", "identity");
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        headers: Object.fromEntries(headers),
        signal,
        agent: false,
        lookup: (_host, options, callback) => {
          if (options.all) (callback as Function)(null, [target]);
          else (callback as Function)(null, target.address, target.family);
        },
      },
      (res) => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(res.headers))
          if (value !== undefined)
            responseHeaders.set(
              name,
              Array.isArray(value) ? value.join(", ") : value,
            );
        const finish = (body: Uint8Array | null) => {
          const response = new Response(
            body ? new Uint8Array(body).buffer : null,
            { status: res.statusCode || 502, headers: responseHeaders },
          );
          Object.defineProperty(response, "url", { value: url.href });
          resolve(response);
        };
        if (
          res.statusCode &&
          ((res.statusCode >= 300 && res.statusCode < 400) ||
            [204, 205, 304].includes(res.statusCode))
        ) {
          res.destroy();
          finish(null);
          return;
        }
        if (Number(res.headers["content-length"] || 0) > MAX_BYTES) {
          res.destroy();
          reject(
            new AccessError(422, "페이지 용량이 진단 한도를 초과했습니다."),
          );
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            reject(
              new AccessError(422, "페이지 용량이 진단 한도를 초과했습니다."),
            );
          } else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            let body: Buffer = Buffer.concat(chunks);
            const options = { maxOutputLength: MAX_BYTES };
            const encoding = res.headers["content-encoding"];
            if (encoding === "gzip") body = gunzipSync(body, options);
            else if (encoding === "deflate") body = inflateSync(body, options);
            else if (encoding === "br")
              body = brotliDecompressSync(body, options);
            else if (encoding && encoding !== "identity")
              throw new Error("Unsupported encoding");
            responseHeaders.delete("content-encoding");
            responseHeaders.delete("content-length");
            finish(new Uint8Array(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}
export async function safeFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const deadline = AbortSignal.timeout(20_000);
  const signal = scopedSignal(init.signal,deadline)!;
  let url = publicUrl(String(input));
  for (let hop = 0; hop <= 6; hop++) {
    signal.throwIfAborted();
    const response = await pinnedRequest(url, init, signal);
    const location = response.headers.get("location");
    if (
      init.redirect === "manual" ||
      response.status < 300 ||
      response.status >= 400 ||
      !location
    )
      return response;
    if (init.redirect === "error")
      throw new AccessError(422, "리다이렉트된 페이지를 수집할 수 없습니다.");
    url = publicUrl(new URL(location, url).href);
  }
  throw new AccessError(
    422,
    "리다이렉트가 너무 많습니다. 최종 웹사이트 주소를 입력해 주세요.",
  );
}

/** Explicit transport boundary for extraction tests; never selected by request data. */
export const websiteHttp = { fetch: safeFetch };
