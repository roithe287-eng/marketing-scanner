import type {CheerioAPI} from 'cheerio';

/** Read the same bounded JSON-LD on submitted URLs and comparison candidates. */
export function readWebsiteSchema($:CheerioAPI){
  const jsonLdSchemas:Record<string,unknown>[]=[];
  let jsonLdErrors=0;
  function collect(value:unknown,depth=0):void{
    if(depth>20||jsonLdSchemas.length>=2000||!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(child=>collect(child,depth+1));return;}
    const node=value as Record<string,unknown>;
    if(node['@type'])jsonLdSchemas.push(node);
    Object.values(node).forEach(child=>collect(child,depth+1));
  }
  $('script[type="application/ld+json"]').each((_,element)=>{
    const raw=$(element).contents().text().trim();
    if(!raw)return;
    try{
      const value:unknown=JSON.parse(raw);
      if(!value||typeof value!=='object'){jsonLdErrors++;return;}
      collect(value);
    }catch{jsonLdErrors++;}
  });
  const schemaTypes=jsonLdSchemas.flatMap(node=>Array.isArray(node['@type'])?node['@type']:[node['@type']])
    .filter((value):value is string=>typeof value==='string');
  return {jsonLdSchemas,schemaTypes,jsonLdErrors};
}
