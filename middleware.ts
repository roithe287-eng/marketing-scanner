import {NextRequest,NextResponse} from 'next/server';
import {isRestrictedAiCollector} from './lib/security/aiCollection';
/** Authorization lives in each route handler / page DAL. No path, filename,
 * middleware header or referrer can bypass those checks. */
export function middleware(req:NextRequest) {
  // Keep the collection policy readable even to denied crawlers. This check
  // never grants access; existing route-level authorization still applies.
  if(req.nextUrl.pathname!=='/robots.txt' && isRestrictedAiCollector(req.headers.get('user-agent'))) {
    return new NextResponse('자동화된 AI 원문 수집이 제한되어 있습니다. Automated AI content collection is restricted.', {
      status:403,
      headers:{
        'Content-Type':'text/plain; charset=utf-8',
        'Cache-Control':'private, no-store, max-age=0',
        'CDN-Cache-Control':'no-store',
        'Vercel-CDN-Cache-Control':'no-store',
        'X-Robots-Tag':'noindex, nofollow, noarchive',
        'Vary':'User-Agent',
      },
    });
  }
  const res=NextResponse.next();
  if(/^\/(api(?:\/|$)|r(?:\/|$)|account(?:\/|$)|manage(?:\/|$)|setup(?:\/|$)|activate(?:\/|$)|login(?:\/|$))/.test(req.nextUrl.pathname)) {
    res.headers.set('Cache-Control','private, no-store, max-age=0');
    res.headers.set('CDN-Cache-Control','no-store');
    res.headers.set('Vercel-CDN-Cache-Control','no-store');
    res.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  }
  return res;
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
