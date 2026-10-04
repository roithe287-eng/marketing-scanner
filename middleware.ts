import {NextRequest,NextResponse} from 'next/server';
/** Authorization lives in each route handler / page DAL. No path, filename,
 * middleware header or referrer can bypass those checks. */
export function middleware(req:NextRequest) {
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
