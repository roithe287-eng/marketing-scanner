import type {CheerioAPI} from 'cheerio';
import type {Element} from 'domhandler';

const chromeToken=/(?:^|[\s_-])(?:gnb|lnb|snb|nav|navigation|navbar|menu|header|footer|breadcrumb|cookie|popup|modal)(?:$|[\s_-])/i;

/** Container semantics, excluding document-wide CMS state classes such as mobile-nav-on. */
export function pageRegion($:CheerioAPI,element:Element):'head'|'header'|'nav'|'main'|'footer'|'body'{
  for(const node of [element,...$(element).parents().toArray()]){
    const el=node as Element,tag=el.tagName,item=$(el);
    if(!tag||tag==='body'||tag==='html')continue;
    const role=item.attr('role');
    if(role==='navigation'||tag==='nav')return 'nav';
    if(tag==='head'||tag==='header'||tag==='footer')return tag;
    const token=`${item.attr('id')||''} ${item.attr('class')||''}`;
    if(chromeToken.test(token))return /(?:^|[\s_-])footer(?:$|[\s_-])/i.test(token)?'footer':/(?:^|[\s_-])header(?:$|[\s_-])/i.test(token)?'header':'nav';
    if(tag==='main'||role==='main')return 'main';
  }
  return 'body';
}
