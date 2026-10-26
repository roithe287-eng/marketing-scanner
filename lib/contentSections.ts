import type {CheerioAPI} from 'cheerio';
import type {Element} from 'domhandler';

export type ContentSection={id:string;heading:string;text:string;truncated:boolean;url?:string};
const chromeToken=/(?:^|[\s_-])(?:gnb|lnb|snb|nav|navigation|navbar|menu|header|footer|breadcrumb|cookie|popup|modal)(?:$|[\s_-])/i;
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
/** Excerpts from the fetched public document, excluding menus, hidden widgets and forms. */
export function captureContentSections($:CheerioAPI,baseUrl?:string):ContentSection[]{
 const textContentIsControl=(item:ReturnType<CheerioAPI>)=>item.is('a')&&clean(item.text()).length<60;
 const candidates:{heading:string;text:string;order:number;score:number;url?:string}[]=[];
 const seen=new Set<string>();let heading='',order=0;
 $('body h1,body h2,body h3,body p,body li,body td,body blockquote,body dd,body dt,body a,body div,body section,body article').each((_,node)=>{
  const el=node as Element,item=$(el),tag=el.tagName;
  if(item.parents('script,style,noscript,template,nav,header,footer,form,aside,[role="navigation"],[hidden],[aria-hidden="true"]').length||item.is('[hidden],[aria-hidden="true"]'))return;
  const lineage=[el,...item.parents().toArray()];
  if(lineage.some(n=>{const a=$(n);return chromeToken.test(`${a.attr('id')||''} ${a.attr('class')||''}`)||/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(a.attr('style')||'');}))return;
  if(/^(?:div|section|article|li|td|dd|dt)$/.test(tag)&&item.find('p,div,section,article,li,table,dl,dd,dt,blockquote,h1,h2,h3').length)return;
  if(textContentIsControl(item))return;
  if(item.find('a,button,input,select,textarea').length&&clean(item.clone().find('a,button,input,select,textarea').remove().end().text()).length<24&&clean(item.text()).length<60)return;
  const text=clean(item.text());if(!text)return;
  if(/^h[1-3]$/.test(tag)){heading=text.slice(0,180);return;}
  if((text.length<24&&!(text.length>=8&&/\d/.test(text)&&/경력|전문|센터|네트워크|교육기관|연속|수상/.test(text)))||/^(?:개인정보|이용약관|copyright|사업자등록|통신판매업)/i.test(text))return;
  const key=text.normalize('NFKC').toLowerCase();if(seen.has(key))return;seen.add(key);
  const section=item.closest('section,article,[data-section],.section_wrap');
  const label=clean(section.find('h1,h2,h3').first().text())||heading;
  let url:string|undefined;const href=item.attr('href')||item.find('a[href]').first().attr('href');if(href&&baseUrl){try{const u=new URL(href,baseUrl);if(/^https?:$/.test(u.protocol)&&!u.username&&!u.password&&u.href.length<=4000)url=u.href;}catch{}}
  const main=!!item.closest('main,[role="main"]').length;
  candidates.push({heading:label.slice(0,180),text,url,order:order++,score:(main?8:0)+(text.length>=60?4:0)+(/[.!?]|합니다|입니다|제공|포함|신청|기간|대상|조건|과정|상담/.test(text)?3:0)});
 });
 // Prefer explanatory paragraphs, then restore reading order. No leading-menu bias.
 return candidates.sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,32).sort((a,b)=>a.order-b.order).map((c,i)=>({id:`content-${i+1}`,heading:c.heading,text:c.text.slice(0,1200),truncated:c.text.length>1200,...(c.url?{url:c.url}:{})}));
}
