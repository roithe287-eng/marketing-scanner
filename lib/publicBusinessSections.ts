import * as cheerio from 'cheerio';
import {pageRegion} from './pageRegions';

const clean=(s:string)=>s.replace(/\s+/gu,' ').trim();
/** Visible labels and values stay together; menus, reviews and entered form data are excluded. */
export function publicBusinessSections(html:string):{heading:string;text:string}[]{
  const $=cheerio.load(html),out:{heading:string;text:string}[]=[];
  $('script,style,noscript,template,form,input,textarea,select,nav,header,footer,aside,blockquote,[hidden],[aria-hidden="true"],[data-private],[class*="review" i],[id*="review" i],[class*="testimonial" i],[class*="comment" i]').remove();
  $('[style]').each((_,e)=>{if(/display\s*:\s*none|visibility\s*:\s*hidden/i.test($(e).attr('style')||''))$(e).remove();});
  $('br').replaceWith(' · ');
  let heading='';
  const add=(text:string,label=heading)=>{text=clean(text);if(text.length>=4&&text.length<=600&&!out.some(s=>s.text===text))out.push({heading:label.slice(0,180),text});};
  $('body h1,body h2,body h3,body h4,body p,body li,body tr,body dt,body dd,body address').slice(0,1200).each((_,e)=>{
    if(['nav','header','footer'].includes(pageRegion($,e)))return;
    const node=$(e),text=clean(node.text());
    if(/^h[1-4]$/.test(e.tagName)){heading=text.slice(0,180);return;}
    if(e.tagName==='tr'){
      const cells=node.children('th,td');if(!cells.filter('td').length)return;
      // Do not infer ambiguous rowspan/colspan relationships. Preserve a literal row instead.
      const headers=node.closest('table').find('thead tr').last().children('th,td').toArray().map(c=>clean($(c).text()));
      const simple=headers.length===cells.length&&!cells.toArray().some(c=>$(c).attr('rowspan')||$(c).attr('colspan'));
      const row=cells.toArray().map((c,i)=>`${simple&&headers[i]?headers[i]+': ':''}${clean($(c).text())}`).filter(Boolean).join(' · ');
      add(row,clean(node.closest('table').find('caption').text())||heading);return;
    }
    if(node.closest('table').length)return;
    if(e.tagName==='dt'){const dd=node.next('dd');if(dd.length)add(text+': '+dd.text());return;}
    if(e.tagName==='dd'&&node.prev('dt').length)return;
    if(node.find('p,li,dl,table').length||node.find('a').length&&node.clone().children('a').remove().end().text().trim().length<4)return;
    add(text);
  });
  return out;
}
