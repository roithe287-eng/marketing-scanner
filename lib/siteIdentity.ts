/** Domain sharing does not imply shared ownership. Unknown platform tenants stay unverified. */
export function siteIdentity(value: string): {
    host: string;
    tenant: string | null;
    shared: boolean;
} | null {
    try {
        const u = new URL(value);
        if (!/^https?:$/.test(u.protocol) || u.username || u.password)
            return null;
        const host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
        const platform = host.replace(/^m\./, '');
        if(platform==='place.naver.com'||platform.endsWith('.place.naver.com')){
            const id=u.pathname.match(/^\/(?:restaurant\/|place\/|hospital\/|hairshop\/|beauty\/|cafe\/|accommodation\/)?(\d+)(?:\/|$)/)?.[1];
            return {host:'place.naver.com',tenant:id||null,shared:true};
        }
        if(platform==='cafe.naver.com'&&u.pathname.startsWith('/ca-fe/')){
            return {host:platform,tenant:u.pathname.match(/^\/ca-fe\/cafes\/(\d+)(?:\/|$)/)?.[1]||null,shared:true};
        }
        const shared = ['blog.naver.com', 'cafe.naver.com', 'smartstore.naver.com', 'brand.naver.com'].includes(platform);
        if (!shared)
            return { host, tenant: null, shared: false };
        const first = u.pathname.split('/').filter(Boolean)[0] || '';
        const tenant = (platform === 'blog.naver.com' ? u.searchParams.get('blogId') : platform === 'cafe.naver.com' ? u.searchParams.get('clubid') : null) || (/^[\w-]+$/.test(first) && !['postview', 'article', 'ca-fe'].includes(first.toLowerCase()) ? first : '');
        return { host: platform, tenant: tenant ? tenant.toLowerCase() : null, shared: true };
    }
    catch {
        return null;
    }
}
export function sameSite(source: string, target: string): boolean {
    const a = siteIdentity(source), b = siteIdentity(target);
    if (!a || !b)
        return false;
    if (a.shared || b.shared)
        return a.host === b.host && !!a.tenant && a.tenant === b.tenant;
    return a.host === b.host || a.host.endsWith('.' + b.host);
}
