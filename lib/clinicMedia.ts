import type {CheerioAPI} from 'cheerio';
import type {ClinicMedia} from './clinicPlaceInsights';

/** Count public HTML references only. No image, video, thumbnail or patient asset is fetched. */
export function captureClinicMedia($:CheerioAPI):ClinicMedia {
  const body=$('body').clone();
  body.find('nav,header,footer,aside,script,style,template,noscript,form,[hidden],[aria-hidden="true"],[data-private],[class*="patient"],[class*="review"],[class*="before-after"],[class*="testimonial"],[id*="patient"],[id*="review"]').remove();
  body.find('[style]').each((_,el)=>{if(/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test($(el).attr('style')||''))$(el).remove();});
  const subjects=new Set<string>();
  const images=new Set<string>(),described=new Set<string>(),videos=new Set<string>();
  body.find('img').slice(0,500).each((_,el)=>{
    const n=$(el),src=n.attr('data-src')||n.attr('data-original')||n.attr('src')||n.attr('srcset')||'';
    const alt=(n.attr('alt')||'').trim();
    if(!src||/^(?:data|blob|javascript):/i.test(src)||/로고|아이콘|(?:^|[\/_-])(?:logo|icon|pixel|spacer)(?:[\/_.-]|$)/i.test(alt+' '+src)
      ||['width','height'].some(k=>/^[0-2](?:px)?$/.test(n.attr(k)||'')))return;
    if(!images.has(src) && images.size>=200)return;
    images.add(src);
    if(!alt)return;
    described.add(src);
    for(const [subject,pattern] of [['외관·입구',/외관|입구|건물/],['진료 공간',/대기실|진료실|내부|공간|로비/],['의료진',/원장|의료진|담당의/],['장비',/장비|기기|촬영실/],['위치·주차',/주차|약도|오시는\s*길/]] as const) {
      if(pattern.test(alt))subjects.add(subject);
    }
  });
  body.find('video,iframe[src]').slice(0,150).each((_,el)=>{
    const n=$(el),src=n.attr('src')||n.find('source[src]').first().attr('src')||'';
    if(!src||videos.size>=100)return;
    if(el.tagName==='video')videos.add(src);
    else {
      try {const u=new URL(src,'https://relative.invalid');if(/^(?:www\.)?(?:youtube(?:-nocookie)?\.com|player\.vimeo\.com|tv\.naver\.com)$/.test(u.hostname)&&/\/(?:embed|video)\//.test(u.pathname))videos.add(u.href);}catch{/* Non-media frame. */}
    }
  });
  return {images:images.size,described:described.size,videos:videos.size,subjects:[...subjects]};
}
